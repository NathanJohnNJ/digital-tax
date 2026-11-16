import { getCurrentHmrcAccessToken } from "@/lib/hmrcTokens";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await getCurrentHmrcAccessToken({ forceRefresh: true });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true });
}
