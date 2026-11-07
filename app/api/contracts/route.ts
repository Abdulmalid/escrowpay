import { NextRequest, NextResponse } from 'next/server';
import { getContracts, addContract, addLog } from '@/lib/storage';
import { createVirtualAccount, getBlaaizAccessToken, FX_RATES } from '@/lib/blaaiz';
import { Contract, Milestone } from '@/lib/types';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD'] as const;
const PAYOUT_CURRENCIES = ['NGN', 'KES', 'GHS', 'USD', 'USDC'] as const;
const PAYOUT_METHODS = ['bank_transfer', 'mobile_money', 'crypto_stablecoin'] as const;

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function GET() {
  const contracts = await getContracts();
  return NextResponse.json({ contracts });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // ---- Validation -------------------------------------------------------
    const title = str(body.title);
    const clientName = str(body.clientName);
    const freelancerName = str(body.freelancerName);
    const clientEmail = str(body.clientEmail);
    const freelancerEmail = str(body.freelancerEmail);
    const currency = body.currency;
    const targetPayoutCurrency = body.targetPayoutCurrency || 'NGN';
    const payoutMethod = body.payoutMethod || 'bank_transfer';
    const totalAmount = Number(body.totalAmount);

    const errors: string[] = [];
    if (!title) errors.push('title is required');
    if (!clientName) errors.push('clientName is required');
    if (!freelancerName) errors.push('freelancerName is required');
    const EMAIL = /^\S+@\S+\.\S+$/;
    if (!EMAIL.test(clientEmail)) errors.push('a valid clientEmail is required');
    if (!EMAIL.test(freelancerEmail)) errors.push('a valid freelancerEmail is required');
    if (!CURRENCIES.includes(currency)) errors.push(`currency must be one of ${CURRENCIES.join(', ')}`);
    if (!PAYOUT_CURRENCIES.includes(targetPayoutCurrency)) errors.push('unsupported targetPayoutCurrency');
    else if (CURRENCIES.includes(currency) && currency !== targetPayoutCurrency && !FX_RATES[currency]?.[targetPayoutCurrency]) {
      errors.push(`no FX route from ${currency} to ${targetPayoutCurrency}`);
    }
    if (!PAYOUT_METHODS.includes(payoutMethod)) errors.push('unsupported payoutMethod');
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) errors.push('totalAmount must be a positive number');

    const rawMilestones: any[] = Array.isArray(body.milestones) ? body.milestones : [];
    if (rawMilestones.length === 0) errors.push('at least one milestone is required');
    const amounts = rawMilestones.map((m) => Number(m?.amount));
    if (amounts.some((a) => !Number.isFinite(a) || a <= 0)) errors.push('every milestone amount must be a positive number');
    else if (Number.isFinite(totalAmount) && Math.abs(amounts.reduce((s, a) => s + a, 0) - totalAmount) > 0.01) {
      errors.push('milestone amounts must add up to totalAmount');
    }

    if (errors.length) {
      return NextResponse.json({ error: errors.join('; '), errors }, { status: 400 });
    }

    // ---- Provision ----------------------------------------------------------
    const id = `cnt_${crypto.randomBytes(4).toString('hex')}`;
    const merchantRef = `ESCROW-${id}`;

    await getBlaaizAccessToken();
    await addLog({
      type: 'API_CALL',
      endpoint: 'POST /oauth/token',
      status: 'SUCCESS',
      title: 'OAuth2 Token Validated for Escrow Creation',
      details: { grant_type: 'client_credentials', scope: 'virtual_account:create' },
    });

    const virtualAccount = await createVirtualAccount({
      currency,
      merchantReference: merchantRef,
      customerName: freelancerName || 'Freelancer Escrow',
    });

    await addLog({
      type: 'API_CALL',
      endpoint: 'POST /api/external/virtual-account',
      status: 'SUCCESS',
      title: `Dedicated ${currency} Account Provisioned`,
      details: {
        account_number: virtualAccount.accountNumber,
        bank: virtualAccount.bankName,
        currency,
        merchant_reference: merchantRef,
      },
    });

    const milestones: Milestone[] = rawMilestones.map((m, i) => ({
      id: `ms_${id}_${i + 1}`,
      title: str(m.title) || `Milestone ${i + 1}`,
      description: str(m.description, 1000),
      amount: amounts[i],
      percentage: Math.round((amounts[i] / totalAmount) * 100),
      status: 'PENDING_DEPOSIT',
    }));

    const pd = body.payoutDetails && typeof body.payoutDetails === 'object' ? body.payoutDetails : {};
    const newContract: Contract = {
      id,
      title,
      description: str(body.description, 2000),
      clientName,
      clientEmail: clientEmail.toLowerCase(),
      freelancerName,
      freelancerEmail: freelancerEmail.toLowerCase(),
      freelancerCountry: str(body.freelancerCountry) || 'Nigeria',
      totalAmount,
      currency,
      targetPayoutCurrency,
      payoutMethod,
      // Only known payout fields are persisted.
      payoutDetails: {
        accountNumber: str(pd.accountNumber, 64) || undefined,
        bankName: str(pd.bankName) || undefined,
        bankCode: str(pd.bankCode, 32) || undefined,
        mobileNumber: str(pd.mobileNumber, 32) || undefined,
        networkProvider: str(pd.networkProvider) || undefined,
        cryptoWalletAddress: str(pd.cryptoWalletAddress, 128) || undefined,
        cryptoNetwork: ['Polygon', 'Ethereum', 'Solana'].includes(pd.cryptoNetwork) ? pd.cryptoNetwork : undefined,
      },
      autoHedgeStablecoin: body.autoHedgeStablecoin ?? true,
      status: 'AWAITING_DEPOSIT',
      createdAt: new Date().toISOString(),
      virtualAccount: virtualAccount as Contract['virtualAccount'],
      milestones,
    };

    await addContract(newContract);

    return NextResponse.json({ success: true, contract: newContract }, { status: 201 });
  } catch (error) {
    console.error('Contract creation error:', error);
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
  }
}
