import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { isUuid } from "@/lib/digitalRecords";
import { getRecordUser, logRecordRouteError, withRecordTransaction } from "@/lib/digitalRecordsServer";
import { readJsonRecord } from "@/app/api/utils/hmrcValidation";

type RouteContext = { params: Promise<{ batchId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await getRecordUser();
  if (!auth.ok) return auth.response;
  const { batchId } = await context.params;
  if (!isUuid(batchId)) return NextResponse.json({ error: "Import batch ID is invalid" }, { status: 400 });

  try {
    const result = await pool.query(
      `
        SELECT b.id, b.record_business_id AS "recordBusinessId",
               b.status, b.source_file_name AS "sourceFileName",
               b.total_rows AS "totalRows", b.imported_rows AS "importedRows",
               b.created_at AS "createdAt",
               COALESCE(jsonb_agg(jsonb_build_object(
                 'rowNumber', i.row_number,
                 'outcome', i.outcome,
                 'normalizedData', i.normalized_data,
                 'error', i.error,
                 'recordId', i.digital_record_id,
                 'archivedAt', r.archived_at
               ) ORDER BY i.row_number) FILTER (WHERE i.row_number IS NOT NULL), '[]'::jsonb) AS rows
        FROM public.record_import_batches b
        LEFT JOIN public.record_import_rows i
          ON i.batch_id = b.id AND i.user_id = b.user_id
        LEFT JOIN public.digital_records r
          ON r.id = i.digital_record_id AND r.user_id = i.user_id
        WHERE b.id = $1 AND b.user_id = $2
        GROUP BY b.id
      `,
      [batchId, auth.userId],
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
    return NextResponse.json({ batch: result.rows[0] });
  } catch (error) {
    await logRecordRouteError("import batch read", error);
    return NextResponse.json({ error: "Unable to load import batch" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await getRecordUser();
  if (!auth.ok) return auth.response;
  const { batchId } = await context.params;
  if (!isUuid(batchId)) return NextResponse.json({ error: "Import batch ID is invalid" }, { status: 400 });
  const parsed = await readJsonRecord(request);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (parsed.value.confirm !== true) {
    return NextResponse.json({ error: "Set confirm to true to archive unchanged records from this import" }, { status: 400 });
  }

  try {
    const result = await withRecordTransaction(async (client) => {
      const batch = await client.query(
        "SELECT id, total_rows FROM public.record_import_batches WHERE id = $1 AND user_id = $2 FOR UPDATE",
        [batchId, auth.userId],
      );
      if (!batch.rows[0]) return { kind: "not-found" as const };

      const archived = await client.query<{ archived_rows: number }>(
        `
          WITH targets AS MATERIALIZED (
            SELECT r.*
            FROM public.record_import_rows i
            JOIN public.digital_records r
              ON r.id = i.digital_record_id AND r.user_id = i.user_id
            WHERE i.batch_id = $1
              AND i.user_id = $2
              AND i.outcome = 'imported'
              AND r.archived_at IS NULL
              AND r.version = 1
            FOR UPDATE OF r
          ),
          archived AS (
            UPDATE public.digital_records r
            SET archived_at = now(), version = r.version + 1, updated_at = now()
            FROM targets
            WHERE r.id = targets.id AND r.user_id = targets.user_id
            RETURNING r.*
          ),
          history AS (
            INSERT INTO public.digital_record_history
              (user_id, digital_record_id, record_version, action, snapshot)
            SELECT archived.user_id, archived.id, archived.version, 'archived',
              jsonb_build_object(
                'before', to_jsonb(targets),
                'after', to_jsonb(archived),
                'importBatchId', $1::text
              )
            FROM archived
            JOIN targets ON targets.id = archived.id
            RETURNING digital_record_id
          )
          SELECT count(*)::integer AS archived_rows FROM history
        `,
        [batchId, auth.userId],
      );
      return {
        kind: "archived" as const,
        archivedRows: archived.rows[0]?.archived_rows ?? 0,
        totalRows: batch.rows[0].total_rows,
      };
    });

    if (result.kind === "not-found") {
      return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
    }
    return NextResponse.json({
      batchId,
      archivedRows: result.archivedRows,
      skippedRows: result.totalRows - result.archivedRows,
    });
  } catch (error) {
    await logRecordRouteError("import batch undo", error);
    return NextResponse.json({ error: "Unable to archive imported records" }, { status: 500 });
  }
}
