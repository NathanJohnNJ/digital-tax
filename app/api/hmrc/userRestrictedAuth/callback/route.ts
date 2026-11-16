import { HMRC_CONFIG } from "@/config/hmrc";
import { auth0 } from "@/lib/auth0";
import { ensureAppUser } from "@/lib/appUser";
import { saveHmrcTokens } from "@/lib/hmrcTokens";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requestUserAccessToken } from "@/app/actions/requestUserAccessToken";
import { verifyHmrcOAuthStateCookie } from "@/lib/hmrcOAuthState";

const STATE_COOKIE = "hmrc_oauth_state";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const code = req.nextUrl.searchParams.get('code');
  const authError = req.nextUrl.searchParams.get('error');
  const returnedState = req.nextUrl.searchParams.get("state");
  const savedState = cookieStore.get(STATE_COOKIE)?.value;

  if (!returnedState || !savedState) {
    cookieStore.delete(STATE_COOKIE);
    return Response.json({ error: "HMRC authorization state is missing. Please try linking again." }, { status: 400 });
  }

  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    cookieStore.delete(STATE_COOKIE);
    const appOrigin = new URL(HMRC_CONFIG.redirectUri).origin;
    return NextResponse.redirect(new URL("/auth/login?returnTo=/account", appOrigin));
  }

  if (!verifyHmrcOAuthStateCookie(savedState, returnedState, session.user.sub)) {
    cookieStore.delete(STATE_COOKIE);
    return Response.json({ error: "HMRC authorization state did not match. Please try linking again." }, { status: 400 });
  }

  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
  cookieStore.delete("code");

  if (authError) {
    const errorCode = req.nextUrl.searchParams.get("error_code");
    console.error("HMRC authorization was denied", { error: authError, errorCode });
    return Response.json({ error: "HMRC authorization was not completed. Please try linking again." }, { status: 400 });
  }

  if (!code) {
    return Response.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    const user = await ensureAppUser(session.user);
    const tokenResult = await requestUserAccessToken(code);
    if (!tokenResult.ok) {
      console.error("HMRC authorization-code exchange failed", {
        status: tokenResult.status,
      });
      return Response.json({ error: "HMRC could not complete authorization." }, { status: tokenResult.status });
    }

    await saveHmrcTokens(user.id, tokenResult.tokens);
  } catch (error) {
    console.error("Unable to store HMRC authorization", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Unable to securely save your HMRC authorization." }, { status: 500 });
  }

  const appOrigin = new URL(HMRC_CONFIG.redirectUri).origin;
  return NextResponse.redirect(new URL("/account", appOrigin));
}
