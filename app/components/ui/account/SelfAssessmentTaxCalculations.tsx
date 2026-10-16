'use client';

import { Fragment, useState } from 'react';
import { buildClientPayload } from '@/client/fraud/clientData';

type SelfAssessmentTaxCalculationsProps = {
  nino: string;
  businessId: string;
  taxYear: string;
};

type CalculationSummary = {
  calculationId: string;
  calculationType?: string;
  calculationTimestamp?: string;
};

type ResultRow =
  | { kind: 'section'; label: string; depth: number }
  | { kind: 'field'; label: string; value: string; depth: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function responseError(body: unknown, fallback: string) {
  return isRecord(body) && typeof body.error === 'string' ? body.error : fallback;
}

function isCalculationSummary(value: unknown): value is Record<string, unknown> & { calculationId: string } {
  return isRecord(value) && typeof value.calculationId === 'string';
}

function formatTimestamp(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB');
}

function formatLabel(value: string) {
  if (value === 'taxCalculation') return 'Tax Calculations';
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (firstCharacter) => firstCharacter.toUpperCase());
}

function formatFieldValue(field: string, value: unknown) {
  const numericValue = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value)
      ? Number(value)
      : undefined;
  const isNonMonetaryField = /(rate|percentage|percent|year|count|number|days|weeks|months|age|id|code|units|hours)/i.test(field);

  if (numericValue !== undefined && !isNonMonetaryField) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(numericValue);
  }
  return value === null ? 'null' : String(value);
}

function flattenResult(value: unknown): ResultRow[] {
  const rows: ResultRow[] = [];

  function addValue(child: unknown, label: string, depth: number) {
    if (Array.isArray(child)) {
      rows.push({ kind: 'section', label, depth });
      if (child.length === 0) {
        rows.push({ kind: 'field', label: 'Value', value: '(empty list)', depth: depth + 1 });
        return;
      }
      child.forEach((item, index) => {
        if (isRecord(item)) {
          const entries = Object.entries(item);
          if (entries.length === 0) {
            rows.push({ kind: 'field', label: 'Value', value: '(empty object)', depth: depth + 1 });
          }
          entries.forEach(([key, nestedValue]) => {
            const nestedLabel = formatLabel(key);
            if (isRecord(nestedValue) || Array.isArray(nestedValue)) {
              addValue(nestedValue, nestedLabel, depth + 1);
            } else {
              rows.push({
                kind: 'field',
                label: nestedLabel,
                value: formatFieldValue(key, nestedValue),
                depth: depth + 1,
              });
            }
          });
        } else if (Array.isArray(item)) {
          addValue(item, `Item ${index + 1}`, depth + 1);
        } else {
          rows.push({
            kind: 'field',
            label: `Item ${index + 1}`,
            value: formatFieldValue(label, item),
            depth: depth + 1,
          });
        }
      });
      return;
    }

    if (isRecord(child)) {
      rows.push({ kind: 'section', label, depth });
      const entries = Object.entries(child);
      if (entries.length === 0) {
        rows.push({ kind: 'field', label: 'Value', value: '(empty object)', depth: depth + 1 });
        return;
      }
      entries.forEach(([key, nestedValue]) => {
        const nestedLabel = formatLabel(key);
        if (isRecord(nestedValue) || Array.isArray(nestedValue)) {
          addValue(nestedValue, nestedLabel, depth + 1);
        } else {
          rows.push({
            kind: 'field',
            label: nestedLabel,
            value: formatFieldValue(key, nestedValue),
            depth: depth + 1,
          });
        }
      });
      return;
    }

    rows.push({ kind: 'field', label, value: formatFieldValue(label, child), depth });
  }

  if (isRecord(value) && isRecord(value.calculation)) {
    Object.entries(value).forEach(([key, child]) => {
      if (key === 'calculation' && isRecord(child)) {
        Object.entries(child).forEach(([calculationKey, calculationValue]) => {
          const label = formatLabel(calculationKey);
          if (isRecord(calculationValue) || Array.isArray(calculationValue)) {
            addValue(calculationValue, label, 0);
          } else {
            rows.push({
              kind: 'field',
              label,
              value: formatFieldValue(calculationKey, calculationValue),
              depth: 0,
            });
          }
        });
        return;
      }

      const label = key === 'metadata' ? 'Metadata' : formatLabel(key);
      if (isRecord(child) || Array.isArray(child)) {
        addValue(child, label, 0);
      } else {
        rows.push({ kind: 'field', label, value: formatFieldValue(key, child), depth: 0 });
      }
    });
  } else if (isRecord(value)) {
    Object.entries(value).forEach(([key, child]) => {
      const label = formatLabel(key);
      if (isRecord(child) || Array.isArray(child)) {
        addValue(child, label, 0);
      } else {
        rows.push({ kind: 'field', label, value: formatFieldValue(key, child), depth: 0 });
      }
    });
  } else {
    rows.push({ kind: 'field', label: 'Value', value: formatFieldValue('Value', value), depth: 0 });
  }

  return rows;
}

export default function SelfAssessmentTaxCalculations({
  nino,
  businessId,
  taxYear,
}: SelfAssessmentTaxCalculationsProps) {
  const [calculations, setCalculations] = useState<CalculationSummary[]>();
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string>();
  const [expandedCalculations, setExpandedCalculations] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [retrievedResults, setRetrievedResults] = useState<Record<string, ResultRow[]>>({});
  const [retrievalLoading, setRetrievalLoading] = useState<Record<string, boolean>>({});
  const [retrievalErrors, setRetrievalErrors] = useState<Record<string, string>>({});

  async function loadCalculations() {
    setListLoading(true);
    setListError(undefined);
    setCalculations(undefined);
    setExpandedCalculations({});
    setExpandedSections({});
    setRetrievedResults({});
    setRetrievalErrors({});

    try {
      const clientData = await buildClientPayload();
      const response = await fetch('/api/hmrc/userRestrictedAuth/listSelfAssessmentTaxCalculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientData, nino, businessId, taxYear }),
      });
      const responseBody: unknown = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new Error(responseError(responseBody, 'HMRC could not list tax calculations.'));
      }
      if (!isRecord(responseBody) || !Array.isArray(responseBody.calculations)) {
        throw new Error('HMRC returned an unexpected tax-calculations response.');
      }

      const items = responseBody.calculations;
      if (!items.every(isCalculationSummary)) {
        throw new Error('HMRC returned a tax calculation without a calculation ID.');
      }
      setCalculations(items.map((item) => ({
        calculationId: item.calculationId,
        calculationType: typeof item.calculationType === 'string' ? item.calculationType : undefined,
        calculationTimestamp: typeof item.calculationTimestamp === 'string' ? item.calculationTimestamp : undefined,
      })));
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'HMRC could not list tax calculations.');
    } finally {
      setListLoading(false);
    }
  }

  async function toggleCalculation(calculationId: string) {
    if (expandedCalculations[calculationId]) {
      setExpandedCalculations((current) => ({ ...current, [calculationId]: false }));
      return;
    }

    setExpandedCalculations((current) => ({ ...current, [calculationId]: true }));
    if (retrievedResults[calculationId]) return;

    setRetrievalLoading((current) => ({ ...current, [calculationId]: true }));
    setRetrievalErrors((current) => ({ ...current, [calculationId]: '' }));
    try {
      const clientData = await buildClientPayload();
      const response = await fetch('/api/hmrc/userRestrictedAuth/retrieveSelfAssessmentTaxCalculation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientData, nino, taxYear, calculationId }),
      });
      const responseBody: unknown = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new Error(responseError(responseBody, 'HMRC could not retrieve this tax calculation.'));
      }
      if (responseBody === undefined) {
        throw new Error('HMRC returned an empty tax calculation.');
      }

      setRetrievedResults((current) => ({
        ...current,
        [calculationId]: flattenResult(responseBody),
      }));
      setExpandedSections((current) => Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(`${calculationId}:`)),
      ));
    } catch (error) {
      setRetrievalErrors((current) => ({
        ...current,
        [calculationId]: error instanceof Error
          ? error.message
          : 'HMRC could not retrieve this tax calculation.',
      }));
    } finally {
      setRetrievalLoading((current) => ({ ...current, [calculationId]: false }));
    }
  }

  function getResultRowsWithVisibility(rows: ResultRow[], calculationId: string) {
    const sectionStack: number[] = [];
    const rowsWithVisibility: { row: ResultRow; index: number; visible: boolean }[] = [];

    rows.forEach((row, index) => {
      const ancestors = sectionStack.slice(0, row.depth);
      const ancestorsExpanded = ancestors.every((sectionIndex) =>
        expandedSections[`${calculationId}:${sectionIndex}`],
      );
      rowsWithVisibility.push({ row, index, visible: ancestorsExpanded });

      if (row.kind === 'section') {
        sectionStack[row.depth] = index;
        sectionStack.length = row.depth + 1;
      }
    });
    return rowsWithVisibility;
  }

  function toggleSection(calculationId: string, index: number) {
    const key = `${calculationId}:${index}`;
    setExpandedSections((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <section className="mt-6 rounded-2xl border-2 border-blue-400 bg-linear-to-tr from-gray-200 to-40% to-gray-50 p-4 shadow-md">
      <div className="mx-auto max-w-5xl text-center">
        <h3 className="text-xl font-bold text-gray-900">Self Assessment Tax Calculations</h3>
        <p className="mt-2 text-sm text-gray-700">
          View calculations HMRC has generated for tax year {taxYear}.
        </p>
        <button
          type="button"
          onClick={loadCalculations}
          disabled={listLoading}
          aria-busy={listLoading}
          className="mt-4 rounded-lg bg-linear-to-tr from-blue-700 to-blue-400 px-4 py-2 font-semibold text-white shadow-sm hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {listLoading ? 'Loading Calculations...' : 'Show Tax Calculations'}
        </button>
      </div>

      {listError && (
        <p role="alert" className="mx-auto mt-4 max-w-5xl rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {listError}
        </p>
      )}

      {calculations && (
        calculations.length === 0 ? (
          <p role="status" className="mx-auto mt-4 max-w-5xl rounded-lg border border-blue-200 bg-white/70 p-3 text-sm text-gray-700">
            HMRC has no tax calculations for this tax year.
          </p>
        ) : (
          <div className="mx-auto mt-4 max-w-5xl overflow-x-auto rounded-lg border border-blue-200 bg-white">
            <table className="w-full table-fixed border-collapse text-left text-sm text-gray-700">
              <caption className="sr-only">Self Assessment tax calculations for {taxYear}</caption>
              <thead className="bg-blue-50 text-gray-900">
                <tr>
                  <th scope="col" className="px-3 py-2">Calculation ID</th>
                  <th scope="col" className="px-3 py-2">Type</th>
                  <th scope="col" className="px-3 py-2">Created</th>
                  <th scope="col" className="px-3 py-2">Calculation</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((calculation) => {
                  const { calculationId } = calculation;
                  const expanded = Boolean(expandedCalculations[calculationId]);
                  const loading = Boolean(retrievalLoading[calculationId]);
                  const result = retrievedResults[calculationId];
                  const error = retrievalErrors[calculationId];

                  return (
                    <Fragment key={calculationId}>
                      <tr className="border-t border-blue-100">
                        <th scope="row" className="break-all px-3 py-2 font-mono font-normal">{calculationId}</th>
                        <td className="px-3 py-2">{calculation.calculationType ?? '—'}</td>
                        <td className="px-3 py-2">{formatTimestamp(calculation.calculationTimestamp)}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleCalculation(calculationId)}
                            disabled={loading}
                            aria-expanded={expanded}
                            aria-busy={loading}
                            className="rounded-lg bg-linear-to-tr from-blue-700 to-blue-400 px-3 py-2 font-semibold text-white shadow-sm hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {loading ? 'Retrieving...' : expanded ? 'Hide Calculation' : 'Retrieve Calculation'}
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-t border-blue-100 bg-gray-50">
                          <td colSpan={4} className="px-3 py-3">
                            {loading && <p role="status">Retrieving calculation...</p>}
                            {error && <p role="alert" className="font-semibold text-red-800">{error}</p>}
                            {result && (
                              <div className="overflow-x-auto rounded-lg border border-blue-200 bg-white px-3 py-2 md:overflow-x-hidden">
                                <table className="mx-auto w-max min-w-max table-auto border-collapse text-left text-sm text-gray-700 md:w-full md:min-w-0 md:table-fixed">
                                  <caption className="sr-only">Details for calculation {calculationId}</caption>
                                  <colgroup>
                                    <col className="md:w-[42%]" />
                                    <col className="md:w-[58%]" />
                                  </colgroup>
                                  <thead className="bg-blue-50 text-gray-900">
                                    <tr>
                                      <th scope="col" className="whitespace-nowrap px-3 py-2 md:whitespace-normal">Field</th>
                                      <th scope="col" className="px-3 py-2">Value</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {getResultRowsWithVisibility(result, calculationId).map(({ row, index, visible }) => (
                                      row.kind === 'section' ? (
                                        <tr
                                          key={`section-${index}`}
                                          aria-hidden={!visible}
                                          style={{ visibility: visible ? 'visible' : 'collapse' }}
                                          className="border-t border-blue-100 bg-blue-50/70"
                                        >
                                          <th
                                            scope="rowgroup"
                                            colSpan={2}
                                            className="px-3 py-1.5 font-semibold text-gray-900"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => toggleSection(calculationId, index)}
                                              aria-expanded={Boolean(expandedSections[`${calculationId}:${index}`])}
                                              className="flex w-full items-center gap-2 text-left"
                                              style={{ paddingLeft: `${row.depth * 1.25}rem` }}
                                            >
                                              <span>{row.label}</span>
                                              <svg
                                                aria-hidden="true"
                                                viewBox="0 0 20 20"
                                                fill="none"
                                                className={`size-4 shrink-0 transition-transform duration-200 ease-in-out ${
                                                  expandedSections[`${calculationId}:${index}`] ? 'rotate-180' : ''
                                                }`}
                                              >
                                                <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                              </svg>
                                            </button>
                                          </th>
                                        </tr>
                                      ) : (
                                        <tr
                                          key={`field-${index}`}
                                          aria-hidden={!visible}
                                          style={{ visibility: visible ? 'visible' : 'collapse' }}
                                          className="border-t border-blue-100"
                                        >
                                          <th
                                            scope="row"
                                            className="whitespace-nowrap px-3 py-2 font-medium md:whitespace-normal"
                                            style={{ paddingLeft: `${0.75 + row.depth * 1.25}rem` }}
                                          >
                                            {row.label}
                                          </th>
                                          <td className="px-3 py-2 wrap-break-word text-right tabular-nums">{row.value}</td>
                                        </tr>
                                      )
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}
