'use client';

const getScreenDetails = async () => {
  const width = window.screen.width;
  const height = window.screen.height;
  const scalingFactor = window.devicePixelRatio?.toString();
  const colourDepth = window.screen.colorDepth;

  return {
    width,
    height,
    scalingFactor,
    colourDepth
  };
};

function generateUUID(): string {
  // RFC4122 v4 UUID
  return crypto.randomUUID
  ? 
  crypto.randomUUID()
  : 
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const getDeviceID = async () => {
  const DEVICE_ID_KEY = 'gov-client-device-id';
  if (typeof window === 'undefined') return;
  let existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!existing) {
    existing = generateUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, existing);
  }
  return existing;
}

export function getLondonUtcOffset(date = new Date()) {
  // Get the offset in minutes for Europe/London at the given date
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    timeZoneName: 'short'
  });

  const parts = formatter.formatToParts(date);
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value;

  // BST = UTC+1, GMT = UTC+0
  const offsetHours = tzName === 'BST' ? 1 : 0;

  // Format as UTC±hh:mm
  const sign = offsetHours >= 0 ? '+' : '-';
  const hh = String(Math.abs(offsetHours)).padStart(2, '0');
  const mm = '00';

  return `UTC${sign}${hh}:${mm}`;
}

export async function buildClientPayload(){
  const deviceID = await getDeviceID();
  const screenDetails = await getScreenDetails();

  const userAgent = navigator.userAgent;
  const timezone = getLondonUtcOffset();
  const windowSize = `width=${window.innerWidth}&height=${window.innerHeight}`;
  return {
    connectionMethod: 'WEB_APP_VIA_SERVER',
    browserUserAgent: userAgent,
    deviceID,
    screens: `width=${screenDetails.width}&height=${screenDetails.height}&scaling-factor=${screenDetails.scalingFactor}&colour-depth=${screenDetails.colourDepth}`,
    timezone,
    windowSize
  };
}