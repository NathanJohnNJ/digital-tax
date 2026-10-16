import { HMRC_CONFIG } from '@/config/hmrc';
import { cookies } from 'next/headers';

type RefreshedTokens = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRefreshedTokens(value: unknown): value is RefreshedTokens {
  if (!isRecord(value)) return false;
  return typeof value.access_token === 'string'
    && value.access_token.trim().length > 0
    && typeof value.expires_in === 'number'
    && Number.isSafeInteger(value.expires_in)
    && value.expires_in > 0
    && typeof value.refresh_token === 'string'
    && value.refresh_token.trim().length > 0;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorCode(body: unknown) {
  if (!isRecord(body)) return undefined;
  if (typeof body.error === 'string') return body.error;
  if (typeof body.code === 'string') return body.code;
  return undefined;
}

export async function GET() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return Response.json(
      { error: 'HMRC authorisation has expired or is missing. Please link your HMRC account again.' },
      { status: 401 },
    );
  }

  let response: Response;
  try {
    response = await fetch(`${HMRC_CONFIG.testApiUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: HMRC_CONFIG.clientId,
        client_secret: HMRC_CONFIG.clientSecret,
      }),
    });
  } catch (error) {
    console.error('HMRC token refresh request could not be completed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return Response.json({ error: 'Unable to reach HMRC to refresh your authorisation' }, { status: 502 });
  }

  let body: unknown;
  try {
    body = await readResponseBody(response);
  } catch (error) {
    console.error('HMRC token refresh response could not be read', {
      status: response.status,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return Response.json({ error: 'Unable to read HMRC token refresh response' }, { status: 502 });
  }
  if (!response.ok) {
    console.error('HMRC token refresh failed', {
      status: response.status,
      code: errorCode(body),
    });
    return Response.json(
      { error: 'HMRC could not refresh your authorisation', details: body },
      { status: response.status },
    );
  }

  if (!isRefreshedTokens(body)) {
    console.error('HMRC token refresh returned an invalid token response', {
      status: response.status,
    });
    return Response.json({ error: 'HMRC returned an invalid token response' }, { status: 502 });
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: body.expires_in,
  };
  cookieStore.set('access_token', body.access_token, options);
  cookieStore.set('refresh_token', body.refresh_token, options);

  return Response.json({ success: true });
}
