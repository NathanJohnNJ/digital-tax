'use server'

import { HMRC_CONFIG } from "@/config/hmrc";
import { cookies } from 'next/headers';
import { auth0 } from '@/lib/auth0';
import { requestAppAccessToken } from './requestAppAccessToken';

export type ServiceItem = {
  key: string;
  name: string;
  allowedUserTypes: string[];
};

export type ServicesActionResult =
  | { ok: true; services: ServiceItem[] }
  | { ok: false; status: number; error: string };

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

export async function getServicesAction(): Promise<ServicesActionResult> {
  const session = await auth0.getSession();
  const userEmail = session?.user?.email?.toLowerCase();

  if (process.env.NODE_ENV === 'production' || !userEmail || !allowedTestingEmails.includes(userEmail)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  const cookieStore = await cookies();
  let token: string | undefined;

  if(!cookieStore.has('application_access_token')){ 
    const tokenResult = await requestAppAccessToken();
    if (!tokenResult.ok) {
      console.error('Failed to fetch application token', tokenResult);
      return { ok: false, status: tokenResult.status, error: typeof tokenResult.body === 'string' ? tokenResult.body : JSON.stringify(tokenResult.body ?? { error: 'Unable to fetch application token' }) };
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
    return { ok: false, status: 401, error: 'Missing application access token' };
  }

  const res = await fetch(`${HMRC_CONFIG.testApiUrl}/create-test-user/services`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!res.ok) {
    return { ok: false, status: res.status, error: `Services request failed with status ${res.status}` };
  }

  try{
    const response = await res.json();
    const services = Array.isArray(response) ? response as ServiceItem[] : [];
    if (!Array.isArray(response)) {
      return { ok: false, status: 500, error: 'Unexpected services response format' };
    }
    console.log(response);
    return { ok: true, services };
  }catch(error){
    console.error(error);
    return { ok: false, status: 500, error: 'Unable to parse services response' };
  }
}
