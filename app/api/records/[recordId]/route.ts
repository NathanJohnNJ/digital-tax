import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { isUuid, parseDigitalRecordInput } from "@/lib/digitalRecords";
import {
  findRecordBusiness,
  getRecordUser,
  logRecordRouteError,
  RECORD_COLUMNS,
  withRecordTransaction,
} from "@/lib/digitalRecordsServer";
import { readJsonRecord } from "@/app/api/utils/hmrcValidation";

type RouteContext = { params: Promise<{ recordId: string }> };

function expectedVersion(request: Request): number | null {
  const value = request.headers.get("if-match");
  const match = value && /^"([1-9]\d*)"$/.exec(value);
  return match ? Number(match[1]) : null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await getRecordUser();
  if (!auth.ok) return auth.response;
  const { recordId } = await context.params;
  if (!isUuid(recordId)) return NextResponse.json({ error: "Record ID is invalid" }, { status: 400 });

  try {
    const result = await pool.query(
      `
        SELECT ${RECORD_COLUMNS}
        FROM public.digital_records
        WHERE user_id = $1 AND id = $2 AND archived_at IS NULL
      `,
      [auth.userId, recordId],
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Digital record not found" }, { status: 404 });
    return NextResponse.json(
      { record: result.rows[0] },
      { headers: { ETag: `"${result.rows[0].version}"` } },
    );
  } catch (error) {
    await logRecordRouteError("read", error);
    return NextResponse.json({ error: "Unable to load digital record" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await getRecordUser();
  if (!auth.ok) return auth.response;
  const { recordId } = await context.params;
  if (!isUuid(recordId)) return NextResponse.json({ error: "Record ID is invalid" }, { status: 400 });
  const version = expectedVersion(request);
  if (version === null) {
    return NextResponse.json({ error: "If-Match with the current record version is required" }, { status: 428 });
  }
  const parsed = await readJsonRecord(request);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const updated = await withRecordTransaction(async (client) => {
      const currentResult = await client.query(
        `
          SELECT ${RECORD_COLUMNS}
          FROM public.digital_records
          WHERE user_id = $1 AND id = $2 AND archived_at IS NULL
          FOR UPDATE
        `,
        [auth.userId, recordId],
      );
      const current = currentResult.rows[0];
      if (!current) return { kind: "not-found" as const };
      if (current.version !== version) return { kind: "conflict" as const };

      const business = await findRecordBusiness(auth.userId, current.recordBusinessId, client);
      if (!business) throw new Error("Digital record is not attached to an active HMRC business");
      const recordInput = parseDigitalRecordInput(
        { ...current, ...parsed.value },
        business.type_of_business,
      );
      if (!recordInput.ok) return { kind: "invalid" as const, error: recordInput.error };
      const record = recordInput.value;
      const result = await client.query(
        `
          UPDATE public.digital_records
          SET record_date = $3,
              record_type = $4,
              category = $5,
              description = $6,
              source_amount = $7,
              source_currency = $8,
              amount_gbp = $9,
              exchange_rate = $10,
              exchange_rate_date = $11,
              exchange_rate_source = $12,
              foreign_property_id = $13,
              foreign_property_country_code = $14,
              version = version + 1,
              updated_at = now()
          WHERE user_id = $1 AND id = $2
          RETURNING ${RECORD_COLUMNS}
        `,
        [
          auth.userId,
          recordId,
          record.recordDate,
          record.recordType,
          record.category,
          record.description,
          record.sourceAmount,
          record.sourceCurrency,
          record.amountGbp,
          record.exchangeRate,
          record.exchangeRateDate,
          record.exchangeRateSource,
          record.foreignPropertyId,
          record.foreignPropertyCountryCode,
        ],
      );
      const updatedRecord = result.rows[0];
      if (!updatedRecord) throw new Error("Database did not return the updated record");
      await client.query(
        `
          INSERT INTO public.digital_record_history
            (user_id, digital_record_id, record_version, action, snapshot)
          VALUES ($1, $2, $3, 'updated', $4::jsonb)
        `,
        [
          auth.userId,
          recordId,
          updatedRecord.version,
          JSON.stringify({ before: current, after: updatedRecord }),
        ],
      );
      return { kind: "updated" as const, record: updatedRecord };
    });

    if (updated.kind === "not-found") {
      return NextResponse.json({ error: "Digital record not found" }, { status: 404 });
    }
    if (updated.kind === "conflict") {
      return NextResponse.json({ error: "Digital record changed; reload it before saving" }, { status: 412 });
    }
    if (updated.kind === "invalid") {
      return NextResponse.json({ error: updated.error }, { status: 400 });
    }
    return NextResponse.json(
      { record: updated.record },
      { headers: { ETag: `"${updated.record.version}"` } },
    );
  } catch (error) {
    await logRecordRouteError("update", error);
    return NextResponse.json({ error: "Unable to update digital record" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await getRecordUser();
  if (!auth.ok) return auth.response;
  const { recordId } = await context.params;
  if (!isUuid(recordId)) return NextResponse.json({ error: "Record ID is invalid" }, { status: 400 });
  const version = expectedVersion(request);
  if (version === null) {
    return NextResponse.json({ error: "If-Match with the current record version is required" }, { status: 428 });
  }

  try {
    const archived = await withRecordTransaction(async (client) => {
      const currentResult = await client.query(
        `
          SELECT ${RECORD_COLUMNS}
          FROM public.digital_records
          WHERE user_id = $1 AND id = $2 AND archived_at IS NULL
          FOR UPDATE
        `,
        [auth.userId, recordId],
      );
      const current = currentResult.rows[0];
      if (!current) return { kind: "not-found" as const };
      if (current.version !== version) return { kind: "conflict" as const };
      const result = await client.query(
        `
          UPDATE public.digital_records
          SET archived_at = now(), version = version + 1, updated_at = now()
          WHERE user_id = $1 AND id = $2
          RETURNING ${RECORD_COLUMNS}
        `,
        [auth.userId, recordId],
      );
      const archivedRecord = result.rows[0];
      if (!archivedRecord) throw new Error("Database did not return the archived record");
      await client.query(
        `
          INSERT INTO public.digital_record_history
            (user_id, digital_record_id, record_version, action, snapshot)
          VALUES ($1, $2, $3, 'archived', $4::jsonb)
        `,
        [auth.userId, recordId, archivedRecord.version, JSON.stringify({ before: current, after: archivedRecord })],
      );
      return { kind: "archived" as const };
    });

    if (archived.kind === "not-found") {
      return NextResponse.json({ error: "Digital record not found" }, { status: 404 });
    }
    if (archived.kind === "conflict") {
      return NextResponse.json({ error: "Digital record changed; reload it before archiving" }, { status: 412 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    await logRecordRouteError("archive", error);
    return NextResponse.json({ error: "Unable to archive digital record" }, { status: 500 });
  }
}
