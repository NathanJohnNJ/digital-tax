// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AnnualSummary from '@/app/components/ui/account/taxReturn/AnnualSummary';

vi.mock('@/client/fraud/clientData', () => ({
  buildClientPayload: vi.fn().mockResolvedValue({ connectionMethod: 'WEB_APP_VIA_SERVER' }),
}));

function apiResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  };
}

describe('AnnualSummary', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([
    {
      endDate: '2024-04-05',
      visible: ['Overlap relief used', 'Zero-emissions goods vehicle allowance', 'Electric charge-point allowance'],
      hidden: ['Transition profit amount', 'Adjustment to profits for Class 4 National Insurance', 'First-year allowance on plant and machinery'],
      businessDetailsChangedRecently: true,
    },
    {
      endDate: '2025-04-05',
      visible: ['Transition profit amount', 'Zero-emissions goods vehicle allowance', 'Electric charge-point allowance'],
      hidden: ['Overlap relief used', 'Adjustment to profits for Class 4 National Insurance', 'First-year allowance on plant and machinery'],
      businessDetailsChangedRecently: true,
    },
    {
      endDate: '2026-04-05',
      visible: ['Transition profit amount'],
      hidden: ['Overlap relief used', 'Zero-emissions goods vehicle allowance', 'Electric charge-point allowance', 'Adjustment to profits for Class 4 National Insurance', 'First-year allowance on plant and machinery'],
      businessDetailsChangedRecently: true,
    },
    {
      endDate: '2027-04-05',
      visible: ['Transition profit amount', 'Adjustment to profits for Class 4 National Insurance', 'First-year allowance on plant and machinery'],
      hidden: ['Overlap relief used', 'Zero-emissions goods vehicle allowance', 'Electric charge-point allowance'],
      businessDetailsChangedRecently: false,
    },
  ])('shows only fields supported by the annual schema for tax year ending $endDate', async ({
    endDate,
    visible,
    hidden,
    businessDetailsChangedRecently,
  }) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse({ submission: null })));
    render(
      <AnnualSummary
        nino="AB123456C"
        businessId="XAIS12345678910"
        startDate={`${Number(endDate.slice(0, 4)) - 1}-04-06`}
        endDate={endDate}
      />,
    );

    await screen.findByRole('button', { name: 'Save annual summary with HMRC' });
    for (const label of visible) expect(screen.getByLabelText(new RegExp(label))).toBeInTheDocument();
    for (const label of hidden) expect(screen.queryByLabelText(new RegExp(label))).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Business details changed recently') !== null).toBe(businessDetailsChangedRecently);
  });

  it('submits the 2026-27 schema fields and structured building allowance shape', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse({ submission: null }))
      .mockResolvedValueOnce(apiResponse({ success: true }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AnnualSummary
        nino="AB123456C"
        businessId="XAIS12345678910"
        startDate="2026-04-06"
        endDate="2027-04-05"
      />,
    );
    await screen.findByRole('button', { name: 'Save annual summary with HMRC' });

    fireEvent.change(screen.getByLabelText(/Transition profit amount/), { target: { value: '1200.50' } });
    fireEvent.change(screen.getByLabelText(/Transition profit acceleration amount/), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Adjustment to profits for Class 4 National Insurance/), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText(/First-year allowance on plant and machinery/), { target: { value: '400' } });
    fireEvent.change(screen.getByLabelText('Class 4 National Insurance exemption reason'), { target: { value: 'trustee' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add structured building allowance' }));

    const amountInputs = screen.getAllByLabelText('Allowance amount (£)');
    fireEvent.change(amountInputs[0], { target: { value: '75.25' } });
    fireEvent.change(screen.getByLabelText('Building postcode (required)'), { target: { value: 'SW1A 2AA' } });
    fireEvent.change(screen.getByLabelText('Building name'), { target: { value: 'Example House' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save annual summary with HMRC' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const submissionRequest = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    const submission = submissionRequest.annualSubmission;
    expect(submission.adjustments).toEqual({
      transitionProfitAmount: 1200.5,
      transitionProfitAccelerationAmount: 100,
      adjustmentToProfitsForClass4: 250,
    });
    expect(submission.allowances).toEqual({
      firstYearAllowanceOnPlantAndMachinery: 400,
      structuredBuildingAllowance: [{
        amount: 75.25,
        building: { name: 'Example House', postcode: 'SW1A 2AA' },
      }],
    });
    expect(submission.nonFinancials).toEqual({ class4NicsExemptionReason: 'trustee' });
    expect(submission.adjustments.overlapReliefUsed).toBeUndefined();
    expect(submission.allowances.zeroEmissionsGoodsVehicleAllowance).toBeUndefined();
    expect(submission.allowances.electricChargePointAllowance).toBeUndefined();
    expect(submission.nonFinancials.businessDetailsChangedRecently).toBeUndefined();
  });
});
