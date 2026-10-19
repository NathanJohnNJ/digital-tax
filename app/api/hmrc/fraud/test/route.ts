import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { auth0 } from '@/lib/auth0';
import { buildFraudPreventionHeaders } from "../../../utils/buildFraudPreventionHeaders";
import { requestAppAccessToken } from '@/app/actions/requestAppAccessToken';
import { forwardHmrcResponse } from '@/app/api/utils/forwardHmrcResponse';
import { readJsonRecord } from '@/app/api/utils/hmrcValidation';

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

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  const userEmail = session?.user?.email?.toLowerCase();

  if (
    // Re-enable after production fraud-header validation is complete.
    // process.env.NODE_ENV === 'production' ||
    !userEmail || !allowedTestingEmails.includes(userEmail)
  ) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = await readJsonRecord(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const cookieStore = await cookies();
  let token: string | undefined;

  if(!cookieStore.has('application_access_token')){ 
    const tokenResult = await requestAppAccessToken();
    if (!tokenResult.ok) {
      return Response.json({ status: tokenResult.status, body: tokenResult.body }, { status: tokenResult.status });
    }

    const options = {
      httpOnly: true,
      maxAge: tokenResult.tokens.expires_in,
      secure: process.env.NODE_ENV === "production"
    };
    cookieStore.set('application_access_token', tokenResult.tokens.access_token, options);
    token = tokenResult.tokens.access_token;
  } else {
    token = cookieStore.get('application_access_token')?.value;
  }

  if (!token) {
    return Response.json({ error: "Missing application access token" }, { status: 401 });
  }
  
  try {
    const fraudPreventionHeaders = await buildFraudPreventionHeaders(parsed.value);
    const response = await fetch(`${HMRC_CONFIG.testApiUrl}/test/fraud-prevention-headers/validate`, {
      method: "GET",
      headers: {
        "Accept": "application/vnd.hmrc.1.0+json",
        "Authorization": `Bearer ${token}`,
        ...fraudPreventionHeaders
      },
    });
    const forwardedResponse = await forwardHmrcResponse(response, 'fraud-header validation');
    const responseHeaders = new Headers(forwardedResponse.headers);
    responseHeaders.set('Cache-Control', 'no-store');
    responseHeaders.set(
      'X-Fraud-Prevention-Headers',
      Buffer.from(JSON.stringify(fraudPreventionHeaders)).toString('base64'),
    );

    return new Response(forwardedResponse.body, {
      status: forwardedResponse.status,
      statusText: forwardedResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('HMRC fraud-header validation request could not be completed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json(
      { error: 'Unable to validate fraud-prevention headers with HMRC. Please try again later.' },
      { status: 502 },
    );
  }
}
