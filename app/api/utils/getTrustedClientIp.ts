import { isIP } from 'node:net';

export function getTrustedClientIp(request: Pick<Request, 'headers'>): string | undefined {
  // Vercel replaces this header at ingress. Deployments behind another proxy
  // must configure that proxy as trusted before this can identify the end user.
  if (process.env.VERCEL !== '1') {
    return undefined;
  }

  const forwardedFor = request.headers.get('x-forwarded-for')?.trim();

  if (!forwardedFor || forwardedFor.includes(',')) {
    return undefined;
  }

  return isIP(forwardedFor) ? forwardedFor : undefined;
}
