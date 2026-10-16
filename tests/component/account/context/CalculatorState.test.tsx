// @vitest-environment jsdom
import { afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalculatorStateProvider, rowsTotal, useCalculatorState } from '../../../../app/components/ui/account/context/CalculatorState';

function CalculatorHarness() {
  const { income, incomeTotal, updateRow, addRow, removeRow } = useCalculatorState();

  return (
    <div>
      {income.map((row, index) => (
        <div key={row.id}>
          <input
            aria-label={`Income row ${index + 1}`}
            value={row.value}
            onChange={(event) => updateRow('income', index, event.target.value)}
          />
          <button type="button" onClick={() => removeRow('income', index)}>
            Remove income row {index + 1}
          </button>
        </div>
      ))}
      <button type="button" onClick={() => addRow('income', 'additionalIncome')}>Add income row</button>
      <output aria-label="Income total">{incomeTotal}</output>
    </div>
  );
}

describe('rowsTotal', () => {
  it('sums numeric row values and treats empty or invalid values as zero', () => {
    expect(rowsTotal([
      { id: 0, field: 'turnover', value: '10.25' },
      { id: 1, field: 'other', value: '2.50' },
      { id: 2, field: 'empty', value: '' },
      { id: 3, field: 'invalid', value: 'invalid' }
    ])).toBe(12.75);
  });

  it('returns zero for an empty list', () => {
    expect(rowsTotal([])).toBe(0);
  });

  it('updates totals as rows are edited, added, and removed', async () => {
    const user = userEvent.setup();
    render(
      <CalculatorStateProvider>
        <CalculatorHarness />
      </CalculatorStateProvider>
    );

    await user.clear(screen.getByRole('textbox', { name: 'Income row 1' }));
    await user.type(screen.getByRole('textbox', { name: 'Income row 1' }), '10.25');
    expect(screen.getByLabelText('Income total')).toHaveTextContent('10.25');

    await user.click(screen.getByRole('button', { name: 'Add income row' }));
    await user.clear(screen.getByRole('textbox', { name: 'Income row 2' }));
    await user.type(screen.getByRole('textbox', { name: 'Income row 2' }), '2.50');
    expect(screen.getByLabelText('Income total')).toHaveTextContent('12.75');

    await user.click(screen.getByRole('button', { name: 'Remove income row 2' }));
    expect(screen.getByLabelText('Income total')).toHaveTextContent('10.25');
    await user.click(screen.getByRole('button', { name: 'Remove income row 1' }));
    expect(screen.getByRole('textbox', { name: 'Income row 1' })).toHaveValue('0.00');
    expect(screen.getByLabelText('Income total')).toHaveTextContent('0.00');
  });

  afterEach(cleanup);
});