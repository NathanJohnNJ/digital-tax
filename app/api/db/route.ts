import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest){
  const { nino, sub } = await req.json();
  try {
    await pool.query(
      `
      UPDATE users
      SET ni_number = $1
      WHERE auth_id = $2
      `,
      [nino, sub]
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  return NextResponse.json({ status: 200 });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE auth_id = $1",
    [id]
  );
  return NextResponse.json(rows[0]);
}