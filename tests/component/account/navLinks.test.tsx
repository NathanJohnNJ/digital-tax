// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import NavLinks from '../../../app/components/ui/account/navLinks';

vi.mock('next/navigation', () => ({
  usePathname: () => '/account/quarterly',
  useSearchParams: () => new URLSearchParams('nino=AB123456C&businessId=XBIS123')
}));

describe('account navigation', () => {
  afterEach(cleanup);

  it('preserves the selected business in account page links', () => {
    render(<NavLinks />);

    const overviewLink = screen.getByRole('link', { name: 'Business Overview' });
    const linkUrl = new URL(overviewLink.getAttribute('href')!, 'http://localhost');

    expect(linkUrl.pathname).toBe('/account/business-overview');
    expect(linkUrl.searchParams.get('nino')).toBe('AB123456C');
    expect(linkUrl.searchParams.get('businessId')).toBe('XBIS123');
  });
});