export type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readJsonRecord(request: Request): Promise<
  { ok: true; value: JsonRecord } | { ok: false; error: string }
> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return { ok: false, error: 'Request body must be valid JSON' };
  }

  if (!isRecord(value)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  return { ok: true, value };
}

export function isValidNino(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{2}\d{6}[A-D]$/.test(value);
}

export function isValidBusinessId(value: unknown): value is string {
  return typeof value === 'string' && /^X[A-Z0-9]IS\d{11}$/i.test(value);
}

export function isValidTaxYear(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return Boolean(
    match
    && Number(match[1]) >= 2017
    && Number(match[2]) === (Number(match[1]) + 1) % 100,
  );
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isIsoUtcDateTime(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function isBusinessType(value: unknown): boolean {
  return value === 'self-employment'
    || value === 'uk-property'
    || value === 'foreign-property'
    || value === 'property-unspecified';
}

function isBusinessListItem(value: unknown): value is JsonRecord {
  return isRecord(value)
    && isValidBusinessId(value.businessId)
    && isBusinessType(value.typeOfBusiness)
    && (value.tradingType === undefined
      || (typeof value.tradingType === 'string' && value.tradingType.length >= 1 && value.tradingType.length <= 35))
    && (value.tradingName === undefined
      || (typeof value.tradingName === 'string' && value.tradingName.length <= 105));
}

export function isBusinessListResponse(value: unknown): value is JsonRecord & { listOfBusinesses: JsonRecord[] } {
  return isRecord(value)
    && Array.isArray(value.listOfBusinesses)
    && value.listOfBusinesses.every(isBusinessListItem);
}

function isLatencyDetails(value: unknown): boolean {
  return isRecord(value)
    && isIsoDate(value.latencyEndDate)
    && isValidTaxYear(value.taxYear1)
    && (value.latencyIndicator1 === 'A' || value.latencyIndicator1 === 'Q')
    && isValidTaxYear(value.taxYear2)
    && (value.latencyIndicator2 === 'A' || value.latencyIndicator2 === 'Q');
}

function isQuarterlyTypeChoice(value: unknown): boolean {
  return isRecord(value)
    && (value.quarterlyPeriodType === 'standard' || value.quarterlyPeriodType === 'calendar')
    && isValidTaxYear(value.taxYearOfChoice);
}

function isAccountingPeriods(value: unknown): boolean {
  return Array.isArray(value)
    && value.every((period) =>
      isRecord(period) && isIsoDate(period.start) && isIsoDate(period.end),
    );
}

export function isBusinessDetailsResponse(value: unknown): value is JsonRecord & {
  businessId: string;
  typeOfBusiness: string;
} {
  if (
    !isRecord(value)
    || !isValidBusinessId(value.businessId)
    || !isBusinessType(value.typeOfBusiness)
  ) {
    return false;
  }

  if (value.tradingName !== undefined && typeof value.tradingName !== 'string') return false;
  if (value.tradingType !== undefined
    && (typeof value.tradingType !== 'string' || value.tradingType.length < 1 || value.tradingType.length > 35)) {
    return false;
  }
  if (typeof value.tradingName === 'string' && value.tradingName.length > 105) return false;

  for (const key of [
    'businessAddressLineOne',
    'businessAddressLineTwo',
    'businessAddressLineThree',
    'businessAddressLineFour',
  ]) {
    if (value[key] !== undefined
      && (typeof value[key] !== 'string' || value[key].length < 1 || value[key].length > 35)) {
      return false;
    }
  }
  if (value.businessAddressPostcode !== undefined
    && (typeof value.businessAddressPostcode !== 'string'
      || value.businessAddressPostcode.length < 1
      || value.businessAddressPostcode.length > 10)) {
    return false;
  }
  if (value.businessAddressCountryCode !== undefined
    && (typeof value.businessAddressCountryCode !== 'string'
      || !/^[A-Z]{2}$/.test(value.businessAddressCountryCode))) {
    return false;
  }

  for (const key of [
    'firstAccountingPeriodStartDate',
    'firstAccountingPeriodEndDate',
    'commencementDate',
    'cessationDate',
  ]) {
    if (value[key] !== undefined && !isIsoDate(value[key])) return false;
  }

  return (value.accountingPeriods === undefined || isAccountingPeriods(value.accountingPeriods))
    && (value.latencyDetails === undefined || isLatencyDetails(value.latencyDetails))
    && (value.quarterlyTypeChoice === undefined || isQuarterlyTypeChoice(value.quarterlyTypeChoice));
}

function isObligation(value: unknown): boolean {
  return isRecord(value)
    && isIsoDate(value.periodStartDate)
    && isIsoDate(value.periodEndDate)
    && isIsoDate(value.dueDate)
    && (value.status === 'open' || value.status === 'fulfilled')
    && (value.receivedDate === undefined || isIsoDate(value.receivedDate));
}

export function isQuarterlyObligationsResponse(value: unknown): value is JsonRecord & {
  obligations: JsonRecord[];
} {
  return isRecord(value)
    && Array.isArray(value.obligations)
    && value.obligations.every((item) =>
      isRecord(item)
      && isValidBusinessId(item.businessId)
      && (item.typeOfBusiness === 'self-employment'
        || item.typeOfBusiness === 'uk-property'
        || item.typeOfBusiness === 'foreign-property')
      && Array.isArray(item.obligationDetails)
      && item.obligationDetails.every(isObligation),
    );
}

export function isYearEndObligationsResponse(value: unknown): value is JsonRecord & {
  obligations: JsonRecord[];
} {
  return isRecord(value)
    && Array.isArray(value.obligations)
    && value.obligations.every(isObligation);
}

export function isValidCalculationId(value: unknown): value is string {
  return typeof value === 'string'
    && /^(?:\d{8}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.test(value);
}

export function isCalculationListResponse(value: unknown): value is JsonRecord & {
  calculations: JsonRecord[];
} {
  return isRecord(value) && Array.isArray(value.calculations)
    && value.calculations.every((calculation) => {
      if (!isRecord(calculation)
        || !isValidCalculationId(calculation.calculationId)
        || !isIsoUtcDateTime(calculation.calculationTimestamp)
        || typeof calculation.calculationType !== 'string') {
        return false;
      }

      return (calculation.calculationType === 'in-year'
        || calculation.calculationType === 'intent-to-finalise'
        || calculation.calculationType === 'intent-to-amend'
        || calculation.calculationType === 'final-declaration'
        || calculation.calculationType === 'confirm-amendment');
    });
}

export function isCalculationListForTaxYear(value: unknown, taxYear: string): boolean {
  if (!isCalculationListResponse(value)) return false;
  const startYear = Number(taxYear.slice(0, 4));

  return value.calculations.every((calculation) => {
    if (startYear < 2023) {
      return calculation.calculationType === 'in-year'
        || calculation.calculationType === 'final-declaration';
    }
    if (startYear < 2025
      && (calculation.calculationType === 'intent-to-amend'
        || calculation.calculationType === 'confirm-amendment')) {
      return false;
    }

    return ['PROCESSED', 'ERROR', 'REJECTED'].includes(String(calculation.calculationOutcome))
      && ['attended', 'class2NICEvent', 'unattended', 'cesaSAReturn', 'newLossEvent', 'updatedLossEvent']
        .includes(String(calculation.calculationTrigger));
  });
}

export function isCalculationResponse(value: unknown): value is JsonRecord & {
  metadata: JsonRecord & { calculationId: string };
  inputs: JsonRecord;
} {
  return isRecord(value)
    && isRecord(value.metadata)
    && isValidCalculationId(value.metadata.calculationId)
    && isValidTaxYear(value.metadata.taxYear)
    && isRecord(value.inputs);
}

export function isCalculationTriggerResponse(value: unknown): value is JsonRecord & {
  calculationId: string;
} {
  return isRecord(value) && isValidCalculationId(value.calculationId);
}

export function readHmrcBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sanitizeMessage(value: string, identifiers: string[]): string {
  let message = value
    .replace(/\bBearer\s+\S+/gi, '[redacted]')
    .replace(/\bauthorization\s*[:=]\s*\S+/gi, '[redacted]')
    .replace(/\b(?:access|refresh)[_-]?token\s*[:=]\s*\S+/gi, '[redacted]')
    .replace(/\b[A-Z]{2}\d{6}[A-D]\b/gi, '[redacted]');
  message = message.replace(/\bX[A-Z0-9]IS\d{11}\b/gi, '[redacted]');

  for (const identifier of identifiers) {
    if (identifier) message = message.replaceAll(identifier, '[redacted]');
  }

  return message.slice(0, 500);
}

function getHmrcErrorDetails(body: unknown, identifiers: string[]): JsonRecord | undefined {
  if (!isRecord(body)) return undefined;

  const details: JsonRecord = {};
  if (typeof body.code === 'string' && /^[A-Z0-9_]{1,100}$/.test(body.code)) {
    details.code = body.code;
  }
  if (typeof body.message === 'string') {
    details.message = sanitizeMessage(body.message, identifiers);
  }
  if (Array.isArray(body.errors)) {
    const errors = body.errors.slice(0, 20).flatMap((detail) => {
      if (!isRecord(detail)) return [];
      const safeDetail: JsonRecord = {};
      if (typeof detail.code === 'string' && /^[A-Z0-9_]{1,100}$/.test(detail.code)) {
        safeDetail.code = detail.code;
      }
      if (typeof detail.message === 'string') {
        safeDetail.message = sanitizeMessage(detail.message, identifiers);
      }
      return Object.keys(safeDetail).length ? [safeDetail] : [];
    });
    if (errors.length) details.errors = errors;
  }

  return Object.keys(details).length ? details : undefined;
}

export function getSafeHmrcError(body: unknown, identifiers: string[] = []): {
  error: string;
  details?: JsonRecord;
} {
  const details = getHmrcErrorDetails(body, identifiers);
  const rawMessage = isRecord(body) && typeof body.message === 'string'
    ? body.message
    : isRecord(body) && typeof body.error === 'string'
      ? body.error
      : undefined;

  return {
    error: rawMessage
      ? sanitizeMessage(rawMessage, identifiers)
      : 'HMRC request failed',
    ...(details ? { details } : {}),
  };
}

export async function forwardValidatedHmrcResponse(
  response: Response,
  operation: string,
  isValidResponse: (body: unknown) => boolean,
  identifiers: string[] = [],
  expectedStatus = 200,
): Promise<Response> {
  const body = readHmrcBody(await response.text());
  const correlationId = response.headers.get('X-CorrelationId');
  const headers = correlationId ? { 'X-CorrelationId': correlationId } : undefined;

  if (!response.ok) {
    const safeError = getSafeHmrcError(body, identifiers);
    const code = safeError.details?.code;
    console.error(`HMRC ${operation} failed`, {
      status: response.status,
      correlationId: correlationId ?? undefined,
      code,
    });
    return Response.json(
      {
        error: safeError.error,
        status: response.status,
        ...(safeError.details ? { details: safeError.details } : {}),
      },
      { status: response.status, headers },
    );
  }

  if (response.status !== expectedStatus || !isValidResponse(body)) {
    console.error(`HMRC ${operation} returned an invalid success response`, {
      status: response.status,
      correlationId: correlationId ?? undefined,
    });
    return Response.json(
      { error: 'HMRC returned an unexpected response. Please try again later.' },
      { status: 502 },
    );
  }

  return Response.json(body, { status: response.status, headers });
}
