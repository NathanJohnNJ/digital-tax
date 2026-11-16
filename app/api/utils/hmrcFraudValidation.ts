const CLIENT_FIELDS = new Set([
  'connectionMethod',
  'browserUserAgent',
  'deviceID',
  'screens',
  'timezone',
  'windowSize',
]);

export type FraudClientData = {
  connectionMethod?: string;
  browserUserAgent?: string;
  deviceID?: string;
  screens?: string;
  timezone?: string;
  windowSize?: string;
};

function isOptionalText(value: unknown, maximumLength: number): value is string | undefined {
  return value === undefined
    || (typeof value === 'string'
      && value.length <= maximumLength
      && /^[\x20-\x7e]*$/.test(value));
}

function isDimensionList(value: string): boolean {
  const entries = value.split('&');
  const keys = new Set<string>();
  for (const entry of entries) {
    const match = /^(width|height|scaling-factor|colour-depth)=(\d+(?:\.\d+)?)$/.exec(entry);
    if (!match || Number(match[2]) <= 0 || keys.has(match[1])) return false;
    keys.add(match[1]);
  }
  return ['width', 'height', 'scaling-factor', 'colour-depth'].every((key) => keys.has(key));
}

export function isFraudClientData(value: unknown): value is FraudClientData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;

  if (Object.keys(data).some((key) => !CLIENT_FIELDS.has(key))) return false;
  if (data.connectionMethod !== undefined && data.connectionMethod !== 'WEB_APP_VIA_SERVER') return false;
  if (!isOptionalText(data.browserUserAgent, 2048)) return false;
  if (data.deviceID !== undefined
    && (typeof data.deviceID !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.deviceID))) {
    return false;
  }
  if (!isOptionalText(data.screens, 128)
    || (data.screens !== undefined && data.screens !== '' && !isDimensionList(data.screens))) {
    return false;
  }
  if (data.timezone !== undefined
    && (typeof data.timezone !== 'string'
      || !/^UTC[+-](?:0\d|1[0-4]):[0-5]\d$/.test(data.timezone))) {
    return false;
  }
  if (!isOptionalText(data.windowSize, 64)
    || (data.windowSize !== undefined
      && data.windowSize !== ''
      && !/^width=\d+&height=\d+$/.test(data.windowSize))) {
    return false;
  }
  if (typeof data.windowSize === 'string' && data.windowSize !== '') {
    const dimensions = /width=(\d+)&height=(\d+)/.exec(data.windowSize);
    if (!dimensions || Number(dimensions[1]) <= 0 || Number(dimensions[2]) <= 0) return false;
  }

  return true;
}
