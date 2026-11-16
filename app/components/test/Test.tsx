'use client';

import { useState } from 'react';
import { buildClientPayload } from '@/client/fraud/clientData';

function parseFraudHeaders(encoded: string): Record<string, string> | null {
  try {
    const value: unknown = JSON.parse(atob(encoded));
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

    const headers: Record<string, string> = {};
    for (const [name, headerValue] of Object.entries(value)) {
      if (!name.startsWith('Gov-') || typeof headerValue !== 'string') return null;
      headers[name] = headerValue;
    }

    return Object.keys(headers).length > 0 ? headers : null;
  } catch {
    return null;
  }
}

export default function Test() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>();
  const [fraudHeaders, setFraudHeaders] = useState<Record<string, string>>();
  const [headerError, setHeaderError] = useState<string>();

  const handleClick = async () => {
    setIsLoading(true);
    setResult(undefined);
    setFraudHeaders(undefined);
    setHeaderError(undefined);

    try {
      const clientData = await buildClientPayload();
      const response = await fetch('/api/hmrc/fraud/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });
      const encodedHeaders = response.headers.get('X-Fraud-Prevention-Headers');
      const parsedHeaders = encodedHeaders ? parseFraudHeaders(encodedHeaders) : null;
      if (parsedHeaders) {
        setFraudHeaders(parsedHeaders);
      } else {
        setHeaderError('The validation request completed, but its sent-header diagnostics were unavailable.');
      }
      const body = await response.text();
      let formattedBody = body;

      try {
        formattedBody = JSON.stringify(JSON.parse(body), null, 2);
      } catch {
        // HMRC may return a non-JSON error response.
      }

      setResult(`HTTP ${response.status}\n${formattedBody || '(empty response)'}`);
    } catch {
      setResult('Unable to reach the fraud-prevention validation API. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <section className="w-full max-w-4xl rounded-xl border border-slate-300 bg-white p-6 shadow">
        <h3 className="text-xl font-bold">Fraud-prevention headers sent to HMRC</h3>
        <p className="mt-1 text-sm">
          This table shows the exact Gov-* header values sent by the validation request.
        </p>
        <button
          type="button"
          onClick={handleClick}
          disabled={isLoading}
          className="mt-4 bg-linear-to-tr from-amber-700 to-amber-200 to-80% hover:to-100% disabled:cursor-wait disabled:opacity-60 text-white p-3 rounded-full cursor-pointer"
        >
          {isLoading ? 'Validating headers...' : 'Validate fraud-prevention headers'}
        </button>
        <div className="mt-4">
          <table className="block w-full border-collapse text-left text-sm sm:table">
            <thead className="hidden sm:table-header-group">
              <tr className="border-b border-slate-300">
                <th scope="col" className="p-2">Header</th>
                <th scope="col" className="p-2">Sent value</th>
              </tr>
            </thead>
            <tbody className="block sm:table-row-group">
              {fraudHeaders
                ? Object.entries(fraudHeaders).map(([name, value]) => (
                  <tr key={name} className="block border-b border-slate-200 py-2 align-top sm:table-row sm:py-0">
                    <th scope="row" className="block break-all px-2 font-mono sm:table-cell sm:whitespace-nowrap sm:p-2">{name}</th>
                    <td className="block break-all px-2 font-mono sm:table-cell sm:p-2">{value || '(empty)'}</td>
                  </tr>
                ))
                : (
                  <tr className="block sm:table-row">
                    <td colSpan={2} className="block p-3 text-slate-600 sm:table-cell">
                      Run the validation request to display the headers sent to HMRC.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
        {headerError && <p role="alert" className="mt-3 text-red-700">{headerError}</p>}
      </section>
      {result && (
        <pre role="status" className="w-full max-w-3xl whitespace-pre-wrap break-all rounded-lg bg-slate-100 p-4 text-sm">
          {result}
        </pre>
      )}
    </div>
  );
}