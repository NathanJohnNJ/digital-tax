import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { isUuid } from "@/lib/digitalRecords";
import { getRecordUser, logRecordRouteError } from "@/lib/digitalRecordsServer";

type RouteContext = { params: Promise<{ recordId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await getRecordUser();
  if (!auth.ok) return auth.response;
  const { recordId } = await context.params;
  if (!isUuid(recordId)) return NextResponse.json({ error: "Record ID is invalid" }, { status: 400 });

  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000) {
    return NextResponse.json({ error: "History offset is invalid" }, { status: 400 });
  }

  try {
    const record = await pool.query(
      "SELECT id FROM public.digital_records WHERE user_id = $1 AND id = $2",
      [auth.userId, recordId],
    );
    if (!record.rows[0]) return NextResponse.json({ error: "Digital record not found" }, { status: 404 });

    const result = await pool.query(
      `
        SELECT id, record_version AS "recordVersion", action, snapshot, occurred_at AS "occurredAt"
        FROM public.digital_record_history
        WHERE user_id = $1 AND digital_record_id = $2
        ORDER BY occurred_at DESC, id DESC
        LIMIT 101 OFFSET $3
      `,
      [auth.userId, recordId, offset],
    );
    const hasMore = result.rows.length > 100;
    return NextResponse.json({
      history: hasMore ? result.rows.slice(0, 100) : result.rows,
      nextOffset: hasMore ? offset + 100 : null,
    });
  } catch (error) {
    await logRecordRouteError("history", error);
    return NextResponse.json({ error: "Unable to load digital record history" }, { status: 500 });
  }
}
