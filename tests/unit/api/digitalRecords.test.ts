import { describe, expect, it } from "vitest";
import { parseDigitalRecordInput } from "@/lib/digitalRecords";

const baseRecord = {
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
};

describe("digital record input validation", () => {
  it("accepts a complete GBP self-employment record", () => {
    const parsed = parseDigitalRecordInput(baseRecord, "self-employment");

    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.amountGbp).toBe("125.50");
  });

  it("rejects categories that do not belong to the business source and record type", () => {
    expect(parseDigitalRecordInput({
      ...baseRecord,
      category: "financialCosts",
    }, "self-employment")).toMatchObject({
      ok: false,
      error: "category is not supported for this business and record type",
    });
  });

  it("requires a matching conversion rate and provenance for non-GBP records", () => {
    const parsed = parseDigitalRecordInput({
      ...baseRecord,
      category: "rentIncome",
      sourceAmount: "100.00",
      sourceCurrency: "EUR",
      amountGbp: "86.00",
      exchangeRate: "0.85",
      exchangeRateDate: "2026-04-08",
      exchangeRateSource: "Bank statement",
      foreignPropertyCountryCode: "FRA",
    }, "foreign-property");

    expect(parsed).toMatchObject({
      ok: false,
      error: "Non-GBP records require a valid rate, rate date, source, and matching GBP amount",
    });

    const valid = parseDigitalRecordInput({
      ...baseRecord,
      category: "rentIncome",
      sourceAmount: "100.00",
      sourceCurrency: "EUR",
      amountGbp: "85.00",
      exchangeRate: "0.85",
      exchangeRateDate: "2026-04-08",
      exchangeRateSource: "Bank statement",
      foreignPropertyCountryCode: "FRA",
    }, "foreign-property");

    expect(valid.ok).toBe(true);
  });

  it("rejects GBP records with exchange-rate metadata or mismatched amounts", () => {
    expect(parseDigitalRecordInput({
      ...baseRecord,
      amountGbp: "126.00",
    }, "self-employment").ok).toBe(false);
    expect(parseDigitalRecordInput({
      ...baseRecord,
      exchangeRate: "1",
    }, "self-employment").ok).toBe(false);
  });
});
