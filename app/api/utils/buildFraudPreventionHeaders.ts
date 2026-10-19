import { isIP } from 'node:net';
import { buildVendorForwardedHeader } from './buildVendorForwarded';
import { buildVendorLicenseIDs } from "./buildVendorLicenseIDs";
import { percentEncode } from './percentEncode';
import { buildVendorVersion } from "./buildVendorVersion";

export type FraudClientData = any;

async function getVendorPublicIP(): Promise<string> {
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      throw new Error(`IP lookup failed with status ${response.status}`);
    }
    const body: unknown = await response.json();
    if (
      typeof body !== 'object'
      || body === null
      || !('ip' in body)
      || typeof body.ip !== 'string'
      || !isIP(body.ip)
    ) {
      throw new Error('IP lookup returned an invalid address');
    }
    return body.ip;
  } catch (error) {
    console.error('Unable to resolve vendor public IP', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    const configuredServerIP = process.env.SERVER_PUBLIC_IP?.trim();
    if (configuredServerIP && isIP(configuredServerIP)) {
      return configuredServerIP;
    }
    throw new Error('Unable to resolve a valid vendor public IP');
  }
}

export async function buildFraudPreventionHeaders(client: FraudClientData, request: Request) {
  const vendorPublicIP = await getVendorPublicIP();

  const headers = {
    // CLIENT HEADERS
    "Gov-Client-Connection-Method": client.connectionMethod,
    "Gov-Client-Browser-JS-User-Agent": client.browserUserAgent,
    "Gov-Client-Device-ID": client.deviceID,
    "Gov-Client-Multi-Factor": client.multiFactor,
    "Gov-Client-Public-IP": client.publicIP,
    "Gov-Client-Public-IP-Timestamp": new Date().toISOString(),
    "Gov-Client-Public-Port": client.publicPort ?? "",
    "Gov-Client-Screens": client.screens,
    "Gov-Client-Timezone": client.timezone,
    "Gov-Client-User-IDs": client.userIds,
    "Gov-Client-Window-Size": client.windowSize,

    // SERVER HEADERS
    "Gov-Vendor-Forwarded": buildVendorForwardedHeader(
      client.publicIP,
      [
        process.env.SERVER_PUBLIC_IP!,      // first hop
        process.env.WAF_PUBLIC_IP!,         // optional
        process.env.SERVER2_PUBLIC_IP!      // optional
      ].filter(Boolean)
    ),
    "Gov-Vendor-License-IDs": buildVendorLicenseIDs([
      {
        name: process.env.APP_NAME!,
        key: process.env.LICENSE_KEY!
      }
    ]),
    "Gov-Vendor-Product-Name": percentEncode(process.env.APP_NAME!),
    "Gov-Vendor-Public-IP": vendorPublicIP,
    "Gov-Vendor-Version": buildVendorVersion(process.env.APP_NAME!),
  };

  const problems = Object.entries(headers)
    .filter(([, v]) => v === undefined || v === null || v === '' || v === 'undefined' || /[^\x20-\x7E]/.test(String(v)))
    .map(([k, v]) => `${k}=${v === '' ? '<EMPTY>' : /[^\x20-\x7E]/.test(String(v)) ? '<NON-ASCII>' : String(v)}`);
  console.log('[debug][fraud-headers]', {
    clientKeysReceived: Object.keys(client ?? {}),
    clientPublicIP: clientPublicIP ?? null,
    onVercel: process.env.VERCEL === '1',
    problemHeaders: problems,
  });

  return headers;
}
