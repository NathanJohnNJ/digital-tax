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

const getPublicIPDetails = async () => {
  try {
    const res = await fetch('https://api.ipinfo.io/lite/me?token=7e7e36035b6a40');
    const utcDate = new Date().toISOString();
    const data = await res.json();
    const ip = data.ip;

    return { ip, date: utcDate };
  } catch (err) {
    console.error("Failed to fetch IP:", err);
  }
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

const getClientPublicPort = async (req: Request) => {
  try {
    const forwardedPort = req.headers.get("x-forwarded-port");
    if (forwardedPort) {
      const portNum = parseInt(forwardedPort, 10);
      if (portNum >= 1 && portNum <= 65535 && portNum !== 80 && portNum !== 443) {
        return forwardedPort;
      }
    }
    const cfPort = req.headers.get("cf-connecting-port");
    if (cfPort) {
      const portNum = parseInt(cfPort, 10);
      if (portNum >= 1 && portNum <= 65535 && portNum !== 80 && portNum !== 443) {
        return cfPort;
      }
    }
    if (!forwardedPort && !cfPort){
      return "";
    }
  } catch {
    return ""
  }
};

export async function buildClientPayload(){
  const publicPort = await getClientPublicPort(new Request(window.location.href));
  const deviceID = await getDeviceID();
  const publicIPDetails = await getPublicIPDetails();
  const screenDetails = await getScreenDetails();

  const userAgent = navigator.userAgent;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const windowSize = `width=${window.innerWidth}&height=${window.innerHeight}`;
  const multiFactor = '';
  const applicationName = 'Digital%20Tax%20by%20NJTD';
  const username = '595275806704';

  return {
    connectionMethod: 'WEB_APP_VIA_SERVER',
    browserUserAgent: userAgent,
    deviceID,
    multiFactor,
    publicIP: publicIPDetails?.ip,
    publicIPTimestamp: publicIPDetails?.date,
    publicPort,
    screens: `width=${screenDetails.width}&height=${screenDetails.height}&scaling-factor=${screenDetails.scalingFactor}&colour-depth=${screenDetails.colourDepth}`,
    timezone,
    userIds: `${applicationName}=${username}`,
    windowSize
  };
}