'use client';

import { useState } from 'react';
import { buildClientPayload } from '@/client/fraud/clientData';

type CalculationType = 'in-year' | 'intent-to-finalise';

type IndividualTaxCalculationProps = {
  nino: string;
  taxYear: string;
  calculationType: CalculationType;
};

type CalculationResult = {
  calculationId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export default function IndividualTaxCalculation({
  nino,
  taxYear,
  calculationType,
}: IndividualTaxCalculationProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculationResult>();
  const [error, setError] = useState<string>();
  const isInYear = calculationType === 'in-year';
  async function triggerCalculation() {
    setLoading(true);
    setResult(undefined);
    setError(undefined);

    try {
      const clientData = await buildClientPayload();
      const response = await fetch('/api/hmrc/userRestrictedAuth/individualTaxCalculation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientData, nino, taxYear, calculationType }),
      });
      const responseBody: unknown = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = isRecord(responseBody) && typeof responseBody.error === 'string'
          ? responseBody.error
          : 'HMRC could not trigger the tax calculation.';
        throw new Error(message);
      }
      if (!isRecord(responseBody) || typeof responseBody.calculationId !== 'string') {
        throw new Error('HMRC did not return a calculation ID.');
      }

      setResult({ calculationId: responseBody.calculationId });
    } catch (triggerError) {
      setError(triggerError instanceof Error ? triggerError.message : 'The tax calculation could not be triggered.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border-2 border-blue-400 bg-linear-to-tr from-gray-200 to-40% to-gray-50 p-4 shadow-md">
      <div className="mx-auto max-w-3xl text-center">
        <h3 className="text-xl font-bold text-gray-900">
          {isInYear ? 'In-Year Tax Calculation' : 'Intent-To-Finalise Tax Calculation'}
        </h3>
        <p className="mt-2 text-sm text-gray-700">
          {isInYear
            ? 'Request an estimate using information HMRC has received for this tax year. This does not submit or change your quarterly update.'
            : 'Request a calculation using information HMRC has received for this tax year. This is not a final declaration; submit all relevant income, claims, and adjustments before finalising.'}
        </p>
        <button
          type="button"
          onClick={triggerCalculation}
          disabled={loading}
          aria-busy={loading}
          className="mt-4 rounded-lg bg-linear-to-tr from-blue-700 to-blue-400 px-4 py-2 font-semibold text-white shadow-sm hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Generate Calculation
        </button>
      </div>

      {result && (
        <div role="status" className="mx-auto mt-4 max-w-3xl rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">HMRC accepted the calculation request.</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="font-semibold">Tax year</dt>
            <dd>{taxYear}</dd>
            <dt className="font-semibold">Calculation ID</dt>
            <dd className="break-all font-mono">{result.calculationId}</dd>
          </dl>
        </div>
      )}
      {error && (
        <p role="alert" className="mx-auto mt-4 max-w-3xl rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
    </section>
  );
}
