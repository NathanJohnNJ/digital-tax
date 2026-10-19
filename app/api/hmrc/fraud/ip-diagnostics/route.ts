import { isIP } from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { buildFraudPreventionHeaders } from '@/app/api/utils/buildFraudPreventionHeaders';
import { isRecord, readJsonRecord } from '@/app/api/utils/hmrcValidation';

const testingAllowedEmailsValue = process.env.TESTING_ALLOWED_USER_EMAILS;
const allowedTestingEmails = testingAllowedEmailsValue
  ? testingAllowedEmailsValue
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  : [];

if (process.env.NODE_ENV !== 'production' && testingAllowedEmailsValue === undefined) {
  throw new Error('TESTING_ALLOWED_USER_EMAILS is required in non-production environments.');
}

async function lookupPublicIp(): Promise<string | null> {
  const response = await fetch('https://api.ipify.org?format=json', {
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) {
    throw new Error(`IP lookup failed with status ${response.status}`);
  }

  const body: unknown = await response.json();
  if (
    typeof body !== 'object'
    || body === null
    || !('ip' in body)
    || typeof body.ip !== 'string'
    || !isIP(body.ip)
  ) {
    throw new Error('IP lookup returned an invalid response');
  }

  return body.ip;
}

export async function POST(request: NextRequest) {
  const session = await auth0.getSession();
  const userEmail = session?.user?.email?.toLowerCase();

  if (!userEmail || !allowedTestingEmails.includes(userEmail)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = await readJsonRecord(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (!isRecord(parsed.value.clientData)) {
    return NextResponse.json({ error: 'Client fraud-prevention data must be a JSON object' }, { status: 400 });
  }

  try {
    const headers = await buildFraudPreventionHeaders(parsed.value.clientData);

    let serverIpApi: string | null = null;
    let serverIpApiError: string | null = null;
    try {
      serverIpApi = await lookupPublicIp();
    } catch (error) {
      serverIpApiError = 'Unable to verify the server public IP using the IP lookup API.';
      console.error('Server IP diagnostic lookup failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    return NextResponse.json(
      {
        application: {
          clientPublicIp: headers['Gov-Client-Public-IP'] || null,
          vendorPublicIp: headers['Gov-Vendor-Public-IP'] || null,
          vendorForwarded: headers['Gov-Vendor-Forwarded'] || null,
          configuredServerIps: {
            server: process.env.SERVER_PUBLIC_IP || null,
            waf: process.env.WAF_PUBLIC_IP || null,
            server2: process.env.SERVER2_PUBLIC_IP || null,
          },
        },
        ipApi: {
          serverPublicIp: serverIpApi,
          serverError: serverIpApiError,
        },
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (error) {
    console.error('Unable to build IP diagnostic values', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json(
      { error: 'Unable to generate fraud-prevention headers. Check IP resolution and try again.' },
      { status: 502 },
    );
  }
}
