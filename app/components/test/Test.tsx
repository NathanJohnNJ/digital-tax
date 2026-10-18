'use client';

import { useState } from 'react';
import { buildClientPayload } from '@/client/fraud/clientData';

export default function Test() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>();

  const handleClick = async () => {
    setIsLoading(true);
    setResult(undefined);

    try {
      const clientData = await buildClientPayload();
      const response = await fetch('/api/hmrc/fraud/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });
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
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="bg-linear-to-tr from-amber-700 to-amber-200 to-80% hover:to-100% disabled:cursor-wait disabled:opacity-60 text-white p-3 rounded-full cursor-pointer"
      >
        {isLoading ? 'Validating headers...' : 'Validate fraud-prevention headers'}
      </button>
      {result && (
        <pre role="status" className="max-w-3xl overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-4 text-sm">
          {result}
        </pre>
      )}
    </div>
  );
}