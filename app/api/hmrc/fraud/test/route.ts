import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { buildFraudPreventionHeaders } from "../../../utils/buildFraudPreventionHeaders";
import { requestAppAccessToken } from '@/app/actions/requestAppAccessToken';

export async function POST(req: NextRequest) {
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
  
  const clientData = await req.json();
  const fraudPreventionHeaders = await buildFraudPreventionHeaders(clientData);
  const response = await fetch(`${HMRC_CONFIG.testApiUrl}/test/fraud-prevention-headers/business-details-mtd/validation-feedback?connectionMethod=WEB_APP_VIA_SERVER`, {
    method: "GET",
    headers: {
      "Accept": "application/vnd.hmrc.1.0+json",
      "Authorization": `Bearer ${token}`,
      ...fraudPreventionHeaders
    },
  });
  if (!response.ok) {
    return Response.json({ status: response.status });
  }
  const data = await response.json();
  return NextResponse.json(data);
}
