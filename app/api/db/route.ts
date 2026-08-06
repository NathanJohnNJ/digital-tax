import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";


export async function POST(req: NextRequest){
  const { niInput, sub } = await req.json();
  try {
    await pool.query(
      `
      UPDATE users
      SET ni_number = $1
      WHERE auth_id = $2
      `,
      [niInput, sub]
    );
  }catch(error){
    console.log(error);
  }
  return NextResponse.json({status: 200})
}

export async function GET(req: NextRequest) {
  const sub = req.nextUrl.searchParams.get('id')
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE auth_id = $1",
    [sub]
  );
  return NextResponse.json(rows[0]);
}