'use server'

import { HMRC_CONFIG } from "@/config/hmrc";
import { cookies } from 'next/headers';
import { auth0 } from '@/lib/auth0';
import { requestAppAccessToken } from './requestAppAccessToken';

const allowedTestingEmails = (process.env.TESTING_ALLOWED_USER_EMAILS!)
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export async function getServicesAction() {
  const session = await auth0.getSession();
  const userEmail = session?.user?.email?.toLowerCase();

  if (process.env.NODE_ENV === 'production' || !userEmail || !allowedTestingEmails.includes(userEmail)) {
    return { ok: false, status: 403, body: { error: 'Forbidden' } };
  }

  const cookieStore = await cookies();
  let token: string | undefined;

  if(!cookieStore.has('application_access_token')){ 
    const tokenResult = await requestAppAccessToken();
    if (!tokenResult.ok) {
      console.error('Failed to fetch application token', tokenResult);
      return { ok: false, status: tokenResult.status, body: tokenResult.body };
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
    return { ok: false, status: 401, body: { error: 'Missing application access token' } };
  }

  const res = await fetch(`${HMRC_CONFIG.testApiUrl}/create-test-user/services`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  try{
    const response = await res.json();
    console.log(response);
    return response;
  }catch(error){
    console.error(error);
    return { ok: false, status: 500, body: { error: 'Unable to parse services response' } };
  }
}
