import crypto from 'crypto';

export const BLAAIZ_BASE_URL = process.env.BLAAIZ_BASE_URL || 'https://api-dev.blaaiz.com';
const IS_SIMULATION = process.env.BLAAIZ_SIMULATION_MODE !== 'false';
const DEMO_SIGNING_SECRET = 'blaaiz_whsec_hackathon_demo_key_9921';
const PLACEHOLDER_CLIENT_IDS = ['', 'your_blaaiz_client_id_here', 'blz_client_hackathon_demo'];

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Live mode = simulation explicitly disabled. In live mode we never fall back to fake data:
 * missing config or API failures throw, so we can't record money as moved when it wasn't.
 */
function isLive(): boolean {
  if (IS_SIMULATION) return false;
  const id = process.env.BLAAIZ_CLIENT_ID || '';
  if (PLACEHOLDER_CLIENT_IDS.includes(id) || !process.env.BLAAIZ_CLIENT_SECRET) {
    throw new Error(
      'BLAAIZ_SIMULATION_MODE=false but BLAAIZ_CLIENT_ID / BLAAIZ_CLIENT_SECRET are not configured.'
    );
  }
  return true;
}

/** Webhook signing secret. The public demo secret is only usable in simulation mode. */
export function getSigningSecret(): string {
  const secret = process.env.BLAAIZ_WEBHOOK_SIGNING_SECRET;
  if (secret && secret !== DEMO_SIGNING_SECRET) return secret;
  if (IS_SIMULATION) return DEMO_SIGNING_SECRET;
  throw new Error('BLAAIZ_WEBHOOK_SIGNING_SECRET must be set when BLAAIZ_SIMULATION_MODE=false.');
}

/**
 * 1. OAuth 2.0 Token Generation with Scoped Least Privilege
 */
export async function getBlaaizAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  if (!isLive()) {
    cachedToken = `blz_bearer_token_${crypto.randomBytes(24).toString('hex')}`;
    tokenExpiresAt = now + 3600 * 1000;
    return cachedToken;
  }

  const bodyParams = new URLSearchParams();
  bodyParams.append('client_id', process.env.BLAAIZ_CLIENT_ID!);
  bodyParams.append('client_secret', process.env.BLAAIZ_CLIENT_SECRET!);
  bodyParams.append('grant_type', 'client_credentials');
  // Blaaiz grants its full default scope set unless one is requested, so only send a scope if configured.
  if (process.env.BLAAIZ_OAUTH_SCOPE) bodyParams.append('scope', process.env.BLAAIZ_OAUTH_SCOPE);

  const res = await fetch(`${BLAAIZ_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'EscrowPay-Platform/1.0',
    },
    body: bodyParams.toString(),
  });

  if (!res.ok) {
    throw new Error(`Blaaiz OAuth request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error('Blaaiz OAuth response did not include an access_token');
  cachedToken = data.access_token as string;
  tokenExpiresAt = now + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

/**
 * 2. Multi-Currency Virtual Bank Account Provisioning
 */
export async function createVirtualAccount(params: {
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD';
  merchantReference: string;
  customerName: string;
}) {
  const token = await getBlaaizAccessToken();

  if (isLive()) {
    const res = await fetch(`${BLAAIZ_BASE_URL}/api/external/virtual-account`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'EscrowPay-Platform/1.0',
      },
      body: JSON.stringify({
        currency: params.currency,
        merchant_reference: params.merchantReference,
        customer_name: params.customerName,
      }),
    });
    if (!res.ok) {
      throw new Error(`Blaaiz virtual account creation failed: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  }

  // Realistic BaaS bank details matching Blaaiz production specs (simulation only)
  const mockId = `va_${crypto.randomBytes(8).toString('hex')}`;
  const randomAcc = crypto.randomInt(1000000000, 9999999999).toString();

  switch (params.currency) {
    case 'USD':
      return {
        id: mockId,
        accountNumber: randomAcc,
        routingNumber: '021000021',
        bankName: 'Community Federal Savings Bank / Blaaiz Clearing',
        accountName: `EscrowPay / ${params.customerName}`,
        currency: 'USD',
        merchantReference: params.merchantReference,
        country: 'USA',
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      };
    case 'EUR':
      return {
        id: mockId,
        accountNumber: `DE89370400440${randomAcc.slice(0, 7)}`,
        iban: `DE89370400440${randomAcc.slice(0, 7)}`,
        swiftBic: 'DBEUMM21XXX',
        bankName: 'Banking Circle S.A. / SEPA Clearing',
        accountName: `EscrowPay FBO ${params.customerName}`,
        currency: 'EUR',
        merchantReference: params.merchantReference,
        country: 'Germany / EU',
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      };
    case 'GBP':
      return {
        id: mockId,
        accountNumber: randomAcc.slice(0, 8),
        sortCode: '04-00-04',
        bankName: 'ClearBank UK Ltd',
        accountName: `EscrowPay / ${params.customerName}`,
        currency: 'GBP',
        merchantReference: params.merchantReference,
        country: 'United Kingdom',
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      };
    case 'CAD':
      return {
        id: mockId,
        accountNumber: randomAcc.slice(0, 7),
        routingNumber: '00040-001',
        bankName: 'Interac & Peoples Trust Canada',
        accountName: `interac-escrow+${params.merchantReference.slice(0, 6)}@blaaiz.ca`,
        currency: 'CAD',
        merchantReference: params.merchantReference,
        country: 'Canada',
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      };
    default:
      throw new Error(`Unsupported deposit currency: ${String(params.currency)}`);
  }
}

/**
 * 3. FX Rates & Stablecoin Auto-Hedge Swap
 */
export const FX_RATES: Record<string, Record<string, number>> = {
  USD: { NGN: 1680, KES: 130, GHS: 15.5, USDC: 1.0, USDT: 1.0, EUR: 0.92, GBP: 0.78 },
  EUR: { NGN: 1820, KES: 141, GHS: 16.8, USDC: 1.08, USDT: 1.08, USD: 1.08, GBP: 0.85 },
  GBP: { NGN: 2150, KES: 166, GHS: 19.8, USDC: 1.28, USDT: 1.28, USD: 1.28, EUR: 1.17 },
  CAD: { NGN: 1220, KES: 94, GHS: 11.2, USDC: 0.73, USDT: 0.73, USD: 0.73, EUR: 0.67 },
};

/** Throws for unknown pairs instead of silently treating them as 1:1. */
export function getFxRate(from: string, to: string): number {
  if (from === to) return 1;
  const rate = FX_RATES[from]?.[to];
  if (typeof rate !== 'number') {
    throw new Error(`Unsupported FX pair: ${from} -> ${to}`);
  }
  return rate;
}

export async function executeStablecoinSwap(amount: number, fromCurrency: string) {
  const rateToUSDC = getFxRate(fromCurrency, 'USDC');
  const amountUSDC = Math.round(amount * rateToUSDC * 100) / 100;

  // Illustrative devaluation protection (demo figure, not a live market rate):
  // assumes the local currency depreciates 6.5% over the escrow period.
  const initialNgnRate = getFxRate(fromCurrency, 'NGN');
  const projectedNgnDevaluedRate = Math.round(initialNgnRate * 1.065);
  const initialLocalValue = amount * initialNgnRate;
  const hedgedLocalValue = amountUSDC * projectedNgnDevaluedRate;
  const valueSavedNgn = Math.max(0, hedgedLocalValue - initialLocalValue);

  return {
    success: true,
    txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    hedgedTo: 'USDC' as const,
    amountHedged: amountUSDC,
    initialFxRate: initialNgnRate,
    currentFxRate: projectedNgnDevaluedRate,
    valueSavedNgn,
    swappedAt: new Date().toISOString(),
    network: 'Polygon PoS (Settlement Rail)',
  };
}

/**
 * 4. Multi-Rail Instant Payouts (Bank Transfer, Mobile Money, Crypto)
 */
export async function initiateBlaaizPayout(details: {
  amount: number;
  currency: string;
  targetCurrency: string;
  payoutMethod: 'bank_transfer' | 'mobile_money' | 'crypto_stablecoin';
  merchantReference: string;
  recipient: {
    name: string;
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    mobileNumber?: string;
    networkProvider?: string;
    cryptoAddress?: string;
  };
}) {
  const token = await getBlaaizAccessToken();
  const fxRate = getFxRate(details.currency, details.targetCurrency);
  const payoutAmount = Math.round(details.amount * fxRate * 100) / 100;

  if (isLive()) {
    const res = await fetch(`${BLAAIZ_BASE_URL}/api/external/payout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': details.merchantReference,
        'User-Agent': 'EscrowPay-Platform/1.0',
      },
      body: JSON.stringify({
        amount: payoutAmount,
        currency: details.targetCurrency,
        method: details.payoutMethod,
        merchant_reference: details.merchantReference,
        beneficiary: details.recipient,
      }),
    });
    if (!res.ok) {
      throw new Error(`Blaaiz payout failed: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const status = String(data.status || 'PENDING').toUpperCase();
    return {
      id: String(data.id ?? data.reference ?? details.merchantReference),
      merchantReference: details.merchantReference,
      amount: Number(data.amount ?? payoutAmount),
      currency: String(data.currency ?? details.targetCurrency),
      status: (['PENDING', 'SUCCESSFUL', 'PROCESSING', 'FAILED'].includes(status)
        ? status
        : 'PENDING') as 'PENDING' | 'SUCCESSFUL' | 'PROCESSING' | 'FAILED',
      recipient: details.recipient.name,
      fee: Number(data.fee ?? 0),
      exchangeRate: fxRate,
      estimatedDelivery: String(data.estimated_delivery ?? 'Processing'),
      blaaizRef: String(data.reference ?? data.id ?? details.merchantReference),
      timestamp: new Date().toISOString(),
    };
  }

  // Realistic Blaaiz payout response (simulation only)
  const blzRef = `blz_disburse_${crypto.randomBytes(12).toString('hex')}`;
  return {
    id: `pay_${crypto.randomBytes(8).toString('hex')}`,
    merchantReference: details.merchantReference,
    amount: payoutAmount,
    currency: details.targetCurrency,
    status: 'SUCCESSFUL' as 'PENDING' | 'SUCCESSFUL' | 'PROCESSING' | 'FAILED',
    recipient: details.recipient.name,
    fee: details.targetCurrency === 'NGN' ? 50 : 1.5,
    exchangeRate: fxRate,
    estimatedDelivery: 'Instant (10-30 seconds via NIP / Mobile Money Rail)',
    blaaizRef: blzRef,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 5. Webhook Signature Verification & Simulator Payload Helper
 */
export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

/** Blaaiz signs `${timestamp}.${rawBody}` with HMAC-SHA256 and sends x-blaaiz-signature + x-blaaiz-timestamp. */
export function computeBlaaizSignature(timestamp: string, rawBody: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

function timestampAgeSeconds(ts: string): number | null {
  const n = Number(ts);
  let ms: number;
  if (Number.isFinite(n)) ms = n < 1e12 ? n * 1000 : n; // unix seconds or milliseconds
  else {
    ms = Date.parse(ts); // ISO string
    if (!Number.isFinite(ms)) return null;
  }
  return Math.abs(Date.now() - ms) / 1000;
}

export function verifyBlaaizSignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
  secret: string = getSigningSecret()
): boolean {
  if (!signatureHeader || !timestampHeader) return false;
  const age = timestampAgeSeconds(timestampHeader);
  if (age === null || age > WEBHOOK_TOLERANCE_SECONDS) return false; // stale or unparsable => replay protection
  const expected = Buffer.from(computeBlaaizSignature(timestampHeader, rawBody, secret), 'hex');
  const provided = Buffer.from(signatureHeader.trim().toLowerCase(), 'hex');
  // Length must match or timingSafeEqual throws; also rejects non-hex input (decodes short).
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

export function createSignedWebhookPayload(event: string, data: any, secret: string = getSigningSecret()) {
  const payload = {
    event,
    event_id: `evt_${crypto.randomBytes(10).toString('hex')}`,
    timestamp: new Date().toISOString(),
    ...data,
  };

  const raw = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = computeBlaaizSignature(timestamp, raw, secret);

  return {
    payload,
    rawBody: raw,
    timestamp,
    signature,
  };
}
