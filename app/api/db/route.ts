import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthenticatedAppUser } from "@/lib/appUser";
import { isValidNino } from "@/app/api/utils/hmrcValidation";

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof getAuthenticatedAppUser>>;
  try {
    user = await getAuthenticatedAppUser();
  } catch (error) {
    console.error("Authenticated user lookup failed for the database update", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Unable to load account details" }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }
  const nino = (body as Record<string, unknown>).nino;
  if (!isValidNino(nino)) {
    return NextResponse.json({ error: "A valid National Insurance number is required" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `
      UPDATE public.users
      SET ni_number = $1
      WHERE id = $2
      `,
      [nino, user.id],
    );
    if (result.rowCount !== 1) {
      return NextResponse.json({ error: "User record was not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("User National Insurance number update failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Unable to update account details" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  let user: Awaited<ReturnType<typeof getAuthenticatedAppUser>>;
  try {
    user = await getAuthenticatedAppUser();
  } catch (error) {
    console.error("Authenticated user lookup failed for the database read", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Unable to load account details" }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await pool.query<{ ni_number: string | null }>(
      "SELECT ni_number FROM public.users WHERE id = $1",
      [user.id],
    );
    if (!rows[0]) {
      return NextResponse.json({ error: "User record was not found" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("User account details lookup failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Unable to load account details" }, { status: 500 });
  }
}