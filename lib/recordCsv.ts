export type RecordCsvRow = { rowNumber: number; values: string[] };

export type RecordCsvField =
  | "recordDate"
  | "recordType"
  | "category"
  | "description"
  | "sourceAmount"
  | "sourceCurrency"
  | "amountGbp"
  | "exchangeRate"
  | "exchangeRateDate"
  | "exchangeRateSource"
  | "foreignPropertyId"
  | "foreignPropertyCountryCode";

export const RECORD_CSV_FIELDS: readonly RecordCsvField[] = [
  "recordDate",
  "recordType",
  "category",
  "description",
  "sourceAmount",
  "sourceCurrency",
  "amountGbp",
  "exchangeRate",
  "exchangeRateDate",
  "exchangeRateSource",
  "foreignPropertyId",
  "foreignPropertyCountryCode",
];

export function parseCsv(text: string): { headers: string[]; rows: RecordCsvRow[] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  let afterQuote = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        value += character;
      }
    } else if (afterQuote) {
      if (character === ",") {
        row.push(value);
        value = "";
        afterQuote = false;
      } else if (character === "\n" || character === "\r") {
        row.push(value);
        value = "";
        if (row.some((cell) => cell.length > 0)) rows.push(row);
        row = [];
        afterQuote = false;
        if (character === "\r" && text[index + 1] === "\n") index += 1;
      } else if (character !== " " && character !== "\t") {
        throw new Error("CSV contains unexpected content after a quoted field");
      }
    } else if (character === '"' && value.length === 0) {
      quoted = true;
    } else if (character === '"') {
      throw new Error("CSV contains a quote inside an unquoted field");
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n" || character === "\r") {
      row.push(value);
      value = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  row.push(value);
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  if (rows.length === 0) throw new Error("CSV must include a header row");

  const headers = rows[0].map((header) => header.trim());
  if (headers.some((header) => header.length === 0)) throw new Error("CSV headers cannot be empty");
  if (new Set(headers).size !== headers.length) throw new Error("CSV headers must be unique");
  return {
    headers,
    rows: rows.slice(1).map((values, index) => {
      if (values.length > headers.length) {
        throw new Error(`CSV row ${index + 2} contains more columns than its header`);
      }
      return { rowNumber: index + 2, values };
    }),
  };
}

export function serializeCsvCell(value: unknown): string {
  const text = value === null || value === undefined
    ? ""
    : typeof value === "string"
      ? value
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeCsvRow(values: readonly unknown[]): string {
  return values.map(serializeCsvCell).join(",");
}
