import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDisplayDate, getFromDate, getToDate } from '../../../app/api/utils/ukTaxYear';

describe('tax-year date helpers', () => {
  it('returns the UK tax-year start and end dates', () => {
    expect(getFromDate('2015-16')).toBe('2015-04-06');
    expect(getToDate('2015-16')).toBe('2016-04-05');
  });

  it.each(['2015', '2015-2016', '2015-17', 'abcd-ef'])('rejects invalid tax year %s', (taxYear) => {
    expect(() => getFromDate(taxYear)).toThrow('Expected format YYYY-YY');
    expect(() => getToDate(taxYear)).toThrow('Expected format YYYY-YY');
  });

  it('uses the UK calendar date when determining the current tax year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-05T22:30:00.000Z'));
    expect(getFromDate()).toBe('2025-04-06');
    expect(getToDate()).toBe('2026-04-05');

    vi.setSystemTime(new Date('2026-04-05T23:30:00.000Z'));
    expect(getFromDate()).toBe('2026-04-06');
    expect(getToDate()).toBe('2027-04-05');
  });

  afterEach(() => vi.useRealTimers());
});

describe('formatDisplayDate', () => {
  it.each([
    ['2018-04-01', '1st April 2018'],
    ['2018-04-02', '2nd April 2018'],
    ['2018-04-03', '3rd April 2018'],
    ['2018-04-11', '11th April 2018'],
    ['2018-04-12', '12th April 2018'],
    ['2018-04-13', '13th April 2018'],
    ['2018-04-21', '21st April 2018']
  ])('formats %s as %s', (date, expected) => {
    expect(formatDisplayDate(date)).toBe(expected);
  });
});