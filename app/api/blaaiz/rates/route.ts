import { NextResponse } from 'next/server';
import { FX_RATES } from '@/lib/blaaiz';

export async function GET() {
  return NextResponse.json({
    baseCurrencies: ['USD', 'EUR', 'GBP', 'CAD'],
    targetCurrencies: ['NGN', 'KES', 'GHS', 'USDC', 'USDT'],
    rates: FX_RATES,
    timestamp: new Date().toISOString(),
  });
}
