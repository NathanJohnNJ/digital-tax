import { HMRC_CONFIG } from "@/config/hmrc";
import { NextRequest, NextResponse } from "next/server";
import { buildFraudPreventionHeaders } from "../../utils/buildFraudPreventionHeaders";
import { isFraudClientData } from "../../utils/hmrcFraudValidation";
import { readJsonRecord } from "../../utils/hmrcValidation";
import { getCurrentHmrcAccessToken } from "@/lib/hmrcTokens";

export async function POST(req: NextRequest, route: string, searchParams: string) {
  const parsed = await readJsonRecord(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { clientData } = parsed.value;
  if (!isFraudClientData(clientData)) {
    return NextResponse.json({ error: 'Client fraud-prevention data is invalid' }, { status: 400 });
  }
  const fraudPreventionHeaders = await buildFraudPreventionHeaders(clientData, req);
  const tokenResult = await getCurrentHmrcAccessToken();
  if (!tokenResult.ok) {
    return NextResponse.json({ error: tokenResult.error }, { status: tokenResult.status });
  }
  const token = tokenResult.accessToken;

  const requestUrl = new URL(`${HMRC_CONFIG.testApiUrl}${route}`);
  requestUrl.search = searchParams;
  
  const requestHeaders = {
    "Accept": "application/vnd.hmrc.9.0+json",
    "Authorization": `Bearer ${token}`,
    ...fraudPreventionHeaders
  };

  try {
    const request = await fetch(requestUrl, {
      method: "GET",
      headers: requestHeaders,
    });

    const responseText = await request.text();
    let response: any;
    try {
      response = JSON.parse(responseText);
    } catch {
      response = responseText;
    }

    if (!request.ok) {
      const message = typeof response?.message === 'string'
        ? response.message
        : 'HMRC request failed';

      return NextResponse.json(
        { error: message, status: request.status },
        { status: request.status }
      );
    }

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);           
    console.error('HMRC request failed:', err);

    return NextResponse.json({ error: message }, { status: 500 });
  }

}
