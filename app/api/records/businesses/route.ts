import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getRecordUser, logRecordRouteError } from "@/lib/digitalRecordsServer";

export async function GET(request: NextRequest) {
  const auth = await getRecordUser();
  if (!auth.ok) return auth.response;

  const includeInactive = request.nextUrl.searchParams.get("includeInactive");
  if (includeInactive !== null && includeInactive !== "true") {
    return NextResponse.json({ error: "Business filter is invalid" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `
        SELECT id::text AS "recordBusinessId",
               hmrc_business_id AS "hmrcBusinessId",
               type_of_business AS "typeOfBusiness",
               trading_name AS "tradingName",
               is_active AS "isActive",
               last_synced_at AS "lastSyncedAt"
        FROM public.record_businesses
        WHERE user_id = $1 AND ($2::boolean OR is_active = true)
        ORDER BY type_of_business, trading_name NULLS LAST, hmrc_business_id
      `,
      [auth.userId, includeInactive === "true"],
    );
    return NextResponse.json({ businesses: result.rows });
  } catch (error) {
    await logRecordRouteError("business list", error);
    return NextResponse.json({ error: "Unable to load your HMRC businesses" }, { status: 500 });
  }
}
