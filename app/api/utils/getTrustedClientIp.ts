import { isIP } from 'node:net';
import { ipAddress } from '@vercel/functions';

export function getTrustedClientIp(request: Pick<Request, 'headers'>): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const forwardedClientIp = forwardedFor?.split(',')[0]?.trim();

  if (forwardedClientIp && isIP(forwardedClientIp)) {
    return forwardedClientIp;
  }

  const ip = ipAddress(request)?.trim();
  return ip && isIP(ip) ? ip : '';
}
