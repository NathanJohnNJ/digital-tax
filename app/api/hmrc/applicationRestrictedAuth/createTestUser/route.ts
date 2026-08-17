import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { auth0 } from '@/lib/auth0';
import { requestAppAccessToken } from '@/app/actions/requestAppAccessToken';

const allowedTestingEmails = (process.env.TESTING_ALLOWED_USER_EMAILS!)
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  const userEmail = session?.user?.email?.toLowerCase();

  if (process.env.NODE_ENV === 'production' || !userEmail || !allowedTestingEmails.includes(userEmail)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { serviceNamesList } = await req.json();

  if (!Array.isArray(serviceNamesList) || serviceNamesList.length === 0) {
    return Response.json({ error: "serviceNamesList is required" }, { status: 400 });
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
  
  const response = await fetch(`${HMRC_CONFIG.testApiUrl}/create-test-user/individuals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      serviceNames: serviceNamesList
    })
  });
  if (!response.ok) {
    return Response.json({ status: response.status });
  }
  const data = await response.json();
  console.log(data);
  return NextResponse.json(data);
}
