export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const originalFetch = globalThis.fetch;
  if ((originalFetch as unknown as { __debugPatched?: boolean }).__debugPatched) return;

  const describeError = (error: unknown) => {
    const e = error as { name?: string; message?: string; code?: string; cause?: unknown };
    const cause = e?.cause as { name?: string; message?: string; code?: string; errno?: string; syscall?: string; hostname?: string } | undefined;
    return {
      name: e?.name,
      message: e?.message,
      code: e?.code,
      cause: cause
        ? { name: cause.name, message: cause.message, code: cause.code, errno: cause.errno, syscall: cause.syscall, hostname: cause.hostname }
        : undefined,
    };
  };

  const patched: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const isHmrc = url.includes('service.hmrc.gov.uk') || url.includes('tax.service.gov.uk');
    if (!isHmrc) return originalFetch(input, init);

    const method = init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET');
    const headers = new Headers(init?.headers);
    const headerSummary = Object.fromEntries(
      [...headers.entries()]
        .filter(([key]) => key.startsWith('gov-') || key === 'accept' || key === 'content-type')
        .map(([key, value]) => [key, value === '' ? '<EMPTY>' : value.length > 80 ? `${value.slice(0, 80)}…` : value]),
    );
    const started = Date.now();
    console.log('[debug][hmrc-fetch] →', {
      method,
      url: url.replace(/(\/individuals\/[^/]+\/)[A-Z]{2}\d{6}[A-D]/i, '$1<NINO>'),
      hasAuthorization: headers.has('authorization'),
      headers: headerSummary,
    });

    try {
      const response = await originalFetch(input, init);
      console.log('[debug][hmrc-fetch] ←', {
        method,
        status: response.status,
        ms: Date.now() - started,
        correlationId: response.headers.get('x-correlationid') ?? undefined,
        ...(response.ok ? {} : { body: (await response.clone().text()).slice(0, 1500) }),
      });
      return response;
    } catch (error) {
      console.error('[debug][hmrc-fetch] ✗ network failure', { method, ms: Date.now() - started, error: describeError(error) });
      throw error;
    }
  };
  (patched as unknown as { __debugPatched?: boolean }).__debugPatched = true;
  globalThis.fetch = patched;

  const missing = [
    'HMRC_CLIENT_ID', 'HMRC_CLIENT_SECRET', 'HMRC_REDIRECT_URI', 'APP_NAME', 'LICENSE_KEY',
    'SERVER_PUBLIC_IP', 'DB_CONNECTION_STRING', 'AUTH0_SECRET', 'AUTH0_DOMAIN', 'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET', 'APP_BASE_URL',
  ].filter((name) => !process.env[name]);
  console.log('[debug][startup]', {
    vercelEnv: process.env.VERCEL_ENV,
    vercel: process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV,
    redirectUri: process.env.HMRC_REDIRECT_URI,
    appBaseUrl: process.env.APP_BASE_URL,
    missingEnv: missing,
  });
}
