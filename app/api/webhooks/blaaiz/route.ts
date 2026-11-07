import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyBlaaizSignature, executeStablecoinSwap, getSigningSecret } from '@/lib/blaaiz';
import { getContracts, mutateContract, addLog, claimWebhookEvent, releaseWebhookEvent } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let claimedEventId: string | null = null;
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-blaaiz-signature');
    const timestamp = req.headers.get('x-blaaiz-timestamp');

    // The signature is ALWAYS required. (There is no bypass header: the simulator signs its payloads.)
    let isValidSignature = false;
    try {
      isValidSignature = verifyBlaaizSignature(rawBody, signature, timestamp, getSigningSecret());
    } catch (e) {
      console.error('Webhook signing secret not configured:', e);
      return NextResponse.json({ error: 'Webhook receiver not configured' }, { status: 503 });
    }

    if (!isValidSignature) {
      await addLog({
        type: 'WEBHOOK_RECEIVED',
        endpoint: 'POST /api/webhooks/blaaiz',
        status: 'WARNING',
        title: 'Webhook Rejected: Invalid Cryptographic Signature',
        details: { signatureProvided: signature ? `${signature.substring(0, 8)}...` : null },
      });
      return NextResponse.json({ error: 'Invalid x-blaaiz-signature' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const eventType = payload.event || (payload.transaction_status ? 'collection.successful' : 'unknown');
    const merchantRef: unknown = payload.merchant_reference || payload.data?.merchant_reference;
    const amount = Number(payload.amount ?? payload.data?.amount);
    const currency = payload.currency ?? payload.data?.currency;

    // Idempotency: a replayed (or retried) event must not be processed twice.
    const eventId: string =
      typeof payload.event_id === 'string' && payload.event_id
        ? payload.event_id
        : `sha256_${crypto.createHash('sha256').update(rawBody).digest('hex')}`;
    if (!(await claimWebhookEvent(eventId))) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    claimedEventId = eventId;

    await addLog({
      type: 'WEBHOOK_RECEIVED',
      endpoint: 'POST /api/webhooks/blaaiz (collection_url)',
      status: 'SUCCESS',
      title: `Blaaiz Webhook: ${eventType}`,
      details: {
        event: eventType,
        event_id: eventId,
        merchant_reference: merchantRef,
        amount: Number.isFinite(amount) ? amount : undefined,
        currency,
        verified_signature: `${signature!.substring(0, 16)}...`,
      },
    });

    if (eventType !== 'collection.successful' && payload.transaction_status !== 'SUCCESSFUL') {
      return NextResponse.json({ received: true });
    }

    if (typeof merchantRef !== 'string' || !merchantRef) {
      return NextResponse.json({ received: true, ignored: 'missing merchant_reference' });
    }

    const refId = merchantRef.replace(/^ESCROW-/, '');
    const contract = (await getContracts()).find(
      (c) => c.virtualAccount?.merchantReference === merchantRef || c.id === refId
    );
    if (!contract) {
      return NextResponse.json({ received: true, ignored: 'unknown merchant_reference' });
    }

    // Atomically transition AWAITING_DEPOSIT -> ESCROWED_HEDGED (only once, only for a full deposit).
    const result: { outcome: 'escrowed' | 'already_funded' | 'rejected'; reason: string } = {
      outcome: 'escrowed',
      reason: '',
    };
    const updated = await mutateContract(contract.id, async (current) => {
      if (current.status !== 'AWAITING_DEPOSIT') {
        result.outcome = 'already_funded';
        return current;
      }
      if (!Number.isFinite(amount) || amount + 1e-9 < current.totalAmount || currency !== current.currency) {
        result.outcome = 'rejected';
        result.reason = `Expected ${current.totalAmount} ${current.currency}, received ${amount} ${currency}`;
        return current;
      }

      // Execute FX Stablecoin Devaluation Shield
      let hedgeDetails = current.hedgeDetails;
      if (current.autoHedgeStablecoin && !hedgeDetails) {
        hedgeDetails = await executeStablecoinSwap(current.totalAmount, current.currency);
        await addLog({
          type: 'SWAP_EXECUTED',
          endpoint: 'POST /api/external/swap',
          status: 'SUCCESS',
          title: `FX Shield Activated: Swapped to ${hedgeDetails.hedgedTo}`,
          details: {
            amount: hedgeDetails.amountHedged,
            currency: hedgeDetails.hedgedTo,
            txHash: hedgeDetails.txHash,
            valueProtectedNgn: `₦${hedgeDetails.valueSavedNgn.toLocaleString()}`,
          },
        });
      }

      return {
        ...current,
        status: 'ESCROWED_HEDGED',
        hedgeDetails,
        milestones: current.milestones.map((m) => ({
          ...m,
          status: m.status === 'PENDING_DEPOSIT' ? ('ESCROWED' as const) : m.status,
        })),
      };
    });

    if (result.outcome === 'rejected') {
      await addLog({
        type: 'WEBHOOK_RECEIVED',
        endpoint: 'POST /api/webhooks/blaaiz',
        status: 'WARNING',
        title: 'Deposit Not Escrowed: Amount/Currency Mismatch',
        details: { contractId: contract.id, reason: result.reason },
      });
      return NextResponse.json({ received: true, action: 'deposit_rejected', reason: result.reason });
    }

    if (result.outcome === 'already_funded') {
      return NextResponse.json({ received: true, action: 'already_funded', contractId: contract.id });
    }

    return NextResponse.json({
      received: true,
      action: 'contract_escrowed',
      contractId: contract.id,
      fxShieldActive: !!updated?.hedgeDetails,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Let the sender retry: release the idempotency claim since we did not finish.
    if (claimedEventId) await releaseWebhookEvent(claimedEventId).catch(() => undefined);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
