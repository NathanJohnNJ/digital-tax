'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { parseCsv, RECORD_CSV_FIELDS, type RecordCsvField } from '@/lib/recordCsv';
import type { DigitalRecordInput } from '@/lib/digitalRecords';

type Business = {
  recordBusinessId: string;
  hmrcBusinessId: string;
  typeOfBusiness: string;
  tradingName: string | null;
};
type Mapping = Partial<Record<RecordCsvField, string>>;
type Preview = {
  batchId: string;
  contentSha256: string;
  totalRows: number;
  possibleDuplicates: number[];
  rows: { rowNumber: number; record: DigitalRecordInput }[];
};
type RowError = { rowNumber: number; error: string };

const labels: Record<RecordCsvField, string> = {
  recordDate: 'Record date',
  recordType: 'Income or expense',
  category: 'Category',
  description: 'Description',
  sourceAmount: 'Original amount',
  sourceCurrency: 'Original currency',
  amountGbp: 'Amount in GBP',
  exchangeRate: 'Exchange rate',
  exchangeRateDate: 'Exchange rate date',
  exchangeRateSource: 'Exchange rate source',
  foreignPropertyId: 'Foreign property ID',
  foreignPropertyCountryCode: 'Foreign property country code',
};
const requiredFields: readonly RecordCsvField[] = [
  'recordDate', 'recordType', 'category', 'sourceAmount', 'sourceCurrency', 'amountGbp',
];
const pageSize = 25;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBusiness(value: unknown): value is Business {
  return isObject(value)
    && typeof value.recordBusinessId === 'string'
    && typeof value.hmrcBusinessId === 'string'
    && typeof value.typeOfBusiness === 'string'
    && (typeof value.tradingName === 'string' || value.tradingName === null);
}

function isPreview(value: unknown): value is Preview {
  return isObject(value)
    && typeof value.batchId === 'string'
    && typeof value.contentSha256 === 'string'
    && typeof value.totalRows === 'number'
    && Array.isArray(value.possibleDuplicates)
    && value.possibleDuplicates.every((number: unknown) => typeof number === 'number')
    && Array.isArray(value.rows)
    && value.rows.length === value.totalRows
    && value.rows.every((row: unknown) => {
      if (!isObject(row) || typeof row.rowNumber !== 'number' || !isObject(row.record)) return false;
      const record = row.record;
      return RECORD_CSV_FIELDS.every((field) =>
        typeof record[field] === 'string'
        || (!requiredFields.includes(field) && field !== 'description' && record[field] === null));
    });
}

async function readResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error('The server returned an unexpected response. Please try again.');
  }
}

function responseError(body: unknown, fallback: string): string {
  return isObject(body) && typeof body.error === 'string' ? body.error : fallback;
}

export default function RecordCsvImport() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [businessError, setBusinessError] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [page, setPage] = useState(0);
  const [confirmDuplicates, setConfirmDuplicates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [result, setResult] = useState<{ importedRows: number; alreadyCommitted: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    async function loadBusinesses() {
      try {
        const response = await fetch('/api/records/businesses');
        const body = await readResponse(response);
        if (!response.ok) throw new Error(responseError(body, 'Unable to load your businesses.'));
        if (!isObject(body) || !Array.isArray(body.businesses) || !body.businesses.every(isBusiness)) {
          throw new Error('The server returned an unexpected business list.');
        }
        if (active) setBusinesses(body.businesses);
      } catch (loadError) {
        if (active) setBusinessError(loadError instanceof Error ? loadError.message : 'Unable to load your businesses.');
      } finally {
        if (active) setLoadingBusinesses(false);
      }
    }
    void loadBusinesses();
    return () => { active = false; };
  }, []);

  function clearPreview() {
    setPreview(null);
    setConfirmDuplicates(false);
    setResult(null);
    setError('');
    setRowErrors([]);
    setPage(0);
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    clearPreview();
    setCsvText('');
    setFileName('');
    setHeaders([]);
    setMapping({});
    if (!file) return;
    if (file.size > 4_000_000 || file.name.length > 255) {
      setError('Choose a CSV file with a name of at most 255 characters and a size of at most 4 MB.');
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      if (text.length > 1_000_000) throw new Error('CSV files must contain at most 1,000,000 characters.');
      const parsed = parseCsv(text.replace(/^\uFEFF/, ''));
      if (parsed.rows.length === 0 || parsed.rows.length > 5000) {
        throw new Error('CSV files must contain between 1 and 5,000 data rows.');
      }
      const initialMapping: Mapping = {};
      for (const field of RECORD_CSV_FIELDS) {
        if (parsed.headers.includes(field)) initialMapping[field] = field;
      }
      setCsvText(text);
      setFileName(file.name);
      setHeaders(parsed.headers);
      setMapping(initialMapping);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'Unable to read the CSV file.');
    } finally {
      setBusy(false);
    }
  }

  async function previewImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearPreview();
    if (!businessId || !csvText) {
      setError('Select a verified business and a CSV file.');
      return;
    }
    if (requiredFields.some((field) => !mapping[field])) {
      setError('Map every required field to a CSV column.');
      return;
    }
    const selected = Object.values(mapping).filter(Boolean);
    if (new Set(selected).size !== selected.length) {
      setError('Each mapped field must use a different CSV column.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/records/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'preview', recordBusinessId: businessId, csvText, columnMap: mapping }),
      });
      const body = await readResponse(response);
      if (!response.ok) {
        if (isObject(body) && Array.isArray(body.rowErrors)) {
          setRowErrors(body.rowErrors.filter((item: unknown): item is RowError =>
            isObject(item) && typeof item.rowNumber === 'number' && typeof item.error === 'string'));
        }
        throw new Error(responseError(body, 'Unable to preview this import.'));
      }
      if (!isPreview(body)) throw new Error('The server returned an unexpected preview. No records were imported.');
      setPreview(body);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Unable to preview this import.');
    } finally {
      setBusy(false);
    }
  }

  async function commitImport() {
    if (!preview || (preview.possibleDuplicates.length > 0 && !confirmDuplicates)) return;
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/records/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'commit', recordBusinessId: businessId, csvText, columnMap: mapping,
          batchId: preview.batchId, contentSha256: preview.contentSha256, fileName,
          confirmPossibleDuplicates: confirmDuplicates,
        }),
      });
      const body = await readResponse(response);
      if (!response.ok) {
        if (isObject(body) && Array.isArray(body.possibleDuplicates)
          && body.possibleDuplicates.every((number: unknown) => typeof number === 'number')) {
          setPreview({ ...preview, possibleDuplicates: body.possibleDuplicates });
          setConfirmDuplicates(false);
        }
        throw new Error(responseError(body, 'Unable to import these records.'));
      }
      if (!isObject(body) || typeof body.importedRows !== 'number' || typeof body.alreadyCommitted !== 'boolean') {
        throw new Error('The server returned an unexpected response. Retry this same import to check its outcome.');
      }
      setResult({ importedRows: body.importedRows, alreadyCommitted: body.alreadyCommitted });
    } catch (commitError) {
      setError(`${commitError instanceof Error ? commitError.message : 'Unable to import these records.'} If the outcome is uncertain, retry this same import before changing the file.`);
    } finally {
      setBusy(false);
    }
  }

  const visibleFields = RECORD_CSV_FIELDS.filter((field) => mapping[field]);
  const selectedBusiness = businesses.find((business) => business.recordBusinessId === businessId);
  const pageRows = preview?.rows.slice(page * pageSize, (page + 1) * pageSize) ?? [];
  const totalPages = preview ? Math.ceil(preview.rows.length / pageSize) : 0;
  const buttonClass = 'inline-block rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50';
  const inputClass = 'mt-1 block w-full rounded-md border border-gray-400 bg-white p-2 text-gray-900';

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-gray-900">
      <div>
        <h1 className="text-3xl font-bold">Import digital records</h1>
        <p className="mt-2">Import records for one HMRC-verified business. Imported records do not yet calculate or submit your quarterly update.</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <a className={buttonClass} href="/examples/digital-records-template.csv" download="digital-records-template.csv">Download blank CSV template</a>
          <Link className="text-blue-700 underline" href="/docs/user/record-csv">CSV format and category guidance</Link>
        </div>
      </div>
      {loadingBusinesses && <p role="status">Loading verified businesses...</p>}
      {businessError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{businessError}</p>}
      {!loadingBusinesses && !businessError && businesses.length === 0 && (
        <p className="rounded-lg bg-amber-50 p-3">No verified businesses found. Link HMRC and load your businesses from <Link className="text-blue-700 underline" href="/account">your account</Link>, then return here.</p>
      )}
      <form onSubmit={previewImport} className="space-y-5">
        <fieldset disabled={busy || Boolean(result)} className="space-y-5 disabled:opacity-70">
          <label className="block font-semibold">
            Verified business
            <select className={inputClass} value={businessId} onChange={(event) => { setBusinessId(event.target.value); clearPreview(); }}>
              <option value="">Select a business</option>
              {businesses.map((business) => (
                <option key={business.recordBusinessId} value={business.recordBusinessId}>
                  {business.tradingName || business.typeOfBusiness} ({business.typeOfBusiness}, {business.hmrcBusinessId})
                </option>
              ))}
            </select>
          </label>
          <label className="block font-semibold">
            CSV file
            <input key={fileInputKey} className={inputClass} type="file" accept=".csv,text/csv" onChange={selectFile} />
          </label>
          {headers.length > 0 && (
            <div>
              <h2 className="text-xl font-bold">Map columns</h2>
              <p className="mt-1 text-sm">Review each mapping. Matching template headers are selected for you. Fields marked required must be mapped.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {RECORD_CSV_FIELDS.map((field) => (
                  <label key={field} className="block text-sm font-semibold">
                    {labels[field]} {requiredFields.includes(field) ? '(required)' : '(optional)'}
                    <select className={inputClass} value={mapping[field] ?? ''} onChange={(event) => {
                      const value = event.target.value;
                      setMapping((current) => {
                        const next = { ...current };
                        if (value) next[field] = value;
                        else delete next[field];
                        return next;
                      });
                      clearPreview();
                    }}>
                      <option value="">Not mapped</option>
                      {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}
          <button type="submit" className={buttonClass} disabled={loadingBusinesses || !!businessError || businesses.length === 0}>Preview import</button>
        </fieldset>
      </form>
      {busy && <p role="status">Please wait...</p>}
      {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-red-900"><p>{error}</p>{rowErrors.length > 0 && <ul className="mt-2 list-disc pl-5">{rowErrors.map((item, index) => <li key={`${item.rowNumber}-${index}`}>Row {item.rowNumber}: {item.error}</li>)}</ul>}</div>}
      {preview && !result && (
        <section className="space-y-4 rounded-lg border border-gray-300 p-4" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="text-xl font-bold">Review {preview.totalRows} records</h2>
          <p>Business: {selectedBusiness?.tradingName || selectedBusiness?.typeOfBusiness} ({selectedBusiness?.hmrcBusinessId}).</p>
          <p>These are the validated values that will be saved. Check the business and every page before importing.</p>
          {preview.possibleDuplicates.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3">
              <p>Possible existing duplicates on CSV rows: {preview.possibleDuplicates.join(', ')}.</p>
              <label className="mt-2 flex items-start gap-2"><input type="checkbox" checked={confirmDuplicates} disabled={busy} onChange={(event) => setConfirmDuplicates(event.target.checked)} /> I reviewed these rows and want to import them anyway.</label>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead><tr><th scope="col" className="border p-2">CSV row</th>{visibleFields.map((field) => <th scope="col" className="border p-2" key={field}>{labels[field]}</th>)}</tr></thead>
              <tbody>{pageRows.map((row) => <tr key={row.rowNumber}><th scope="row" className="border p-2">{row.rowNumber}</th>{visibleFields.map((field) => <td className="border p-2" key={field}>{row.record[field] ?? '—'}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={buttonClass} disabled={busy || page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page + 1} of {totalPages}</span>
            <button type="button" className={buttonClass} disabled={busy || page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
          <button type="button" className={buttonClass} disabled={busy || (preview.possibleDuplicates.length > 0 && !confirmDuplicates)} onClick={commitImport}>Import records</button>
        </section>
      )}
      {result && (
        <div className="space-y-3">
          <p role="status" className="rounded-lg bg-green-50 p-3 text-green-900">{result.importedRows} records {result.alreadyCommitted ? 'were already imported in this batch' : 'imported successfully'}. Batch ID: {preview?.batchId}</p>
          <button type="button" className={buttonClass} onClick={() => {
            setCsvText('');
            setFileName('');
            setHeaders([]);
            setMapping({});
            setFileInputKey((current) => current + 1);
            clearPreview();
          }}>Import another file</button>
        </div>
      )}
    </section>
  );
}
