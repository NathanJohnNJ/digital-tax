import { HMRC_CONFIG } from "@/config/hmrc";
import type { HmrcTokens } from "@/lib/hmrcTokens";

export type TokenRequestResult =
  | { ok: true; tokens: HmrcTokens }
  | { ok: false; status: number; body: unknown };

function isTokenPayload(value: unknown): value is HmrcTokens {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const token = value as Record<string, unknown>;
  return typeof token.access_token === "string"
    && token.access_token.trim().length > 0
    && typeof token.refresh_token === "string"
    && token.refresh_token.trim().length > 0
    && typeof token.expires_in === "number"
    && Number.isSafeInteger(token.expires_in)
    && token.expires_in > 0;
}

export async function requestUserAccessToken(code: string): Promise<TokenRequestResult> {
  if (!code.trim()) {
    return { ok: false, status: 400, body: { error: "Missing authorization code" } };
  }

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(`${HMRC_CONFIG.testApiUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: HMRC_CONFIG.clientId,
        client_secret: HMRC_CONFIG.clientSecret,
        redirect_uri: HMRC_CONFIG.redirectUri,
      }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (error) {
    console.error("HMRC authorization-code exchange could not be completed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { ok: false, status: 502, body: { error: "Unable to reach HMRC" } };
  }

  if (!tokenResponse.ok) {
    let body: unknown;
    try {
      const text = await tokenResponse.text();
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = "HMRC returned an unreadable token response";
    }

    return { ok: false, status: tokenResponse.status, body };
  }

  try {
    const payload: unknown = await tokenResponse.json();
    if (!isTokenPayload(payload)) {
      return {
        ok: false,
        status: 502,
        body: { error: "Invalid token response" }
      };
    }

    return { ok: true, tokens: payload };
  } catch (err) {
    console.error("Failed to parse HMRC token response", {
      errorName: err instanceof Error ? err.name : "UnknownError",
    });
    return { ok: false, status: 502, body: { error: "Invalid token response" } };
  }
}