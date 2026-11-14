import { describe, expect, it } from "vitest";
import { parseCsv, serializeCsvRow } from "@/lib/recordCsv";

describe("record CSV helpers", () => {
  it("parses escaped quotes, commas, and multiline fields", () => {
    expect(parseCsv('date,description\r\n2026-04-08,"Invoice, ""A""\nsecond line"\r\n')).toEqual({
      headers: ["date", "description"],
      rows: [{ rowNumber: 2, values: ["2026-04-08", 'Invoice, "A"\nsecond line'] }],
    });
  });

  it("rejects malformed or ambiguous headers", () => {
    expect(() => parseCsv('date,date\n2026-04-08,2026-04-08')).toThrow("CSV headers must be unique");
    expect(() => parseCsv('date,description\n2026-04-08,"unfinished')).toThrow("unterminated quoted field");
    expect(() => parseCsv('date,description\n2026-04-08,invoice,extra')).toThrow("more columns than its header");
    expect(() => parseCsv('date,description\n2026-04-08,invoice"bad')).toThrow("quote inside an unquoted field");
  });

  it("serializes data safely for spreadsheet-readable CSV", () => {
    expect(serializeCsvRow(["plain", 'has "quotes", and comma', null])).toBe(
      'plain,"has ""quotes"", and comma",',
    );
  });
});
