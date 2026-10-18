import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { buildFraudPreventionHeaders } from '../utils/buildFraudPreventionHeaders';
import { getTrustedClientIp } from '../utils/getTrustedClientIp';
import { pool } from '@/lib/db';

// Temporary diagnostics: disabled on Vercel production unless DEBUG_ENDPOINT=1.
function enabled() {
  return process.env.VERCEL_ENV !== 'production' || process.env.DEBUG_ENDPOINT === '1';
}

const present = (name: string) => (process.env[name] ? 'set' : 'MISSING');

export async function GET(request: NextRequest) {
  if (!enabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const cookieStore = await cookies();
  const result: Record<string, unknown> = {
    runtime: {
      vercelEnv: process.env.VERCEL_ENV,
      vercel: process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV,
      node: process.version,
    },
    env: Object.fromEntries(
      ['HMRC_CLIENT_ID', 'HMRC_CLIENT_SECRET', 'HMRC_REDIRECT_URI', 'APP_NAME', 'LICENSE_KEY', 'SERVER_PUBLIC_IP',
        'WAF_PUBLIC_IP', 'SERVER2_PUBLIC_IP', 'DB_CONNECTION_STRING', 'AUTH0_SECRET', 'AUTH0_DOMAIN',
        'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'APP_BASE_URL'].map((n) => [n, present(n)]),
    ),
    redirectUri: process.env.HMRC_REDIRECT_URI,
    appBaseUrl: process.env.APP_BASE_URL,
    cookies: {
      names: cookieStore.getAll().map((c) => c.name),
      hasCode: cookieStore.has('code'),
      hasAccessToken: cookieStore.has('access_token'),
      hasRefreshToken: cookieStore.has('refresh_token'),
    },
    requestHeaders: {
      host: request.headers.get('host'),
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'x-real-ip': request.headers.get('x-real-ip'),
      'x-vercel-forwarded-for': request.headers.get('x-vercel-forwarded-for'),
    },
    trustedClientIp: getTrustedClientIp(request) ?? null,
  };

  try {
    const headers = await buildFraudPreventionHeaders(
      { connectionMethod: 'WEB_APP_VIA_SERVER', browserUserAgent: 'debug', deviceID: 'debug' },
      request,
    );
    result.fraudHeaders = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k, v === '' || v === undefined ? '<EMPTY>' : String(v).slice(0, 60)]),
    );
  } catch (error) {
    result.fraudHeadersError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }

  try {
    const ping = await fetch('https://test-api.service.hmrc.gov.uk/hello/world', {
      headers: { Accept: 'application/vnd.hmrc.1.0+json' },
      signal: AbortSignal.timeout(8000),
    });
    result.hmrcReachability = { status: ping.status, body: (await ping.text()).slice(0, 200) };
  } catch (error) {
    const e = error as { message?: string; cause?: { code?: string; message?: string } };
    result.hmrcReachability = { error: e.message, cause: e.cause?.code ?? e.cause?.message };
  }

  try {
    await pool.query('SELECT 1');
    result.db = 'ok';
  } catch (error) {
    result.db = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }

  return NextResponse.json(result);
}
