import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ListingMediaHero } from './ListingMediaHero';
import { ListingReview } from './ListingReview';
import type { ListingDraft } from './types';

const completeDraft: ListingDraft = {
  sourceLifecycle: 'draft',
  listingId: '20000000-0000-4000-8000-000000000002',
  expectedVersion: 1,
  publisher: { kind: 'personal' },
  modes: ['sale'],
  fulfillment: 'ready_stock',
  categoryId: 'home',
  title: 'Kursi kayu',
  description: 'Kursi kayu kokoh untuk ruang makan atau ruang kerja.',
  condition: 'good',
  defects: 'Ada bekas pakai ringan.',
  negotiable: false,
  barter: null,
  basePriceRupiah: '120000',
  variants: [],
  assetIds: ['30000000-0000-4000-8000-000000000003'],
  handoverMethods: ['meetup'],
  preorder: null,
  catering: null,
};

describe('listing review', () => {
  it('shows the essential public facts and returns to the requested stage', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<ListingReview draft={completeDraft} onEdit={onEdit} />);

    expect(screen.getByRole('heading', { name: 'Kursi kayu' })).toBeVisible();
    expect(screen.getByText((_, node) => node?.textContent?.replace(/\s/g, ' ') === 'Rp 120.000')).toBeVisible();
    expect(screen.getByText('Baik')).toBeVisible();
    expect(screen.getByText('Meet up')).toBeVisible();
    expect(screen.getByText(/Lokasi tepat tetap privat/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Edit detail penawaran' }));
    expect(onEdit).toHaveBeenCalledWith(1);
  });

  it('uses a deliberate fallback when a photo URL is unavailable', () => {
    render(<ListingMediaHero draft={completeDraft} stage={3} assetPreviews={{}} />);
    expect(screen.getByText('Foto utama sudah tersimpan')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('uses the selected primary image as the hero', () => {
    render(
      <ListingMediaHero
        draft={completeDraft}
        stage={3}
        assetPreviews={{ [completeDraft.assetIds[0]]: 'blob:chair' }}
      />,
    );
    expect(screen.getByRole('img', { name: 'Foto utama Kursi kayu' })).toHaveAttribute('src', 'blob:chair');
  });
});
