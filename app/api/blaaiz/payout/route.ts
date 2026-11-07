import { NextRequest, NextResponse } from 'next/server';
import { mutateContract, addLog } from '@/lib/storage';
import { initiateBlaaizPayout } from '@/lib/blaaiz';
import { Contract } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOCK_TTL_MS = 2 * 60 * 1000;

class PayoutError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function POST(req: NextRequest) {
  let claimed: { contractId: string; milestoneId: string } | null = null;
  try {
    const body = await req.json().catch(() => null);
    const contractId = body?.contractId;
    const milestoneId = body?.milestoneId;
    if (typeof contractId !== 'string' || typeof milestoneId !== 'string') {
      return NextResponse.json({ error: 'contractId and milestoneId are required' }, { status: 400 });
    }

    // 1. Atomically validate + claim the milestone. A concurrent/repeated request fails here,
    //    so the same milestone can never be paid twice.
    const claimedContract = await mutateContract(contractId, (current) => {
      if (current.status !== 'ESCROWED_HEDGED' && current.status !== 'WORK_IN_PROGRESS') {
        throw new PayoutError(`Contract is not funded (status: ${current.status})`, 409);
      }
      const idx = current.milestones.findIndex((m) => m.id === milestoneId);
      if (idx === -1) throw new PayoutError('Milestone not found', 404);
      const ms = current.milestones[idx];
      if (ms.status === 'DISBURSED') throw new PayoutError('Milestone has already been paid out', 409);
      if (ms.status !== 'SUBMITTED' && ms.status !== 'APPROVED') {
        throw new PayoutError(`Milestone must be submitted before release (status: ${ms.status})`, 409);
      }
      if (ms.payoutInFlightAt && Date.now() - Date.parse(ms.payoutInFlightAt) < LOCK_TTL_MS) {
        throw new PayoutError('A payout for this milestone is already being processed', 409);
      }
      const milestones = [...current.milestones];
      milestones[idx] = { ...ms, payoutInFlightAt: new Date().toISOString() };
      return { ...current, milestones };
    });

    if (!claimedContract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }
    claimed = { contractId, milestoneId };

    const contract: Contract = claimedContract;
    const milestone = contract.milestones.find((m) => m.id === milestoneId)!;

    // 2. Dispatch the payout (outside the DB lock). Merchant reference is deterministic => idempotent upstream.
    const payoutResult = await initiateBlaaizPayout({
      amount: milestone.amount,
      currency: contract.currency,
      targetCurrency: contract.targetPayoutCurrency,
      payoutMethod: contract.payoutMethod,
      merchantReference: `PAYOUT-${contract.id}-${milestone.id}`,
      recipient: {
        name: contract.freelancerName,
        accountNumber: contract.payoutDetails.accountNumber,
        bankName: contract.payoutDetails.bankName,
        bankCode: contract.payoutDetails.bankCode,
        mobileNumber: contract.payoutDetails.mobileNumber,
        networkProvider: contract.payoutDetails.networkProvider,
        cryptoAddress: contract.payoutDetails.cryptoWalletAddress,
      },
    });

    if (payoutResult.status === 'FAILED') {
      throw new PayoutError('Blaaiz reported the payout as FAILED', 502);
    }

    await addLog({
      type: 'PAYOUT_DISBURSED',
      endpoint: 'POST /api/external/payout',
      status: payoutResult.status === 'SUCCESSFUL' ? 'SUCCESS' : 'INFO',
      title: `Instant Payout Released: ${payoutResult.amount.toLocaleString()} ${payoutResult.currency}`,
      details: {
        recipient: contract.freelancerName,
        destination:
          contract.payoutMethod === 'bank_transfer'
            ? `${contract.payoutDetails.bankName} (${contract.payoutDetails.accountNumber})`
            : contract.payoutDetails.mobileNumber || contract.payoutDetails.cryptoWalletAddress,
        blaaizReference: payoutResult.blaaizRef,
        status: payoutResult.status,
        exchangeRate: payoutResult.exchangeRate,
        fee: `${payoutResult.fee} ${payoutResult.currency}`,
      },
    });

    // Money has moved from here on: never auto-release the lock again (a retry could double-pay).
    claimed = null;

    // 3. Finalise: mark the milestone DISBURSED and release the lock.
    const updated = await mutateContract(contractId, (current) => {
      const milestones = current.milestones.map((m) => {
        if (m.id !== milestoneId) return m;
        const { payoutInFlightAt: _lock, ...rest } = m;
        return {
          ...rest,
          status: 'DISBURSED' as const,
          approvedAt: new Date().toISOString(),
          payoutRef: payoutResult.blaaizRef,
        };
      });
      return {
        ...current,
        status: milestones.every((m) => m.status === 'DISBURSED') ? 'COMPLETED' : 'WORK_IN_PROGRESS',
        milestones,
        payoutTransaction: payoutResult,
      };
    });

    return NextResponse.json({ success: true, payout: payoutResult, contract: updated });
  } catch (error: any) {
    if (claimed) {
      // Payout did not complete: release the lock so it can be retried.
      const { contractId, milestoneId } = claimed;
      await mutateContract(contractId, (current) => ({
        ...current,
        milestones: current.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          const { payoutInFlightAt: _lock, ...rest } = m;
          return rest;
        }),
      })).catch((e) => console.error('Failed to release payout lock:', e));
      await addLog({
        type: 'PAYOUT_DISBURSED',
        endpoint: 'POST /api/external/payout',
        status: 'WARNING',
        title: 'Payout Failed — milestone left unpaid',
        details: { contractId, milestoneId, error: error?.message },
      });
    }
    if (error instanceof PayoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Payout dispatch error:', error);
    return NextResponse.json({ error: 'Failed to dispatch payout' }, { status: 502 });
  }
}
