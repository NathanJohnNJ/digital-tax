import { isIP } from 'node:net';
import { auth0 } from '@/lib/auth0';
import { buildVendorForwardedHeader } from './buildVendorForwarded';
import { buildVendorLicenseIDs } from './buildVendorLicenseIDs';
import { percentEncode } from './percentEncode';
import { buildVendorVersion } from './buildVendorVersion';
import { isFraudClientData, type FraudClientData } from './hmrcFraudValidation';

function getConfiguredHeader(request: Request, environmentVariable: string): string | undefined {
  const headerName = process.env[environmentVariable]?.trim();
  if (!headerName || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(headerName)) return undefined;
  const value = request.headers.get(headerName)?.trim();
  return value || undefined;
}

function getPublicIp(value: string | undefined): string | undefined {
  return value && isIP(value) ? value : undefined;
}

function getClientPublicPort(request: Request): string | undefined {
  const configuredPort = getConfiguredHeader(request, 'HMRC_CLIENT_PUBLIC_PORT_HEADER');
  if (!configuredPort || !/^\d{1,5}$/.test(configuredPort)) return undefined;

  const port = Number(configuredPort);
  return port >= 1 && port <= 65535 && port !== 80 && port !== 443
    ? String(port)
    : undefined;
}

export async function buildFraudPreventionHeaders(client: FraudClientData, request: Request) {
  if (!isFraudClientData(client)) {
    throw new TypeError('Invalid client fraud-prevention data');
  }
  const session = await auth0.getSession();
  const serverPublicIp = getPublicIp(process.env.SERVER_PUBLIC_IP);
  const clientPublicIp = getPublicIp(
    getConfiguredHeader(request, 'HMRC_CLIENT_PUBLIC_IP_HEADER'),
  );
  const headers: Record<string, string> = {
    'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
  };
  if (process.env.APP_NAME) {
    headers['Gov-Vendor-Product-Name'] = percentEncode(process.env.APP_NAME);
    headers['Gov-Vendor-Version'] = buildVendorVersion(process.env.APP_NAME);
  }
  if (process.env.APP_NAME && process.env.LICENSE_KEY) {
    headers['Gov-Vendor-License-IDs'] = buildVendorLicenseIDs([
      { name: process.env.APP_NAME, key: process.env.LICENSE_KEY },
    ]);
  }

  const optionalClientHeaders: Array<[string, string | undefined]> = [
    ['Gov-Client-Browser-JS-User-Agent', client.browserUserAgent],
    ['Gov-Client-Device-ID', client.deviceID],
    ['Gov-Client-Screens', client.screens],
    ['Gov-Client-Timezone', client.timezone],
    ['Gov-Client-Window-Size', client.windowSize],
  ];
  for (const [name, value] of optionalClientHeaders) {
    if (value) headers[name] = value;
  }

  if (process.env.APP_NAME && (session?.user?.email || session?.user?.sub)) {
    const identifiers: string[] = [];
    if (session.user.email) {
      identifiers.push(`${percentEncode(process.env.APP_NAME)}=${percentEncode(session.user.email)}`);
    }
    if (session.user.sub) {
      identifiers.push(
        `${percentEncode(`${process.env.APP_NAME}-internal-id`)}=${percentEncode(session.user.sub)}`,
      );
    }
    headers['Gov-Client-User-IDs'] = identifiers.join('&');
  }

  if (clientPublicIp) {
    headers['Gov-Client-Public-IP'] = clientPublicIp;
    headers['Gov-Client-Public-IP-Timestamp'] = new Date().toISOString();
    const publicPort = getClientPublicPort(request);
    if (publicPort) headers['Gov-Client-Public-Port'] = publicPort;
  }

  if (serverPublicIp) {
    headers['Gov-Vendor-Public-IP'] = serverPublicIp;
    if (clientPublicIp) {
      headers['Gov-Vendor-Forwarded'] = buildVendorForwardedHeader(clientPublicIp, [serverPublicIp]);
    }
  }

  return headers;
}
