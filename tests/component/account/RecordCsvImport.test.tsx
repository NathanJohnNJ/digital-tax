// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RecordCsvImport from '@/app/components/ui/account/RecordCsvImport';

const businessId = '11111111-1111-4111-8111-111111111111';
const csv = 'recordDate,recordType,category,description,sourceAmount,sourceCurrency,amountGbp\n2026-04-08,income,turnover,Invoice,125.50,GBP,125.50\n';
const businessResponse = {
  businesses: [{ recordBusinessId: businessId, hmrcBusinessId: 'XBIS12345678901', typeOfBusiness: 'self-employment', tradingName: 'Design' }],
};
const preview = {
  batchId: '22222222-2222-4222-8222-222222222222',
  contentSha256: 'abc',
  totalRows: 1,
  possibleDuplicates: [2],
  rows: [{
    rowNumber: 2,
    record: {
      recordDate: '2026-04-08', recordType: 'income', category: 'turnover',
      description: 'Invoice', sourceAmount: '125.50', sourceCurrency: 'GBP', amountGbp: '125.50',
      exchangeRate: null, exchangeRateDate: null, exchangeRateSource: null,
      foreignPropertyId: null, foreignPropertyCountryCode: null,
    },
  }],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function chooseFile() {
  const file = new File([csv], 'records.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => csv });
  fireEvent.change(screen.getByLabelText('CSV file'), { target: { files: [file] } });
  await screen.findByText('Map columns');
}

describe('record CSV import screen', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('previews mapped values, requires duplicate confirmation and retries the same batch after a lost response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(businessResponse))
      .mockResolvedValueOnce(jsonResponse(preview))
      .mockRejectedValueOnce(new Error('Network disconnected'))
      .mockResolvedValueOnce(jsonResponse({ importedRows: 1, alreadyCommitted: true }));
    vi.stubGlobal('fetch', fetchMock);
    render(<RecordCsvImport />);

    await screen.findByRole('option', { name: /Design/ });
    expect(screen.getByRole('link', { name: 'Download blank CSV template' })).toHaveAttribute('download', 'digital-records-template.csv');
    fireEvent.change(screen.getByLabelText('Verified business'), { target: { value: businessId } });
    await chooseFile();
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }));

    const review = await screen.findByRole('region', { name: 'Review 1 records' });
    expect(within(review).getByText('Invoice')).toBeInTheDocument();
    expect(within(review).getByText(/Possible existing duplicates on CSV rows: 2/)).toBeInTheDocument();
    expect(within(review).getByRole('button', { name: 'Import records' })).toBeDisabled();
    fireEvent.click(within(review).getByRole('checkbox'));
    fireEvent.click(within(review).getByRole('button', { name: 'Import records' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('retry this same import');
    fireEvent.click(within(review).getByRole('button', { name: 'Import records' }));
    expect(await screen.findByText(/1 records were already imported/)).toBeInTheDocument();
    const firstCommit = JSON.parse(String(fetchMock.mock.calls[2][1].body));
    const retryCommit = JSON.parse(String(fetchMock.mock.calls[3][1].body));
    expect(firstCommit).toEqual(retryCommit);
    expect(firstCommit).toMatchObject({
      mode: 'commit',
      batchId: preview.batchId,
      contentSha256: preview.contentSha256,
      confirmPossibleDuplicates: true,
    });
  });

  it('shows row validation errors and does not allow an invalid file to be imported', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(businessResponse))
      .mockResolvedValueOnce(jsonResponse({ error: 'CSV contains invalid rows', rowErrors: [{ rowNumber: 2, error: 'Invalid category' }] }, 400));
    vi.stubGlobal('fetch', fetchMock);
    render(<RecordCsvImport />);
    await screen.findByRole('option', { name: /Design/ });
    fireEvent.change(screen.getByLabelText('Verified business'), { target: { value: businessId } });
    await chooseFile();
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Row 2: Invalid category');
    expect(screen.queryByRole('button', { name: 'Import records' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clears a preview if a column mapping changes', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(businessResponse))
      .mockResolvedValueOnce(jsonResponse({ ...preview, possibleDuplicates: [] })));
    render(<RecordCsvImport />);
    await screen.findByRole('option', { name: /Design/ });
    fireEvent.change(screen.getByLabelText('Verified business'), { target: { value: businessId } });
    await chooseFile();
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }));
    await screen.findByRole('region', { name: 'Review 1 records' });
    fireEvent.change(screen.getByLabelText('Category (required)'), { target: { value: '' } });
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Review 1 records' })).not.toBeInTheDocument());
  });
});
