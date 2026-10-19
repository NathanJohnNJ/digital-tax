import { requestUserAccessToken } from '@/app/actions/requestUserAccessToken';
import { HMRC_CONFIG } from '@/config/hmrc';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { buildFraudPreventionHeaders } from '../../../utils/buildFraudPreventionHeaders';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validTaxYear(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return Boolean(match && Number(match[2]) === (Number(match[1]) + 1) % 100);
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function POST(request: NextRequest) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  if (!isRecord(input)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const { action, clientData, nino, businessId, taxYear, annualSubmission } = input;
  if (action !== 'retrieve' && action !== 'submit') {
    return NextResponse.json({ error: 'Action must be retrieve or submit' }, { status: 400 });
  }
  if (typeof nino !== 'string' || !/^[A-Z]{2}\d{6}[A-D]$/.test(nino)) {
    return NextResponse.json({ error: 'A valid National Insurance number is required' }, { status: 400 });
  }
  if (typeof businessId !== 'string' || !/^X[A-Z0-9]IS\d{11}$/.test(businessId)) {
    return NextResponse.json({ error: 'A valid HMRC business ID is required' }, { status: 400 });
  }
  if (!validTaxYear(taxYear)) {
    return NextResponse.json({ error: 'A valid tax year is required' }, { status: 400 });
  }
  if (action === 'submit' && !isRecord(annualSubmission)) {
    return NextResponse.json({ error: 'Annual summary data is required' }, { status: 400 });
  }

  try {
    const fraudHeaders = await buildFraudPreventionHeaders(clientData);
    const cookieStore = await cookies();
    let token = cookieStore.get('access_token')?.value;

    if (!token && !cookieStore.has('access_token')) {
      const tokenResult = await requestUserAccessToken();
      if (!tokenResult.ok) {
        return NextResponse.json({ status: tokenResult.status, body: tokenResult.body }, { status: tokenResult.status });
      }
      token = tokenResult.tokens.access_token;
      const options = {
        httpOnly: true,
        maxAge: tokenResult.tokens.expires_in,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      };
      cookieStore.set('access_token', token, options);
      if (tokenResult.tokens.refresh_token) cookieStore.set('refresh_token', tokenResult.tokens.refresh_token, options);
    }
    if (!token) return NextResponse.json({ error: 'Missing access token' }, { status: 401 });

    const url = `${HMRC_CONFIG.testApiUrl}/individuals/business/self-employment/${nino}/${businessId}/annual/${taxYear}`;
    const response = await fetch(url, {
      method: action === 'retrieve' ? 'GET' : 'PUT',
      headers: {
        Accept: 'application/vnd.hmrc.5.0+json',
        Authorization: `Bearer ${token}`,
        ...(action === 'submit' && { 'Content-Type': 'application/json' }),
        ...fraudHeaders,
      },
      ...(action === 'submit' && { body: JSON.stringify(annualSubmission) }),
    });
    const body = await readResponse(response);

    if (action === 'retrieve' && response.status === 404) {
      return NextResponse.json({ submission: null });
    }
    if (!response.ok) {
      const message = isRecord(body) && typeof body.message === 'string' ? body.message : 'HMRC annual submission request failed';
      return NextResponse.json({ error: message, details: body }, { status: response.status });
    }
    return NextResponse.json(action === 'retrieve' ? { submission: body ?? null } : { success: true });
  } catch (error) {
    console.error('HMRC annual submission request failed:', error);
    return NextResponse.json({ error: 'Unable to reach HMRC' }, { status: 502 });
  }
}