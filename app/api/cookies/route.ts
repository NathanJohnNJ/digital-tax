import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies } from 'next/headers';
import { getAuthenticatedAppUser } from "@/lib/appUser";

const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof getAuthenticatedAppUser>>;
  try {
    user = await getAuthenticatedAppUser();
  } catch (error) {
    console.error("Authenticated user lookup failed for cookie preferences", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Unable to load account preferences" }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }
  const selected = (body as Record<string, unknown>).selected;
  if (!Array.isArray(selected) || !selected.every((item) => typeof item === "string")) {
    return NextResponse.json({ error: "Cookie preferences must be a list of strings" }, { status: 400 });
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_SECONDS
  };

  const cookieValue = JSON.stringify(selected);
  cookieStore.set('allow_cookies', cookieValue, options);

  try {
    await pool.query(
      `
      UPDATE public.users
      SET allow_cookies = $1
      WHERE id = $2
      `,
      [JSON.stringify(selected), user.id]
    );
  } catch (error) {
    console.error("Cookie preferences update failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Unable to save cookie preferences" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  let user: Awaited<ReturnType<typeof getAuthenticatedAppUser>>;
  try {
    user = await getAuthenticatedAppUser();
  } catch (error) {
    console.error("Authenticated user lookup failed for cookie preferences", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Unable to load account preferences" }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();

  try {
    const response = await pool.query(
      `
      SELECT allow_cookies FROM public.users
      WHERE id = $1
      `,
      [user.id]
    );

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE_SECONDS
    };

    const rawAllowCookies = response.rows[0]?.allow_cookies;
    const parsedAllowCookies = typeof rawAllowCookies === 'string' ? rawAllowCookies : JSON.stringify(rawAllowCookies ?? false);
    cookieStore.set('allow_cookies', parsedAllowCookies, options);

    return NextResponse.json({ status: 200, allowCookies: parsedAllowCookies });
  } catch (error) {
    console.error("Cookie preferences lookup failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Unable to load cookie preferences" }, { status: 500 });
  }
}