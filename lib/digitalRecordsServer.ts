import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getAuthenticatedAppUser } from "@/lib/appUser";
import { pool } from "@/lib/db";
import type { RecordBusinessType } from "@/lib/digitalRecords";

export const RECORD_COLUMNS = `
  id::text AS id,
  record_business_id::text AS "recordBusinessId",
  record_date AS "recordDate",
  record_type AS "recordType",
  category,
  description,
  source_amount::text AS "sourceAmount",
  source_currency AS "sourceCurrency",
  amount_gbp::text AS "amountGbp",
  exchange_rate::text AS "exchangeRate",
  exchange_rate_date AS "exchangeRateDate",
  exchange_rate_source AS "exchangeRateSource",
  foreign_property_id::text AS "foreignPropertyId",
  foreign_property_country_code AS "foreignPropertyCountryCode",
  version,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export async function getRecordUser(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  try {
    const user = await getAuthenticatedAppUser();
    if (!user) {
      return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { ok: true, userId: user.id };
  } catch (error) {
    console.error("Digital record authentication failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      ok: false,
      response: NextResponse.json({ error: "Unable to authenticate this request" }, { status: 500 }),
    };
  }
}

export async function withRecordTransaction<T>(
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Digital record transaction rollback failed", {
        errorName: rollbackError instanceof Error ? rollbackError.name : "UnknownError",
      });
    }
    throw error;
  } finally {
    client.release();
  }
}

export type RecordBusiness = {
  id: string;
  type_of_business: RecordBusinessType;
  hmrc_business_id: string;
};

export async function findRecordBusiness(
  userId: string,
  businessId: string,
  client: Pick<PoolClient, "query"> | typeof pool = pool,
): Promise<RecordBusiness | null> {
  const result = await client.query<RecordBusiness>(
    `
      SELECT id::text, type_of_business, hmrc_business_id
      FROM public.record_businesses
      WHERE user_id = $1 AND id = $2 AND is_active = true
    `,
    [userId, businessId],
  );
  return result.rows[0] ?? null;
}

export async function logRecordRouteError(operation: string, error: unknown): Promise<void> {
  console.error(`Digital record ${operation} failed`, {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
}
