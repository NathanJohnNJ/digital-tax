import { isIP } from 'node:net';

function parseIp(value: string | null | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;

  // Strip a port from "1.2.3.4:5678" or "[::1]:5678"
  const bracketed = candidate.match(/^\[([^\]]+)\](?::\d+)?$/);
  const withoutPort = bracketed
    ? bracketed[1]
    : /^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(candidate)
      ? candidate.slice(0, candidate.lastIndexOf(':'))
      : candidate;

  return isIP(withoutPort) ? withoutPort : undefined;
}

export function getTrustedClientIp(request: Pick<Request, 'headers'>): string | undefined {
  // Vercel sets these headers at ingress and overwrites any client-supplied
  // value. Deployments behind another proxy must configure that proxy as
  // trusted before this can identify the end user.
  if (process.env.VERCEL !== '1') {
    return undefined;
  }

  const { headers } = request;

  // x-forwarded-for may hold a list when an upstream proxy appends to it; the
  // first entry is the original client.
  return (
    parseIp(headers.get('x-real-ip')) ??
    parseIp(headers.get('x-vercel-forwarded-for')) ??
    parseIp(headers.get('x-forwarded-for')?.split(',')[0])
  );
}
