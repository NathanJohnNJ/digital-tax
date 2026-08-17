import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies } from 'next/headers';

const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const { selected } = await req.json();
  console.log(selected);

  const options = {
    httpOnly: true,
    secure: true,
    maxAge: COOKIE_MAX_AGE_SECONDS
  };

  const cookieValue = JSON.stringify(selected);
  cookieStore.set('allow_cookies', cookieValue, options);

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  try {
    await pool.query(
      `
      UPDATE users
      SET allow_cookies = $1
      WHERE auth_id = $2
      `,
      [JSON.stringify(selected), id]
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  return NextResponse.json({ status: 200 });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const cookieStore = await cookies();

  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  try {
    const response = await pool.query(
      `
      SELECT allow_cookies FROM users
      WHERE auth_id = $1
      `,
      [id]
    );

    const options = {
      httpOnly: true,
      secure: true,
      maxAge: COOKIE_MAX_AGE_SECONDS
    };

    const rawAllowCookies = response.rows[0]?.allow_cookies;
    const parsedAllowCookies = typeof rawAllowCookies === 'string' ? rawAllowCookies : JSON.stringify(rawAllowCookies ?? false);
    cookieStore.set('allow_cookies', parsedAllowCookies, options);

    return NextResponse.json({ status: 200, allowCookies: parsedAllowCookies });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }
}