import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { findRecordBusiness, getRecordUser, logRecordRouteError, withRecordTransaction } from "@/lib/digitalRecordsServer";
import { isUuid, parseDigitalRecordInput, type DigitalRecordInput } from "@/lib/digitalRecords";
import { RECORD_CSV_FIELDS, parseCsv, type RecordCsvField } from "@/lib/recordCsv";
import { readJsonRecord } from "@/app/api/utils/hmrcValidation";

type ImportRow = { rowNumber: number; record: DigitalRecordInput };
type RowIssue = { rowNumber: number; error: string };

const REQUIRED_MAPPINGS: readonly RecordCsvField[] = [
  "recordDate",
  "recordType",
  "category",
  "sourceAmount",
  "sourceCurrency",
  "amountGbp",
];
const MAX_CSV_LENGTH = 1_000_000;
const MAX_IMPORT_ROWS = 5_000;

function getMapping(value: unknown, headers: string[]): Partial<Record<RecordCsvField, string>> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.some(([field, header]) =>
    !RECORD_CSV_FIELDS.includes(field as RecordCsvField)
    || typeof header !== "string"
    || !headers.includes(header),
  )) return null;
  const mapping = value as Partial<Record<RecordCsvField, string>>;
  if (REQUIRED_MAPPINGS.some((field) => !mapping[field])) return null;
  const mappedHeaders = Object.values(mapping);
  if (new Set(mappedHeaders).size !== mappedHeaders.length) return null;
  return mapping;
}

function cleanOptional(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

async function validateImport(
  body: Record<string, unknown>,
  userId: string,
) {
  if (!isUuid(body.recordBusinessId)) {
    return { ok: false as const, response: NextResponse.json({ error: "recordBusinessId is invalid" }, { status: 400 }) };
  }
  if (typeof body.csvText !== "string" || body.csvText.length > MAX_CSV_LENGTH) {
    return { ok: false as const, response: NextResponse.json({ error: `csvText must be a string of at most ${MAX_CSV_LENGTH} characters` }, { status: 400 }) };
  }
  let csv: ReturnType<typeof parseCsv>;
  try {
    csv = parseCsv(body.csvText.replace(/^\uFEFF/, ""));
  } catch (error) {
    return { ok: false as const, response: NextResponse.json({ error: error instanceof Error ? error.message : "CSV is invalid" }, { status: 400 }) };
  }
  if (csv.rows.length === 0 || csv.rows.length > MAX_IMPORT_ROWS) {
    return { ok: false as const, response: NextResponse.json({ error: `CSV must contain between 1 and ${MAX_IMPORT_ROWS} data rows` }, { status: 400 }) };
  }
  const mapping = getMapping(body.columnMap, csv.headers);
  if (!mapping) {
    return {
      ok: false as const,
      response: NextResponse.json({
        error: "columnMap must map each required record field to a unique CSV header",
        requiredFields: REQUIRED_MAPPINGS,
      }, { status: 400 }),
    };
  }
  const business = await findRecordBusiness(userId, body.recordBusinessId);
  if (!business) {
    return { ok: false as const, response: NextResponse.json({ error: "Verified HMRC business not found" }, { status: 404 }) };
  }

  const errors: RowIssue[] = [];
  const rows: ImportRow[] = [];
  const firstSeen = new Map<string, number>();
  for (const csvRow of csv.rows) {
    const values = Object.fromEntries(
      RECORD_CSV_FIELDS.flatMap((field) => {
        const header = mapping[field];
        if (!header) return [];
        return [[field, csvRow.values[csv.headers.indexOf(header)] ?? ""]];
      }),
    );
    const record = parseDigitalRecordInput({
      recordDate: values.recordDate,
      recordType: values.recordType,
      category: values.category,
      description: values.description ?? "",
      sourceAmount: values.sourceAmount,
      sourceCurrency: values.sourceCurrency,
      amountGbp: values.amountGbp,
      exchangeRate: cleanOptional(values.exchangeRate),
      exchangeRateDate: cleanOptional(values.exchangeRateDate),
      exchangeRateSource: cleanOptional(values.exchangeRateSource),
      foreignPropertyId: cleanOptional(values.foreignPropertyId),
      foreignPropertyCountryCode: cleanOptional(values.foreignPropertyCountryCode)?.toUpperCase() ?? null,
    }, business.type_of_business);
    if (!record.ok) {
      errors.push({ rowNumber: csvRow.rowNumber, error: record.error });
      continue;
    }
    const duplicateKey = JSON.stringify(record.value);
    const previousRow = firstSeen.get(duplicateKey);
    if (previousRow !== undefined) {
      errors.push({ rowNumber: csvRow.rowNumber, error: `Duplicate of CSV row ${previousRow}` });
      continue;
    }
    firstSeen.set(duplicateKey, csvRow.rowNumber);
    rows.push({ rowNumber: csvRow.rowNumber, record: record.value });
  }
  if (errors.length) {
    return { ok: false as const, response: NextResponse.json({ error: "CSV contains invalid rows", rowErrors: errors }, { status: 400 }) };
  }

  const contentHash = createHash("sha256").update(JSON.stringify({
    recordBusinessId: body.recordBusinessId,
    csvText: body.csvText.replace(/^\uFEFF/, ""),
    columnMap: Object.fromEntries(RECORD_CSV_FIELDS.flatMap((field) => mapping[field] ? [[field, mapping[field]]] : [])),
  })).digest("hex");
  return { ok: true as const, business, rows, contentHash };
}

function duplicateRowsJson(rows: ImportRow[]): string {
  return JSON.stringify(rows.map(({ rowNumber, record }) => ({
    row_number: rowNumber,
    record_date: record.recordDate,
    record_type: record.recordType,
    category: record.category,
    source_amount: record.sourceAmount,
    source_currency: record.sourceCurrency,
  })));
}

export async function POST(request: NextRequest) {
  const auth = await getRecordUser();
  if (!auth.ok) return auth.response;
  const parsed = await readJsonRecord(request);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const mode = parsed.value.mode;
  if (mode !== "preview" && mode !== "commit") {
    return NextResponse.json({ error: "mode must be preview or commit" }, { status: 400 });
  }

  try {
    const validated = await validateImport(parsed.value, auth.userId);
    if (!validated.ok) return validated.response;
    const batchId = mode === "preview" ? randomUUID() : parsed.value.batchId;
    if (!isUuid(batchId)) return NextResponse.json({ error: "batchId is invalid" }, { status: 400 });

    if (mode === "commit" && parsed.value.contentSha256 !== validated.contentHash) {
      return NextResponse.json({ error: "Import data or mapping changed after preview; preview it again" }, { status: 409 });
    }
    if (mode === "commit") {
      const existing = await pool.query(
        `
          SELECT content_sha256, total_rows, imported_rows
          FROM public.record_import_batches
          WHERE id = $1 AND user_id = $2
        `,
        [batchId, auth.userId],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].content_sha256.trim() !== validated.contentHash) {
          return NextResponse.json({ error: "batchId has already been used for different import data" }, { status: 409 });
        }
        return NextResponse.json({
          batchId,
          totalRows: existing.rows[0].total_rows,
          importedRows: existing.rows[0].imported_rows,
          alreadyCommitted: true,
        });
      }
    }

    const duplicateResult = await pool.query<{ row_number: number }>(
      `
        SELECT DISTINCT imported.row_number
        FROM jsonb_to_recordset($3::jsonb) AS imported(
          row_number integer, record_date date, record_type text, category text,
          source_amount numeric, source_currency text
        )
        JOIN public.digital_records existing
          ON existing.record_date = imported.record_date
          AND existing.record_type = imported.record_type
          AND existing.category = imported.category
          AND existing.source_amount = imported.source_amount
          AND existing.source_currency = imported.source_currency
        WHERE existing.user_id = $1 AND existing.record_business_id = $2
        ORDER BY imported.row_number
      `,
      [auth.userId, validated.business.id, duplicateRowsJson(validated.rows)],
    );
    const possibleDuplicates = duplicateResult.rows.map((row) => row.row_number);

    if (mode === "preview") {
      return NextResponse.json({
        batchId,
        contentSha256: validated.contentHash,
        totalRows: validated.rows.length,
        validRows: validated.rows.length,
        rows: validated.rows,
        possibleDuplicates,
        requiresDuplicateConfirmation: possibleDuplicates.length > 0,
      });
    }
    if (possibleDuplicates.length && parsed.value.confirmPossibleDuplicates !== true) {
      return NextResponse.json({
        error: "Confirm possible existing duplicates before importing",
        possibleDuplicates,
      }, { status: 409 });
    }
    const fileName = parsed.value.fileName;
    if (fileName !== undefined && (typeof fileName !== "string" || fileName.length > 255)) {
      return NextResponse.json({ error: "fileName must be 255 characters or fewer" }, { status: 400 });
    }

    const committed = await withRecordTransaction(async (client) => {
      const batch = await client.query(
        `
          INSERT INTO public.record_import_batches
            (id, user_id, record_business_id, status, source_file_name, content_sha256, total_rows, imported_rows)
          VALUES ($1, $2, $3, 'committed', $4, $5, $6, $6)
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        `,
        [batchId, auth.userId, validated.business.id, fileName ?? null, validated.contentHash, validated.rows.length],
      );
      if (!batch.rows[0]) {
        const existing = await client.query(
          "SELECT content_sha256, total_rows, imported_rows FROM public.record_import_batches WHERE id = $1 AND user_id = $2",
          [batchId, auth.userId],
        );
        if (!existing.rows[0]) return { kind: "conflict" as const };
        if (existing.rows[0].content_sha256.trim() !== validated.contentHash) return { kind: "conflict" as const };
        return {
          kind: "already-committed" as const,
          totalRows: existing.rows[0].total_rows,
          importedRows: existing.rows[0].imported_rows,
        };
      }

      const sourceData = JSON.stringify(validated.rows.map(({ rowNumber, record }) => ({
        row_number: rowNumber,
        ...record,
      })));
      const inserted = await client.query<{ row_number: number; id: string }>(
        `
          WITH source AS (
            SELECT * FROM jsonb_to_recordset($3::jsonb) AS item(
              row_number integer, "recordDate" date, "recordType" text, category text,
              description text, "sourceAmount" numeric, "sourceCurrency" char(3),
              "amountGbp" numeric, "exchangeRate" numeric, "exchangeRateDate" date,
              "exchangeRateSource" text, "foreignPropertyId" uuid,
              "foreignPropertyCountryCode" char(3)
            )
          ),
          inserted AS (
            INSERT INTO public.digital_records (
              user_id, record_business_id, record_date, record_type, category, description,
              source_amount, source_currency, amount_gbp, exchange_rate, exchange_rate_date,
              exchange_rate_source, foreign_property_id, foreign_property_country_code
            )
            SELECT $1, $2, source."recordDate", source."recordType", source.category, source.description,
              source."sourceAmount", source."sourceCurrency", source."amountGbp", source."exchangeRate",
              source."exchangeRateDate", source."exchangeRateSource", source."foreignPropertyId",
              source."foreignPropertyCountryCode"
            FROM source
            RETURNING id, record_date, record_type, category, description, source_amount,
              source_currency, amount_gbp, exchange_rate, exchange_rate_date, exchange_rate_source,
              foreign_property_id, foreign_property_country_code, version
          ),
          matched AS (
            SELECT source.row_number, inserted.id, inserted.version,
              jsonb_build_object('after', to_jsonb(inserted), 'importBatchId', $4::text) AS snapshot
            FROM source
            JOIN inserted
              ON inserted.record_date = source."recordDate"
              AND inserted.record_type = source."recordType"
              AND inserted.category = source.category
              AND inserted.description = source.description
              AND inserted.source_amount = source."sourceAmount"
              AND inserted.source_currency = source."sourceCurrency"
              AND inserted.amount_gbp = source."amountGbp"
              AND inserted.exchange_rate IS NOT DISTINCT FROM source."exchangeRate"
              AND inserted.exchange_rate_date IS NOT DISTINCT FROM source."exchangeRateDate"
              AND inserted.exchange_rate_source IS NOT DISTINCT FROM source."exchangeRateSource"
              AND inserted.foreign_property_id IS NOT DISTINCT FROM source."foreignPropertyId"
              AND inserted.foreign_property_country_code IS NOT DISTINCT FROM source."foreignPropertyCountryCode"
          ),
          history AS (
            INSERT INTO public.digital_record_history
              (user_id, digital_record_id, record_version, action, snapshot)
            SELECT $1, matched.id, matched.version, 'created', matched.snapshot
            FROM matched
            RETURNING digital_record_id
          )
          SELECT matched.row_number, matched.id::text
          FROM matched JOIN history ON history.digital_record_id = matched.id
          ORDER BY matched.row_number
        `,
        [auth.userId, validated.business.id, sourceData, batchId],
      );
      if (inserted.rows.length !== validated.rows.length) {
        throw new Error("CSV import did not create one record for each validated row");
      }
      await client.query(
        `
          INSERT INTO public.record_import_rows
            (batch_id, user_id, row_number, outcome, normalized_data, digital_record_id)
          SELECT $1, $2, item.row_number, 'imported', item.normalized_data, item.digital_record_id
          FROM jsonb_to_recordset($3::jsonb) AS item(
            row_number integer, normalized_data jsonb, digital_record_id uuid
          )
        `,
        [
          batchId,
          auth.userId,
          JSON.stringify(inserted.rows.map(({ row_number, id }) => ({
            row_number,
            normalized_data: validated.rows.find((row) => row.rowNumber === row_number)?.record,
            digital_record_id: id,
          }))),
        ],
      );
      return { kind: "committed" as const };
    });

    if (committed.kind === "conflict") {
      return NextResponse.json({ error: "batchId has already been used for a different or unavailable import" }, { status: 409 });
    }
    return NextResponse.json({
      batchId,
      totalRows: validated.rows.length,
      importedRows: validated.rows.length,
      alreadyCommitted: committed.kind === "already-committed",
    }, { status: committed.kind === "already-committed" ? 200 : 201 });
  } catch (error) {
    await logRecordRouteError("import", error);
    return NextResponse.json({ error: "Unable to import digital records" }, { status: 500 });
  }
}
