export type RecordBusinessType = "self-employment" | "uk-property" | "foreign-property";
export type DigitalRecordType = "income" | "expense";

export const RECORD_CATEGORIES: Record<
  RecordBusinessType,
  Record<DigitalRecordType, readonly string[]>
> = {
  "self-employment": {
    income: ["turnover", "other"],
    expense: [
      "costOfGoods",
      "paymentsToSubcontractors",
      "wagesAndStaffCosts",
      "carVanTravelExpenses",
      "premisesRunningCosts",
      "maintenanceCosts",
      "adminCosts",
      "businessEntertainmentCosts",
      "advertisingCosts",
      "interestOnBankOtherLoans",
      "financeCharges",
      "irrecoverableDebts",
      "professionalFees",
      "depreciation",
      "otherExpenses",
    ],
  },
  "uk-property": {
    income: ["periodAmount", "otherIncome", "premiumsOfLeaseGrant", "reversePremiums"],
    expense: [
      "premisesRunningCosts",
      "repairsAndMaintenance",
      "financialCosts",
      "professionalFees",
      "costOfServices",
      "travelCosts",
      "other",
      "residentialFinancialCost",
    ],
  },
  "foreign-property": {
    income: ["rentIncome", "premiumsOfLeaseGrant", "otherPropertyIncome"],
    expense: [
      "premisesRunningCosts",
      "repairsAndMaintenance",
      "financialCosts",
      "professionalFees",
      "travelCosts",
      "costOfServices",
      "other",
    ],
  },
};

export type DigitalRecordInput = {
  recordDate: string;
  recordType: DigitalRecordType;
  category: string;
  description: string;
  sourceAmount: string;
  sourceCurrency: string;
  amountGbp: string;
  exchangeRate: string | null;
  exchangeRateDate: string | null;
  exchangeRateSource: string | null;
  foreignPropertyId: string | null;
  foreignPropertyCountryCode: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decimalPattern = /^-?\d{1,14}(?:\.\d{1,4})?$/;
const exchangeRatePattern = /^\d{1,10}(?:\.\d{1,10})?$/;
const gbpPattern = /^-?\d{1,14}(?:\.\d{1,2})?$/;
const decimalFactor = (places: number) => BigInt(10) ** BigInt(places);

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function hasValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function decimalToScaledInteger(value: string, scale: number): bigint {
  const [whole, fraction = ""] = value.split(".");
  const negative = whole.startsWith("-");
  const absoluteWhole = negative ? whole.slice(1) : whole;
  const scaledFraction = fraction.padEnd(scale, "0").slice(0, scale);
  const result = BigInt(absoluteWhole) * decimalFactor(scale) + BigInt(scaledFraction || "0");
  return negative ? -result : result;
}

function isMatchingGbpConversion(sourceAmount: string, exchangeRate: string, amountGbp: string): boolean {
  const product = decimalToScaledInteger(sourceAmount, 4) * decimalToScaledInteger(exchangeRate, 10);
  const divisor = decimalFactor(12);
  const absolute = product < BigInt(0) ? -product : product;
  const roundedCents = (absolute + divisor / BigInt(2)) / divisor;
  const signedCents = product < BigInt(0) ? -roundedCents : roundedCents;
  return signedCents === decimalToScaledInteger(amountGbp, 2);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function parseDigitalRecordInput(
  input: Record<string, unknown>,
  businessType: RecordBusinessType,
): { ok: true; value: DigitalRecordInput } | { ok: false; error: string } {
  const { recordDate, recordType, category } = input;
  if (!isIsoDate(recordDate)) return { ok: false, error: "recordDate must be a valid ISO date" };
  if (recordType !== "income" && recordType !== "expense") {
    return { ok: false, error: "recordType must be income or expense" };
  }
  if (
    typeof category !== "string"
    || !RECORD_CATEGORIES[businessType][recordType].includes(category)
  ) {
    return { ok: false, error: "category is not supported for this business and record type" };
  }

  const sourceAmount = input.sourceAmount;
  const sourceCurrency = input.sourceCurrency;
  const amountGbp = input.amountGbp;
  if (
    typeof sourceAmount !== "string"
    || !decimalPattern.test(sourceAmount)
    || Number(sourceAmount) === 0
    || typeof sourceCurrency !== "string"
    || !/^[A-Z]{3}$/.test(sourceCurrency)
    || typeof amountGbp !== "string"
    || !gbpPattern.test(amountGbp)
    || Number(amountGbp) === 0
  ) {
    return { ok: false, error: "sourceAmount, sourceCurrency, or amountGbp is invalid" };
  }

  const exchangeRate = input.exchangeRate ?? null;
  const exchangeRateDate = input.exchangeRateDate ?? null;
  const exchangeRateSource = input.exchangeRateSource ?? null;
  let normalizedExchangeRate: string | null = null;
  let normalizedExchangeRateDate: string | null = null;
  let normalizedExchangeRateSource: string | null = null;
  if (sourceCurrency === "GBP") {
    if (
      Number(sourceAmount) !== Number(amountGbp)
      || exchangeRate !== null
      || exchangeRateDate !== null
      || exchangeRateSource !== null
    ) {
      return { ok: false, error: "GBP records must use the source amount as amountGbp without an exchange rate" };
    }
  } else {
    if (
      typeof exchangeRate !== "string"
      || !exchangeRatePattern.test(exchangeRate)
      || Number(exchangeRate) <= 0
      || !isIsoDate(exchangeRateDate)
      || !hasValue(exchangeRateSource)
      || exchangeRateSource.length > 120
      || !isMatchingGbpConversion(sourceAmount, exchangeRate, amountGbp)
    ) {
      return { ok: false, error: "Non-GBP records require a valid rate, rate date, source, and matching GBP amount" };
    }
    normalizedExchangeRate = exchangeRate;
    normalizedExchangeRateDate = exchangeRateDate;
    normalizedExchangeRateSource = exchangeRateSource.trim();
  }

  const description = input.description ?? "";
  if (typeof description !== "string" || description.length > 500) {
    return { ok: false, error: "description must be 500 characters or fewer" };
  }

  const rawForeignPropertyId = input.foreignPropertyId ?? null;
  const rawForeignPropertyCountryCode = input.foreignPropertyCountryCode ?? null;
  if (
    (businessType === "foreign-property"
      && (
        (rawForeignPropertyId !== null && !isUuid(rawForeignPropertyId))
        || (rawForeignPropertyCountryCode !== null
          && (typeof rawForeignPropertyCountryCode !== "string"
            || !/^[A-Z]{3}$/.test(rawForeignPropertyCountryCode)))
        || (rawForeignPropertyId === null && rawForeignPropertyCountryCode === null)
      ))
    || (businessType !== "foreign-property"
      && (rawForeignPropertyId !== null || rawForeignPropertyCountryCode !== null))
  ) {
    return { ok: false, error: "Foreign property details are invalid for this business" };
  }
  const foreignPropertyId = typeof rawForeignPropertyId === "string" ? rawForeignPropertyId : null;
  const foreignPropertyCountryCode = typeof rawForeignPropertyCountryCode === "string"
    ? rawForeignPropertyCountryCode
    : null;

  return {
    ok: true,
    value: {
      recordDate,
      recordType,
      category,
      description,
      sourceAmount,
      sourceCurrency,
      amountGbp,
      exchangeRate: normalizedExchangeRate,
      exchangeRateDate: normalizedExchangeRateDate,
      exchangeRateSource: normalizedExchangeRateSource,
      foreignPropertyId,
      foreignPropertyCountryCode,
    },
  };
}
