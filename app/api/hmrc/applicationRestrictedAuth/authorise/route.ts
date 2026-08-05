import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const fullUrl = req.nextUrl;
  const baseUrl = fullUrl.toString().slice(0, 22);
  const cookieStore = await cookies();
  
  const tokenResponse = await fetch(`${HMRC_CONFIG.testApiUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: HMRC_CONFIG.clientId,
      client_secret: HMRC_CONFIG.clientSecret,
    })
  });

  if (!tokenResponse.ok) {
    return Response.json({ status: tokenResponse.status });
  }
let tokens;
  try {
    const text = await tokenResponse.text();
    tokens = JSON.parse(text);
    const options = {
      httpOnly: true,
      secure: true, 
      maxAge: tokens.expires_in
    }
    console.log(tokens);
    cookieStore.set('application_access_token', tokens.access_token, options);
  } catch (err) {
    console.error("Failed to parse token response:", err);
    return Response.json({ error: "Invalid token response" }, { status: 500 });
  }

  return NextResponse.redirect(`${baseUrl}/api/hmrc/fraud/test`);
}

