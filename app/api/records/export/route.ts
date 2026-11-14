import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { isIsoDate, isUuid } from "@/lib/digitalRecords";
import { getRecordUser, logRecordRouteError } from "@/lib/digitalRecordsServer";
import { isValidTaxYear } from "@/app/api/utils/hmrcValidation";
import { serializeCsvRow } from "@/lib/recordCsv";

const EXPORT_HEADERS = [
  "record_id",
  "record_business_id",
  "hmrc_business_id",
  "business_type",
  "trading_name",
  "record_date",
  "record_type",
  "category",
  "description",
  "source_amount",
  "source_currency",
  "amount_gbp",
  "exchange_rate",
  "exchange_rate_date",
  "exchange_rate_source",
  "foreign_property_id",
  "foreign_property_country_code",
  "version",
  "created_at",
  "updated_at",
  "archived_at",
  "history_json",
  "submission_references_json",
] as const;

const PAGE_SIZE = 500;

function getDateFilter(taxYear: string | null, fromDate: string | null, toDate: string | null) {
  if (taxYear !== null) {
    if (!isValidTaxYear(taxYear) || fromDate !== null || toDate !== null) return null;
    const startYear = Number(taxYear.slice(0, 4));
    return { fromDate: `${startYear}-04-06`, toDate: `${startYear + 1}-04-05` };
  }
  if (
    (fromDate !== null && !isIsoDate(fromDate))
    || (toDate !== null && !isIsoDate(toDate))
    || (fromDate !== null && toDate !== null && fromDate > toDate)
  ) return null;
  return { fromDate, toDate };
}

function createPageQuery(userId: string, businessId: string | null, fromDate: string | null, toDate: string | null, lastId: string | null) {
  const values: unknown[] = [userId];
  const predicates = ["r.user_id = $1"];
  for (const [column, value] of [
    ["r.record_business_id =", businessId],
    ["r.record_date >=", fromDate],
    ["r.record_date <=", toDate],
  ] as const) {
    if (value !== null) {
      values.push(value);
      predicates.push(`${column} $${values.length}`);
    }
  }
  if (lastId) {
    values.push(lastId);
    predicates.push(`r.id > $${values.length}`);
  }
  values.push(PAGE_SIZE);

  return {
    text: `
      SELECT
        r.id::text AS record_id,
        r.record_business_id::text AS record_business_id,
        b.hmrc_business_id,
        b.type_of_business AS business_type,
        b.trading_name,
        r.record_date::text AS record_date,
        r.record_type,
        r.category,
        r.description,
        r.source_amount::text AS source_amount,
        r.source_currency,
        r.amount_gbp::text AS amount_gbp,
        r.exchange_rate::text AS exchange_rate,
        r.exchange_rate_date::text AS exchange_rate_date,
        r.exchange_rate_source,
        r.foreign_property_id::text AS foreign_property_id,
        r.foreign_property_country_code,
        r.version,
        r.created_at,
        r.updated_at,
        r.archived_at,
        COALESCE(history.entries, '[]'::jsonb) AS history_json,
        COALESCE(submissions.entries, '[]'::jsonb) AS submission_references_json
      FROM public.digital_records r
      JOIN public.record_businesses b
        ON b.id = r.record_business_id AND b.user_id = r.user_id
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'version', h.record_version,
          'action', h.action,
          'occurredAt', h.occurred_at,
          'snapshot', h.snapshot
        ) ORDER BY h.occurred_at, h.id) AS entries
        FROM public.digital_record_history h
        WHERE h.user_id = r.user_id AND h.digital_record_id = r.id
      ) history ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'taxYear', s.tax_year,
          'periodStart', s.period_start,
          'periodEnd', s.period_end,
          'outcome', s.outcome,
          'submittedAt', s.created_at,
          'hmrcStatus', s.hmrc_status,
          'correlationId', s.hmrc_correlation_id,
          'recordVersion', i.record_version
        ) ORDER BY s.created_at, s.id) AS entries
        FROM public.record_submission_items i
        JOIN public.record_submission_snapshots s
          ON s.id = i.submission_id AND s.user_id = i.user_id
        WHERE i.user_id = r.user_id AND i.digital_record_id = r.id
      ) submissions ON true
      WHERE ${predicates.join(" AND ")}
      ORDER BY r.id
      LIMIT $${values.length}
    `,
    values,
  };
}

function formatExportRow(row: Record<string, unknown>) {
  return serializeCsvRow(EXPORT_HEADERS.map((header) => row[header]));
}

export async function GET(request: NextRequest) {
  const auth = await getRecordUser();
  if (!auth.ok) return auth.response;
  const params = request.nextUrl.searchParams;
  const businessId = params.get("businessId");
  const taxYear = params.get("taxYear");
  const dates = getDateFilter(taxYear, params.get("fromDate"), params.get("toDate"));
  if ((businessId !== null && !isUuid(businessId)) || dates === null) {
    return NextResponse.json({ error: "Export filters are invalid" }, { status: 400 });
  }

  let firstPage: Record<string, unknown>[];
  try {
    const query = createPageQuery(auth.userId, businessId, dates.fromDate, dates.toDate, null);
    const result = await pool.query(query.text, query.values);
    firstPage = result.rows;
  } catch (error) {
    await logRecordRouteError("export", error);
    return NextResponse.json({ error: "Unable to export digital records" }, { status: 500 });
  }

  let pageIndex = 0;
  let lastRecordId: string | null = null;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (pageIndex === 0) {
          controller.enqueue(new TextEncoder().encode(`${serializeCsvRow(EXPORT_HEADERS)}\r\n`));
        }
        let rows = pageIndex === 0 ? firstPage : [];
        if (pageIndex > 0) {
          const query = createPageQuery(
            auth.userId,
            businessId,
            dates.fromDate,
            dates.toDate,
            lastRecordId,
          );
          const result = await pool.query(query.text, query.values);
          rows = result.rows;
        }
        if (rows.length === 0) {
          controller.close();
          return;
        }
        const output = rows.map(formatExportRow).join("\r\n");
        controller.enqueue(new TextEncoder().encode(`${output}\r\n`));
        lastRecordId = String(rows[rows.length - 1].record_id);
        pageIndex += 1;
        if (rows.length < PAGE_SIZE) controller.close();
      } catch (error) {
        await logRecordRouteError("export stream", error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="digital-records${taxYear ? `-${taxYear}` : ""}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
