// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Sidebar from '@/app/docs/components/Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/docs/user',
}));

describe('documentation navigation', () => {
  afterEach(cleanup);

  it('opens and closes the mobile documentation menu', () => {
    render(<Sidebar />);

    const button = screen.getByRole('button', { name: 'Show documentation menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Hide documentation menu' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Record CSV import and export' })).toHaveAttribute('href', '/docs/user/record-csv');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});
