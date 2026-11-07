import { NextRequest, NextResponse } from 'next/server';
import { createSignedWebhookPayload } from '@/lib/blaaiz';
import { getContractById } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // The simulator signs payloads with the server's own secret, so it must only exist in simulation mode.
  if (process.env.BLAAIZ_SIMULATION_MODE === 'false') {
    return NextResponse.json({ error: 'Simulator is disabled when BLAAIZ_SIMULATION_MODE=false' }, { status: 404 });
  }
  try {
    const { contractId, amount } = await req.json();
    const contract = await getContractById(contractId);

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const merchantRef = contract.virtualAccount?.merchantReference || `ESCROW-${contract.id}`;
    const parsedAmount = Number(amount);
    const depositAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : contract.totalAmount;

    // Build the authentic Blaaiz webhook payload structure
    const webhookData = {
      event: 'collection.successful',
      transaction_status: 'SUCCESSFUL',
      merchant_reference: merchantRef,
      amount: depositAmount,
      currency: contract.currency,
      payment_method: contract.currency === 'USD' ? 'ach_push' : contract.currency === 'EUR' ? 'sepa_credit' : 'faster_payments',
      data: {
        id: `col_${Date.now()}`,
        virtual_account_id: contract.virtualAccount?.id || 'va_sim_01',
        amount: depositAmount,
        currency: contract.currency,
        merchant_reference: merchantRef,
        sender: {
          name: contract.clientName,
          bank_name: contract.virtualAccount?.bankName,
        },
      },
    };

    // Generate cryptographic HMAC-SHA256 signature
    const signed = createSignedWebhookPayload('collection.successful', webhookData);

    // Call the actual webhook endpoint internally
    const webhookUrl = `${req.nextUrl.origin}/api/webhooks/blaaiz`;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-blaaiz-signature': signed.signature,
        'x-blaaiz-timestamp': signed.timestamp,
        'User-Agent': 'Blaaiz-Webhook-Delivery/1.0',
      },
      body: signed.rawBody,
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      signature: signed.signature,
      timestamp: signed.timestamp,
      payload: signed.payload,
      webhookResponse: result,
    });
  } catch (error: any) {
    console.error('Simulation webhook trigger error:', error);
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
