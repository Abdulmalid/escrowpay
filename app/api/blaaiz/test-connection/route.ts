import { NextRequest, NextResponse } from 'next/server';
import { getBlaaizAccessToken } from '@/lib/blaaiz';

export async function POST(req: NextRequest) {
  try {
    const { clientId, clientSecret, baseUrl } = await req.json().catch(() => ({}));
    const defaultUrl = process.env.BLAAIZ_BASE_URL || 'https://api-dev.blaaiz.com';
    // SSRF guard: this endpoint makes a server-side request, so only Blaaiz hosts over HTTPS are allowed.
    let targetUrl = defaultUrl;
    if (baseUrl) {
      try {
        const u = new URL(String(baseUrl));
        if (u.protocol !== 'https:' || !(u.hostname === 'blaaiz.com' || u.hostname.endsWith('.blaaiz.com'))) {
          return NextResponse.json(
            { connected: false, error: 'baseUrl must be an https://*.blaaiz.com address' },
            { status: 400 }
          );
        }
        targetUrl = u.origin;
      } catch {
        return NextResponse.json({ connected: false, error: 'Invalid baseUrl' }, { status: 400 });
      }
    }
    const targetId = clientId || process.env.BLAAIZ_CLIENT_ID;
    const targetSecret = clientSecret || process.env.BLAAIZ_CLIENT_SECRET;

    if (!targetId || targetId === 'your_blaaiz_client_id_here' || targetId === 'blz_client_hackathon_demo') {
      return NextResponse.json({
        connected: false,
        mode: 'SIMULATION',
        message: 'Running in Blaaiz Developer Sandbox Simulation mode. Provide your live business-dev.blaaiz.com credentials to connect to live rails.',
        baseUrl: targetUrl,
      });
    }

    if (!targetSecret) {
      return NextResponse.json({ connected: false, error: 'Client secret is required' }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.append('client_id', targetId);
    params.append('client_secret', targetSecret);
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'wallet:read payout:create virtual_account:create virtual_account:read webhook:write');

    const res = await fetch(`${targetUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'EscrowPay-Platform/1.0',
      },
      body: params.toString(),
    });

    const data = await res.json().catch(() => ({} as any));

    if (!res.ok || typeof data.access_token !== 'string') {
      return NextResponse.json({
        connected: false,
        error: data.message || data.error || res.statusText || 'No access token returned',
        statusCode: res.status,
      }, { status: 400 });
    }

    return NextResponse.json({
      connected: true,
      mode: 'LIVE_DEV',
      baseUrl: targetUrl,
      accessTokenSnippet: `${data.access_token.substring(0, 12)}...`,
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'Bearer',
    });
  } catch (error: any) {
    console.error('Blaaiz test-connection error:', error);
    return NextResponse.json({
      connected: false,
      error: 'Failed to connect to Blaaiz API',
    }, { status: 500 });
  }
}
