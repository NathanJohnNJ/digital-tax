import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db";


export async function POST(req: NextRequest){
  const { niInput, sub } = await req.json();
  const client = createClient();
    await client.connect();
    await client.query(
      `
      UPDATE users
      SET ni_number = $1
      WHERE auth_id = $2
      `,
      [niInput, sub]
    );
    await client.end();
    return NextResponse.json({status: 200})
}