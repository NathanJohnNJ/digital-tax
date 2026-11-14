import { HMRC_CONFIG } from "@/config/hmrc";
import { auth0 } from "@/lib/auth0";
import { ensureAppUser } from "@/lib/appUser";
import { createHmrcOAuthStateCookie } from "@/lib/hmrcOAuthState";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

const STATE_COOKIE = "hmrc_oauth_state";

export async function GET() {
  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    const appOrigin = new URL(HMRC_CONFIG.redirectUri).origin;
    return NextResponse.redirect(new URL("/auth/login?returnTo=/account", appOrigin));
  }

  try {
    await ensureAppUser(session.user);
  } catch (error) {
    console.error("Unable to create the app user before HMRC authorization", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Unable to prepare your account for HMRC authorization." }, { status: 500 });
  }

  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, createHmrcOAuthStateCookie(state, session.user.sub), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  const url = new URL(`${HMRC_CONFIG.testAuthUrl}/authorize`);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", HMRC_CONFIG.clientId);
  url.searchParams.set("scope", "read:self-assessment write:self-assessment");
  url.searchParams.set("redirect_uri", HMRC_CONFIG.redirectUri);
  url.searchParams.set("state", state);

  return Response.redirect(url.toString());
}
