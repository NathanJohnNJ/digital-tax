import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { requestAppAccessToken } from '@/app/actions/requestAppAccessToken';

export async function POST(req: NextRequest) {
  const { serviceNamesList } = await req.json();
  const cookieStore = await cookies();
  let token;
  if(!cookieStore.has('application_access_token')){ 
    token = await requestAppAccessToken();
    const options = {
      httpOnly: true,
      maxAge: token.expires_in,
      secure: process.env.NODE_ENV === "production"
    }
    cookieStore.set('application_access_token', token.access_token, options);
    token = token.access_token
  } else {
    token = cookieStore.get('application_access_token')?.value;
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
