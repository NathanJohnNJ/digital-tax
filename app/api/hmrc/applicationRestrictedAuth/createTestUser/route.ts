import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { auth0 } from '@/lib/auth0';
import { requestAppAccessToken } from '@/app/actions/requestAppAccessToken';
import { forwardHmrcResponse } from '@/app/api/utils/forwardHmrcResponse';
import { readJsonRecord } from '@/app/api/utils/hmrcValidation';
import { sandboxTestToolsEnabled } from '@/lib/hmrcSandboxTools';

const individualServices = new Set([
  'national-insurance', 'self-assessment', 'mtd-income-tax', 'customs-services',
  'goods-vehicle-movements', 'import-control-system', 'mtd-vat',
  'common-transit-convention-traders', 'common-transit-convention-traders-legacy',
  'capital-gains-tax-uk-property', 'plastic-packaging-tax',
]);

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

  if (!sandboxTestToolsEnabled() || !userEmail || !allowedTestingEmails.includes(userEmail)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = await readJsonRecord(req);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const { serviceNamesList } = parsed.value;
  if (
    !Array.isArray(serviceNamesList) || serviceNamesList.length === 0
    || !serviceNamesList.every((service) => typeof service === 'string' && individualServices.has(service))
    || new Set(serviceNamesList).size !== serviceNamesList.length
  ) {
    return Response.json({ error: "Select one or more distinct supported services" }, { status: 400 });
  }

  const cookieStore = await cookies();
  let token: string | undefined;

  if(!cookieStore.has('application_access_token')){ 
    const tokenResult = await requestAppAccessToken();
    if (!tokenResult.ok) {
      return Response.json({ status: tokenResult.status, body: tokenResult.body }, { status: tokenResult.status });
    }

    const isSecureCookie = process.env.NODE_ENV !== "development";
    const options = {
      httpOnly: true,
      maxAge: tokenResult.tokens.expires_in,
      secure: isSecureCookie
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
    const response = await fetch(`${HMRC_CONFIG.testApiUrl}/create-test-user/individuals`, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.hmrc.1.0+json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ serviceNames: serviceNamesList })
    });
    const forwarded = await forwardHmrcResponse(response, 'test-user creation', false);
    forwarded.headers.set('Cache-Control', 'no-store');
    return forwarded;
  } catch (error) {
    console.error('HMRC Sandbox test-user creation request failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return Response.json({ error: 'Unable to reach HMRC Sandbox. Please try again later.' }, { status: 502 });
  }
}
