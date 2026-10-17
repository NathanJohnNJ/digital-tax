import { isIP } from 'node:net';
import { ipAddress } from '@vercel/functions';

export function getTrustedClientIp(request: Pick<Request, 'headers'>): string | undefined {
  const ip = ipAddress(request);

  const forwardedFor = request.headers.get('x-forwarded-for')?.trim();

  if (!forwardedFor || forwardedFor.includes(',')) {
    return undefined;
  }

  return isIP(forwardedFor) ? forwardedFor : ip;
}
