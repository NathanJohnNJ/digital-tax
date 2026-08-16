import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { requestUserAccessToken } from '@/app/actions/requestUserAccessToken'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const code = req.nextUrl.searchParams.get('code');
  const authError = req.nextUrl.searchParams.get('error');

  if (authError){
    const errorDescription = req.nextUrl.searchParams.get('error_description');
    const error_code = req.nextUrl.searchParams.get('error_code');
    return Response.json({ error: `${authError} - ${error_code} \n ${errorDescription}`}, { status: 400})
  }

  if (!code) {
    return Response.json({ error: "Missing authorization code" }, { status: 400 });
  }

  cookieStore.set('code', code, {
    httpOnly: true,
    secure: true,
    maxAge: 600
  });

  const fullUrl = req.nextUrl;
  let baseUrl = fullUrl.toString().slice(0, 22);
  if (baseUrl !== 'http://localhost:3000/'){
    baseUrl = "https://dt.njtd.xyz/"
  }
  
  let token;
  if(!cookieStore.has('access_token')){ 
    token = await requestUserAccessToken();
    const options = {
      httpOnly: true,
      maxAge: token.expires_in,
      secure: process.env.NODE_ENV === "production"
    }
    cookieStore.set('access_token', token.access_token, options);
    cookieStore.set('refresh_token', token.refresh_token, options);
    token = token.access_token;
  } else {
    token = cookieStore.get('access_token')?.value;
  }

  return NextResponse.redirect(`${baseUrl}/account`);
}

