import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ListingProgressRail } from './ListingProgressRail';

it('exposes current, reached, and locked listing stages', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<ListingProgressRail current={1} furthestReached={2} onSelect={onSelect} />);

  expect(screen.getByRole('list', { name: 'Tahap memasang penawaran' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Tahap 2: Detail' })).toHaveAttribute('aria-current', 'step');
  expect(screen.getByRole('button', { name: 'Tahap 3: Ketersediaan' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Tahap 4: Tinjau' })).toBeDisabled();

  await user.click(screen.getByRole('button', { name: 'Tahap 1: Penawaran' }));
  expect(onSelect).toHaveBeenCalledWith(0);
});
