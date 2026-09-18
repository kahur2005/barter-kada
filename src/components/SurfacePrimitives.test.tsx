import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActionDock, FactList, FactRow, PageHeading, StageRail } from './SurfacePrimitives';

describe('surface primitives', () => {
  it('keeps page context and supporting copy associated with the heading', () => {
    render(<PageHeading kicker="Barang sekitar" title="Temukan barang baik" description="Lokasi tetap privat." />);
    expect(screen.getByRole('heading', { name: 'Temukan barang baik' })).toBeVisible();
    expect(screen.getByText('Lokasi tetap privat.')).toBeVisible();
  });

  it('renders facts as one definition list', () => {
    render(<FactList label="Detail barang"><FactRow label="Kondisi" value="Baik" /><FactRow label="Lokasi" value="Beji, Depok" /></FactList>);
    expect(screen.getByRole('group', { name: 'Detail barang' })).toHaveTextContent('KondisiBaik');
  });

  it('marks only the active journey stage as current', () => {
    render(<StageRail label="Tahap transaksi" stages={[{ id: 'chat', label: 'Chat' }, { id: 'agree', label: 'Sepakat' }, { id: 'done', label: 'Selesai' }]} current="agree" />);
    expect(screen.getByText('Sepakat').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Chat').closest('li')).not.toHaveAttribute('aria-current');
  });

  it('names the sticky action group', () => {
    render(<ActionDock label="Aksi penawaran" primary={<button>Chat Dita</button>} secondary={<button>Ajukan barter</button>} />);
    expect(screen.getByRole('group', { name: 'Aksi penawaran' })).toBeVisible();
  });
});
