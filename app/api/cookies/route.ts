import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies } from 'next/headers';

export async function POST(req: NextRequest){
  const cookieStore = await cookies();
  const { selected } = await req.json();
  console.log(selected)
  const options = {
    httpOnly: true,
    secure: true, 
    maxAge: 7 * 86400
  }
  cookieStore.set('allow_cookies', JSON.stringify(selected), options);
  
  const id = req.nextUrl.searchParams.get('id');
  if(!id) return;
  try {
    await pool.query(
      `
      UPDATE users
      SET allow_cookies = $1
      WHERE auth_id = $2
      `,
      [JSON.stringify(selected), id]
    );
  }catch(error){
    console.log(error);
    NextResponse.json({ error: "DB update failed" }, { status: 500 })
  }
  return NextResponse.json({status: 200})
}

export async function GET(req: NextRequest){
  const id = req.nextUrl.searchParams.get('id')
  const cookieStore = await cookies();
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
      maxAge: 7 * 86400000
    }
    const allowCookies = response.rows[0].allow_cookies;
    cookieStore.set('allow_cookies', allowCookies, options);
    return NextResponse.json({status: 200}, allowCookies)
  }catch(error){
    console.log(error);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 })
  }
}