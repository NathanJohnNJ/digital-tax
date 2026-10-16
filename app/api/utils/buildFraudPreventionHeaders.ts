import { buildVendorForwardedHeader } from './buildVendorForwarded';
import { buildVendorLicenseIDs } from "./buildVendorLicenseIDs";
import { percentEncode } from './percentEncode';
import { buildVendorVersion } from "./buildVendorVersion";
import { getTrustedClientIp } from './getTrustedClientIp';

export type FraudClientData = any;

export async function buildFraudPreventionHeaders(client: FraudClientData, request: Request) {
  async function getPublicIP(){
    try {
      const response = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
      const { ip } = await response.json();
      return ip as string;
    } catch (error) {
      console.error('Unable to resolve vendor public IP', error instanceof Error ? error.name : error);
      return process.env.SERVER_PUBLIC_IP ?? "";
    }
  }

  const clientPublicIP = getTrustedClientIp(request);
  if (!clientPublicIP && process.env.NODE_ENV === 'production') {
    console.error('Unable to resolve trusted client IP; omitting HMRC client IP headers', {
      hasXRealIp: request.headers.has('x-real-ip'),
      hasXVercelForwardedFor: request.headers.has('x-vercel-forwarded-for'),
      hasXForwardedFor: request.headers.has('x-forwarded-for'),
      onVercel: process.env.VERCEL === '1',
    });
  }

  return {
    // CLIENT HEADERS
    "Gov-Client-Connection-Method": client.connectionMethod,
    "Gov-Client-Browser-JS-User-Agent": client.browserUserAgent,
    "Gov-Client-Device-ID": client.deviceID,
    "Gov-Client-Multi-Factor": client.multiFactor,
    ...(clientPublicIP ? {
      "Gov-Client-Public-IP": clientPublicIP,
      "Gov-Client-Public-IP-Timestamp": new Date().toISOString(),
    } : {}),
    "Gov-Client-Public-Port": client.publicPort ?? "",
    "Gov-Client-Screens": client.screens,
    "Gov-Client-Timezone": client.timezone,
    "Gov-Client-User-IDs": client.userIds,
    "Gov-Client-Window-Size": client.windowSize,

    // SERVER HEADERS
    "Gov-Vendor-Forwarded": buildVendorForwardedHeader(
      clientPublicIP,
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
    "Gov-Vendor-Public-IP": await getPublicIP(),
    "Gov-Vendor-Version": buildVendorVersion(process.env.APP_NAME!),
  };
}
