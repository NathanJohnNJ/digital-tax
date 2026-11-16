import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH as recordPatch, DELETE as recordDelete } from "@/app/api/records/[recordId]/route";
import { GET as recordHistoryGet } from "@/app/api/records/[recordId]/history/route";
import { GET as recordExportGet } from "@/app/api/records/export/route";
import { GET as recordBusinessesGet } from "@/app/api/records/businesses/route";
import { POST as recordImportPost } from "@/app/api/records/import/route";
import { DELETE as importBatchDelete } from "@/app/api/records/import/[batchId]/route";
import { getAuthenticatedAppUser } from "@/lib/appUser";
import { parseCsv } from "@/lib/recordCsv";

const { clientQueryMock, connectMock, poolQueryMock, releaseMock } = vi.hoisted(() => {
  const clientQueryMock = vi.fn();
  const releaseMock = vi.fn();
  const client = { query: clientQueryMock, release: releaseMock };
  return {
    clientQueryMock,
    connectMock: vi.fn(async () => client),
    poolQueryMock: vi.fn(),
    releaseMock,
  };
});

describe("digital record export", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedAppUser).mockResolvedValue({ id: "123" });
    poolQueryMock.mockReset();
    clientQueryMock.mockReset().mockResolvedValue({ rows: [] });
    connectMock.mockClear();
    releaseMock.mockClear();
  });

  it("streams all pages with the authenticated user's business and tax-year filters", async () => {
    const makeRow = (index: number) => ({
      record_id: String(index).padStart(4, "0"),
      record_business_id: businessId,
      record_date: "2026-04-08",
      description: 'Invoice, "A"',
      history_json: [{ action: "updated", version: 2 }],
      submission_references_json: [{ recordVersion: 1 }],
    });
    clientQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: Array.from({ length: 500 }, (_, index) => makeRow(index)) })
      .mockResolvedValueOnce({ rows: [makeRow(500)] });

    const response = await recordExportGet(new NextRequest(
      `http://localhost/api/records/export?businessId=${businessId}&taxYear=2026-27`,
    ));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    const csv = parseCsv(await response.text());
    expect(csv.rows).toHaveLength(501);
    expect(csv.rows[0].values[csv.headers.indexOf("description")]).toBe('Invoice, "A"');
    expect(JSON.parse(csv.rows[0].values[csv.headers.indexOf("history_json")])).toEqual([{ action: "updated", version: 2 }]);
    expect(JSON.parse(csv.rows[500].values[csv.headers.indexOf("submission_references_json")])).toEqual([{ recordVersion: 1 }]);
    expect(clientQueryMock.mock.calls[0][0]).toBe("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    expect(clientQueryMock.mock.calls[1][0]).toContain("r.user_id = $1");
    expect(clientQueryMock.mock.calls[1][1]).toEqual(["123", businessId, "2026-04-06", "2027-04-05", 500]);
    expect(clientQueryMock.mock.calls[2][1]).toEqual(["123", businessId, "2026-04-06", "2027-04-05", "0499", 500]);
    expect(clientQueryMock).toHaveBeenLastCalledWith("COMMIT");
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it("rejects unauthenticated requests and invalid filters before querying", async () => {
    vi.mocked(getAuthenticatedAppUser).mockResolvedValueOnce(null);
    const unauthorized = await recordExportGet(new NextRequest("http://localhost/api/records/export"));
    expect(unauthorized.status).toBe(401);
    const invalid = await recordExportGet(new NextRequest(
      "http://localhost/api/records/export?taxYear=2026-27&fromDate=2026-04-06",
    ));
    expect(invalid.status).toBe(400);
    expect(poolQueryMock).not.toHaveBeenCalled();
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("rolls back and releases the connection when a download is cancelled", async () => {
    clientQueryMock.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
      rows: Array.from({ length: 500 }, (_, index) => ({ record_id: String(index) })),
    });
    const response = await recordExportGet(new NextRequest("http://localhost/api/records/export"));
    await response.body!.cancel();
    expect(clientQueryMock).toHaveBeenLastCalledWith("ROLLBACK");
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it("fails explicitly and releases the connection when the first export query fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    clientQueryMock.mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(new Error("database unavailable"));
    const response = await recordExportGet(new NextRequest("http://localhost/api/records/export"));
    expect(response.status).toBe(500);
    expect(clientQueryMock).toHaveBeenLastCalledWith("ROLLBACK");
    expect(releaseMock).toHaveBeenCalledOnce();
    log.mockRestore();
  });

  it("fails the download and rolls back if a later page cannot be read", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    clientQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: Array.from({ length: 500 }, (_, index) => ({ record_id: String(index) })) })
      .mockRejectedValueOnce(new Error("database unavailable"));
    const response = await recordExportGet(new NextRequest("http://localhost/api/records/export"));
    await expect(response.text()).rejects.toThrow("database unavailable");
    expect(clientQueryMock).toHaveBeenLastCalledWith("ROLLBACK");
    expect(releaseMock).toHaveBeenCalledOnce();
    log.mockRestore();
  });
  it("only includes inactive businesses when requested and always scopes the list to the user", async () => {
    poolQueryMock.mockResolvedValue({ rows: [] });
    const normal = await recordBusinessesGet(new NextRequest("http://localhost/api/records/businesses"));
    const all = await recordBusinessesGet(new NextRequest("http://localhost/api/records/businesses?includeInactive=true"));
    expect(normal.status).toBe(200);
    expect(all.status).toBe(200);
    expect(poolQueryMock).toHaveBeenNthCalledWith(1, expect.stringContaining("user_id = $1"), ["123", false]);
    expect(poolQueryMock).toHaveBeenNthCalledWith(2, expect.stringContaining("user_id = $1"), ["123", true]);
    const invalid = await recordBusinessesGet(new NextRequest("http://localhost/api/records/businesses?includeInactive=invalid"));
    expect(invalid.status).toBe(400);
    expect(poolQueryMock).toHaveBeenCalledTimes(2);
  });
});

vi.mock("@/lib/db", () => ({
  pool: { connect: connectMock, query: poolQueryMock },
}));
vi.mock("@/lib/appUser", () => ({ getAuthenticatedAppUser: vi.fn() }));

const recordId = "33333333-3333-4333-8333-333333333333";
const businessId = "11111111-1111-4111-8111-111111111111";

const currentRecord = {
  id: recordId,
  recordBusinessId: businessId,
  recordDate: "2026-04-08",
  recordType: "income",
  category: "turnover",
  description: "Customer invoice",
  sourceAmount: "125.50",
  sourceCurrency: "GBP",
  amountGbp: "125.50",
  exchangeRate: null,
  exchangeRateDate: null,
  exchangeRateSource: null,
  foreignPropertyId: null,
  foreignPropertyCountryCode: null,
  version: 1,
  createdAt: "2026-04-08T10:00:00.000Z",
  updatedAt: "2026-04-08T10:00:00.000Z",
};

function patchRequest(body: unknown, version = 1) {
  return new NextRequest(`http://localhost/api/records/${recordId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "If-Match": `"${version}"` },
    body: JSON.stringify(body),
  });
}

function deleteRequest(version = 1) {
  return new NextRequest(`http://localhost/api/records/${recordId}`, {
    method: "DELETE",
    headers: { "If-Match": `"${version}"` },
  });
}

function importRequest(body: unknown) {
  return new NextRequest("http://localhost/api/records/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function undoImportRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/records/import/${recordId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("digital record mutation and history routes", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedAppUser).mockResolvedValue({ id: "123" });
    clientQueryMock.mockReset().mockResolvedValue({ rows: [] });
    connectMock.mockClear();
    poolQueryMock.mockReset();
    releaseMock.mockClear();
  });

  it("updates a record only at the expected version and writes its history in the same transaction", async () => {
    const updated = { ...currentRecord, description: "Updated invoice", version: 2 };
    clientQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [currentRecord] })
      .mockResolvedValueOnce({
        rows: [{ id: businessId, type_of_business: "self-employment", hmrc_business_id: "XBIS12345678901" }],
      })
      .mockResolvedValueOnce({ rows: [updated] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await recordPatch(
      patchRequest({ description: "Updated invoice" }),
      { params: Promise.resolve({ recordId }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("ETag")).toBe('"2"');
    expect(await response.json()).toEqual({ record: updated });
    expect(clientQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO public.digital_record_history"),
      ["123", recordId, 2, JSON.stringify({ before: currentRecord, after: updated })],
    );
    expect(clientQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("SET record_date = $3"),
      [
        "123", recordId, currentRecord.recordDate, currentRecord.recordType, currentRecord.category,
        "Updated invoice", currentRecord.sourceAmount, currentRecord.sourceCurrency,
        currentRecord.amountGbp, null, null, null, null, null,
      ],
    );
    expect(clientQueryMock).toHaveBeenLastCalledWith("COMMIT");
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it("rejects stale record versions without mutating the record", async () => {
    clientQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ ...currentRecord, version: 2 }] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await recordPatch(patchRequest(currentRecord, 1), { params: Promise.resolve({ recordId }) });

    expect(response.status).toBe(412);
    expect(clientQueryMock).toHaveBeenCalledTimes(3);
    expect(clientQueryMock).toHaveBeenLastCalledWith("COMMIT");
  });

  it("archives rather than hard-deletes and records the archived version", async () => {
    const archived = { ...currentRecord, version: 2, archivedAt: "2026-04-09T10:00:00.000Z" };
    clientQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [currentRecord] })
      .mockResolvedValueOnce({ rows: [archived] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await recordDelete(deleteRequest(), { params: Promise.resolve({ recordId }) });

    expect(response.status).toBe(204);
    expect(clientQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("SET archived_at = now()"),
      ["123", recordId],
    );
    expect(clientQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("'archived'"),
      ["123", recordId, 2, JSON.stringify({ before: currentRecord, after: archived })],
    );
  });

  it("reads record history only in the authenticated user's scope", async () => {
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: recordId }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, action: "created" }] })
      .mockResolvedValueOnce({ rows: [{ submissionId: "submission-1", recordVersion: 1, outcome: "succeeded" }] });

    const response = await recordHistoryGet(
      new NextRequest(`http://localhost/api/records/${recordId}/history`),
      { params: Promise.resolve({ recordId }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      history: [{ id: 1, action: "created" }],
      nextOffset: null,
      submissions: [{ submissionId: "submission-1", recordVersion: 1, outcome: "succeeded" }],
      nextSubmissionOffset: null,
    });
    expect(poolQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE user_id = $1 AND id = $2"),
      ["123", recordId],
    );
    expect(poolQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE i.user_id = $1 AND i.digital_record_id = $2"),
      ["123", recordId, 0],
    );
  });

  it("paginates submission references independently and rejects invalid offsets", async () => {
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: recordId }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: Array.from({ length: 101 }, (_, index) => ({ submissionId: String(index) })) });

    const response = await recordHistoryGet(
      new NextRequest(`http://localhost/api/records/${recordId}/history?offset=0&submissionOffset=100`),
      { params: Promise.resolve({ recordId }) },
    );
    const body = await response.json();
    expect(body.submissions).toHaveLength(100);
    expect(body.nextSubmissionOffset).toBe(200);
    expect(poolQueryMock).toHaveBeenLastCalledWith(expect.any(String), ["123", recordId, 100]);

    const invalid = await recordHistoryGet(
      new NextRequest(`http://localhost/api/records/${recordId}/history?submissionOffset=-1`),
      { params: Promise.resolve({ recordId }) },
    );
    expect(invalid.status).toBe(400);
    expect(poolQueryMock).toHaveBeenCalledTimes(3);
  });

  it("does not return submission references for a record outside the user's scope", async () => {
    poolQueryMock.mockResolvedValueOnce({ rows: [] });
    const response = await recordHistoryGet(
      new NextRequest(`http://localhost/api/records/${recordId}/history`),
      { params: Promise.resolve({ recordId }) },
    );
    expect(response.status).toBe(404);
    expect(poolQueryMock).toHaveBeenCalledOnce();
    expect(poolQueryMock).toHaveBeenCalledWith(expect.any(String), ["123", recordId]);
  });

  it("commits an unchanged preview atomically and persists import history", async () => {
    const csvText = "date,type,category,amount,currency,gbp\n2026-04-08,income,turnover,125.50,GBP,125.50";
    const columnMap = {
      recordDate: "date",
      recordType: "type",
      category: "category",
      sourceAmount: "amount",
      sourceCurrency: "currency",
      amountGbp: "gbp",
    };
    poolQueryMock
      .mockResolvedValueOnce({
        rows: [{ id: businessId, type_of_business: "self-employment", hmrc_business_id: "XBIS12345678901" }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const previewResponse = await recordImportPost(importRequest({
      mode: "preview",
      recordBusinessId: businessId,
      csvText,
      columnMap,
    }));
    const preview = await previewResponse.json();
    expect(previewResponse.status).toBe(200);

    poolQueryMock
      .mockResolvedValueOnce({
        rows: [{ id: businessId, type_of_business: "self-employment", hmrc_business_id: "XBIS12345678901" }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    clientQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: preview.batchId }] })
      .mockResolvedValueOnce({ rows: [{ row_number: 2, id: recordId }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const commitResponse = await recordImportPost(importRequest({
      mode: "commit",
      batchId: preview.batchId,
      contentSha256: preview.contentSha256,
      recordBusinessId: businessId,
      csvText,
      columnMap,
    }));

    expect(commitResponse.status).toBe(201);
    expect(await commitResponse.json()).toMatchObject({
      batchId: preview.batchId,
      totalRows: 1,
      importedRows: 1,
      alreadyCommitted: false,
    });
    expect(clientQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO public.digital_record_history"),
      expect.any(Array),
    );
    const importSqlArgs = clientQueryMock.mock.calls[3]?.[1] as unknown[];
    expect(JSON.parse(String(importSqlArgs?.[2]))[0]).toHaveProperty("row_number", 2);
    expect(clientQueryMock).toHaveBeenLastCalledWith("COMMIT");
    expect(releaseMock).toHaveBeenCalledOnce();

    poolQueryMock
      .mockResolvedValueOnce({
        rows: [{ id: businessId, type_of_business: "self-employment", hmrc_business_id: "XBIS12345678901" }],
      })
      .mockResolvedValueOnce({
        rows: [{
          content_sha256: preview.contentSha256,
          total_rows: 1,
          imported_rows: 1,
        }],
      });
    const retryResponse = await recordImportPost(importRequest({
      mode: "commit",
      batchId: preview.batchId,
      contentSha256: preview.contentSha256,
      recordBusinessId: businessId,
      csvText,
      columnMap,
    }));
    expect(retryResponse.status).toBe(200);
    expect(await retryResponse.json()).toMatchObject({
      batchId: preview.batchId,
      alreadyCommitted: true,
    });
  });

  it("archives only unchanged records when a user explicitly undoes an import", async () => {
    clientQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: recordId, total_rows: 2 }] })
      .mockResolvedValueOnce({ rows: [{ archived_rows: 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await importBatchDelete(
      undoImportRequest({ confirm: true }),
      { params: Promise.resolve({ batchId: recordId }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      batchId: recordId,
      archivedRows: 1,
      skippedRows: 1,
    });
    expect(clientQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("r.version = 1"),
      [recordId, "123"],
    );
    expect(clientQueryMock).toHaveBeenLastCalledWith("COMMIT");
  });
});
