import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { isIsoDate, isUuid, parseDigitalRecordInput } from "@/lib/digitalRecords";
import {
  findRecordBusiness,
  getRecordUser,
  logRecordRouteError,
  RECORD_COLUMNS,
  withRecordTransaction,
} from "@/lib/digitalRecordsServer";
import { readJsonRecord } from "@/app/api/utils/hmrcValidation";

export async function GET(request: NextRequest) {
  const auth = await getRecordUser();
  if (!auth.ok) return auth.response;

  const url = request.nextUrl;
  const businessId = url.searchParams.get("businessId");
  const fromDate = url.searchParams.get("fromDate");
  const toDate = url.searchParams.get("toDate");
  const limitValue = Number(url.searchParams.get("limit") ?? "50");
  const offsetValue = Number(url.searchParams.get("offset") ?? "0");

  if (
    (businessId !== null && !isUuid(businessId))
    || (fromDate !== null && !isIsoDate(fromDate))
    || (toDate !== null && !isIsoDate(toDate))
    || (fromDate !== null && toDate !== null && fromDate > toDate)
    || !Number.isInteger(limitValue)
    || limitValue < 1
    || limitValue > 100
    || !Number.isInteger(offsetValue)
    || offsetValue < 0
    || offsetValue > 100000
  ) {
    return NextResponse.json({ error: "Record filters are invalid" }, { status: 400 });
  }

  const values: unknown[] = [auth.userId];
  const predicates = ["user_id = $1", "archived_at IS NULL"];
  for (const [column, value] of [
    ["record_business_id =", businessId],
    ["record_date >=", fromDate],
    ["record_date <=", toDate],
  ] as const) {
    if (value !== null) {
      values.push(value);
      predicates.push(`${column} $${values.length}`);
    }
  }
  values.push(limitValue + 1, offsetValue);

  try {
    const result = await pool.query(
      `
        SELECT ${RECORD_COLUMNS}
        FROM public.digital_records
        WHERE ${predicates.join(" AND ")}
        ORDER BY record_date DESC, id DESC
        LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    );
    const hasMore = result.rows.length > limitValue;
    return NextResponse.json({
      records: hasMore ? result.rows.slice(0, limitValue) : result.rows,
      nextOffset: hasMore ? offsetValue + limitValue : null,
    });
  } catch (error) {
    await logRecordRouteError("list", error);
    return NextResponse.json({ error: "Unable to load digital records" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getRecordUser();
  if (!auth.ok) return auth.response;
  const parsed = await readJsonRecord(request);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const businessId = parsed.value.recordBusinessId;
  if (!isUuid(businessId)) {
    return NextResponse.json({ error: "A verified HMRC business is required" }, { status: 400 });
  }
  let business;
  try {
    business = await findRecordBusiness(auth.userId, businessId);
  } catch (error) {
    await logRecordRouteError("business lookup", error);
    return NextResponse.json({ error: "Unable to verify this HMRC business" }, { status: 500 });
  }
  if (!business) {
    return NextResponse.json({ error: "HMRC business was not found for this account" }, { status: 404 });
  }

  const recordInput = parseDigitalRecordInput(parsed.value, business.type_of_business);
  if (!recordInput.ok) return NextResponse.json({ error: recordInput.error }, { status: 400 });
  const record = recordInput.value;

  try {
    const created = await withRecordTransaction(async (client) => {
      const result = await client.query(
        `
          INSERT INTO public.digital_records (
            user_id, record_business_id, record_date, record_type, category, description,
            source_amount, source_currency, amount_gbp, exchange_rate, exchange_rate_date,
            exchange_rate_source, foreign_property_id, foreign_property_country_code
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING ${RECORD_COLUMNS}
        `,
        [
          auth.userId,
          business.id,
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
      const createdRecord = result.rows[0];
      if (!createdRecord) throw new Error("Database did not return the created record");
      await client.query(
        `
          INSERT INTO public.digital_record_history
            (user_id, digital_record_id, record_version, action, snapshot)
          VALUES ($1, $2, $3, 'created', $4::jsonb)
        `,
        [auth.userId, createdRecord.id, createdRecord.version, JSON.stringify(createdRecord)],
      );
      return createdRecord;
    });
    return NextResponse.json({ record: created }, { status: 201 });
  } catch (error) {
    await logRecordRouteError("create", error);
    return NextResponse.json({ error: "Unable to save digital record" }, { status: 500 });
  }
}
