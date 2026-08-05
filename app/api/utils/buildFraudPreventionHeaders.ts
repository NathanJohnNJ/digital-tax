import { buildVendorForwardedHeader } from './buildVendorForwarded';
import { buildVendorLicenseIDs } from "./buildVendorLicenseIDs";
import { percentEncode } from './percentEncode';
import { buildVendorVersion } from "./buildVendorVersion";

export type FraudClientData = any;

export async function buildFraudPreventionHeaders(client: FraudClientData) {
  async function getPublicIP(){
    const { ip } = await fetch("https://api.ipify.org?format=json").then(r => r.json());
    return ip;
  }
  
  return {
    // CLIENT HEADERS
    "Gov-Client-Connection-Method": client.connectionMethod,
    "Gov-Client-Browser-JS-User-Agent": client.browserUserAgent,
    "Gov-Client-Device-ID": client.deviceID,
    "Gov-Client-Multi-Factor": client.multiFactor,
    "Gov-Client-Public-IP": client.publicIP,
    "Gov-Client-Public-IP-Timestamp": client.publicIPTimestamp,
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
    "Gov-Vendor-Public-IP": await getPublicIP(),
    "Gov-Vendor-Version": buildVendorVersion(process.env.APP_NAME!),
  };
}
