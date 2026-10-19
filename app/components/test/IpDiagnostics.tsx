'use client';

import { useState } from 'react';
import { buildClientPayload } from '@/client/fraud/clientData';

type IpDiagnosticsResult = {
  application: {
    clientPublicIp: string | null;
    vendorPublicIp: string | null;
    vendorForwarded: string | null;
    configuredServerIps: {
      server: string | null;
      waf: string | null;
      server2: string | null;
    };
  };
  ipApi: {
    serverPublicIp: string | null;
    serverError: string | null;
  };
};

type IpLookupResult =
  | { ip: string; error: null }
  | { ip: null; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isIpDiagnosticsResult(value: unknown): value is IpDiagnosticsResult {
  if (!isRecord(value) || !isRecord(value.application) || !isRecord(value.ipApi)) return false;
  const application = value.application;
  const ipApi = value.ipApi;
  if (!isRecord(application.configuredServerIps)) return false;

  return isNullableString(application.clientPublicIp)
    && isNullableString(application.vendorPublicIp)
    && isNullableString(application.vendorForwarded)
    && isNullableString(application.configuredServerIps.server)
    && isNullableString(application.configuredServerIps.waf)
    && isNullableString(application.configuredServerIps.server2)
    && isNullableString(ipApi.serverPublicIp)
    && isNullableString(ipApi.serverError);
}

async function lookupBrowserPublicIp(): Promise<IpLookupResult> {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return { ip: null, error: `IP lookup failed with status ${response.status}.` };
    }

    const body: unknown = await response.json();
    if (
      typeof body !== 'object'
      || body === null
      || !('ip' in body)
      || typeof body.ip !== 'string'
    ) {
      return { ip: null, error: 'IP lookup returned an invalid response.' };
    }

    return { ip: body.ip, error: null };
  } catch {
    return { ip: null, error: 'Unable to reach the IP lookup API from this browser.' };
  }
}

async function readResponse(response: Response): Promise<IpDiagnosticsResult> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `IP diagnostics failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (!isIpDiagnosticsResult(body)) {
    throw new Error('The IP diagnostics response was invalid.');
  }

  return body;
}

function Value({ value }: { value: string | null }) {
  return <code className="break-all">{value ?? 'Not available'}</code>;
}

export default function IpDiagnostics() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IpDiagnosticsResult>();
  const [browserIp, setBrowserIp] = useState<IpLookupResult>();
  const [error, setError] = useState<string>();

  async function runDiagnostics() {
    setIsLoading(true);
    setError(undefined);
    setResult(undefined);
    setBrowserIp(undefined);

    try {
      const clientData = await buildClientPayload();
      const [serverResponse, browserLookup] = await Promise.all([
        fetch('/api/hmrc/fraud/ip-diagnostics', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientData }),
        }),
        lookupBrowserPublicIp(),
      ]);
      const diagnostics = await readResponse(serverResponse);
      setResult(diagnostics);
      setBrowserIp(browserLookup);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to collect IP diagnostic values.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="w-full max-w-4xl rounded-xl border border-slate-300 bg-white p-6 shadow">
      <h3 className="text-xl font-bold">IP address diagnostics</h3>
      <p className="mt-1 text-sm">
        Compare the IP values used by the app with public IP lookup results. Visible only to allowlisted testers.
      </p>

      {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}

      <button
        type="button"
        onClick={runDiagnostics}
        disabled={isLoading}
        className="mt-4 rounded-full bg-slate-800 px-4 py-2 text-white disabled:cursor-wait disabled:opacity-60"
      >
        {isLoading ? 'Checking IP addresses...' : 'Check IP addresses'}
      </button>

      {result && browserIp && (
        <div className="mt-6 overflow-x-auto">
          <h4 className="mb-2 text-lg font-semibold">IP address diagnostics</h4>
          <p className="mb-3 text-sm">
            Compares the IP values used by the app with public IP lookup results.
          </p>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300">
                <th className="p-2">Source</th>
                <th className="p-2">Client public IP</th>
                <th className="p-2">Server public IP</th>
                <th className="p-2">Server forwarding chain</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 align-top">
                <th className="p-2">Values used by the app</th>
                <td className="p-2"><Value value={result.application.clientPublicIp} /></td>
                <td className="p-2">
                  <div>HMRC vendor header: <Value value={result.application.vendorPublicIp} /></div>
                  <div>Configured server IP: <Value value={result.application.configuredServerIps.server} /></div>
                  <div>Configured WAF IP: <Value value={result.application.configuredServerIps.waf} /></div>
                  <div>Configured second server IP: <Value value={result.application.configuredServerIps.server2} /></div>
                </td>
                <td className="p-2"><Value value={result.application.vendorForwarded} /></td>
              </tr>
              <tr className="align-top">
                <th className="p-2">IP lookup API</th>
                <td className="p-2">
                  {browserIp.error ?? <Value value={browserIp.ip} />}
                </td>
                <td className="p-2">
                  {result.ipApi.serverError ?? <Value value={result.ipApi.serverPublicIp} />}
                </td>
                <td className="p-2 text-slate-600">
                  Not applicable; an IP lookup reports the address seen by that API, not the configured proxy chain.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
