import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionDock, FactList, FactRow, PageHeading, StageRail } from './SurfacePrimitives';

const resizeObservers: MockResizeObserver[] = [];

class MockResizeObserver {
  private callback: ResizeObserverCallback;
  target: Element | null = null;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObservers.push(this);
  }

  observe(target: Element) {
    this.target = target;
  }

  disconnect() {
    this.target = null;
  }

  trigger() {
    if (!this.target) return;
    this.callback([{ target: this.target } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

function updateDockHeight(dock: HTMLElement, height: number) {
  vi.spyOn(dock, 'getBoundingClientRect').mockReturnValue({ height } as DOMRect);
  const observer = resizeObservers.find(candidate => candidate.target === dock);
  act(() => observer?.trigger());
}

beforeEach(() => {
  resizeObservers.length = 0;
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
});

afterEach(() => {
  document.body.style.removeProperty('--action-dock-height');
  vi.unstubAllGlobals();
});

describe('surface primitives', () => {
  it('keeps page context and supporting copy associated with the heading', () => {
    render(<PageHeading kicker="Barang sekitar" title="Temukan barang baik" description="Lokasi tetap privat." leading={<a href="/">Kembali</a>} actions={<button type="button">Simpan</button>} />);
    expect(screen.getByRole('heading', { name: 'Temukan barang baik' })).toBeVisible();
    expect(screen.getByText('Lokasi tetap privat.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Kembali' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeVisible();
  });

  it('renders facts as one definition list', () => {
    const { container } = render(<FactList label="Detail barang"><FactRow icon="tag" label="Kondisi" value="Baik" /><FactRow icon="lock" label="Lokasi" value="Beji, Depok" /></FactList>);
    const list = container.querySelector('dl');
    expect(list).toHaveAttribute('aria-label', 'Detail barang');
    expect(list).not.toHaveAttribute('role');
    expect(list?.querySelectorAll('dt')).toHaveLength(2);
    expect(list?.querySelectorAll('dd')).toHaveLength(2);
    expect(within(list as HTMLElement).getByText('Kondisi')).toBeVisible();
    expect(container.querySelector('.fact-icon svg path')).toHaveAttribute('d', 'M20 13 13 20 4 11V4h7l9 9ZM8.5 8.5h.01');
    expect(container.querySelectorAll('.fact-icon svg path')[1]).toHaveAttribute('d', 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4');
  });

  it('marks only the active journey stage as current', () => {
    render(<StageRail label="Tahap transaksi" stages={[{ id: 'chat', label: 'Chat' }, { id: 'agree', label: 'Sepakat' }, { id: 'done', label: 'Selesai' }]} current="agree" />);
    const stages = within(screen.getByRole('list', { name: 'Tahap transaksi' })).getAllByRole('listitem');
    expect(stages.map(stage => stage.getAttribute('data-state'))).toEqual(['complete', 'current', 'pending']);
    expect(stages.filter(stage => stage.getAttribute('aria-current') === 'step')).toHaveLength(1);
    expect(screen.getByText('Sepakat').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Chat').closest('li')).not.toHaveAttribute('aria-current');
    expect(stages[0]).toHaveTextContent('Selesai');
    expect(stages[1]).toHaveTextContent('Tahap saat ini');
    expect(stages[2]).toHaveTextContent('Belum dimulai');
  });

  it('leaves every stage pending when the current id is invalid', () => {
    render(<StageRail label="Tahap transaksi" stages={[{ id: 'chat', label: 'Chat' }, { id: 'agree', label: 'Sepakat' }]} current="stale" />);
    const stages = within(screen.getByRole('list', { name: 'Tahap transaksi' })).getAllByRole('listitem');
    expect(stages.map(stage => stage.getAttribute('data-state'))).toEqual(['pending', 'pending']);
    expect(stages.every(stage => !stage.hasAttribute('aria-current'))).toBe(true);
    expect(stages.every(stage => stage.textContent?.includes('Belum dimulai'))).toBe(true);
  });

  it('names the sticky action group and reserves its scroll space', () => {
    const { container } = render(<ActionDock label="Aksi penawaran" note="Pilih langkah berikutnya." primary={<button type="button">Chat Dita</button>} secondary={<button type="button">Ajukan barter</button>} />);
    expect(screen.getByRole('group', { name: 'Aksi penawaran' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Chat Dita' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ajukan barter' })).toBeVisible();
    expect(screen.getByText('Pilih langkah berikutnya.')).toBeVisible();
    expect(container.querySelector('[data-action-dock-reservation]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('publishes actual measured height on mount and resize without retaining the fallback', () => {
    const view = render(<ActionDock label="Aksi" primary={<button type="button">Lanjut</button>} />);
    const dock = view.container.querySelector('.action-dock') as HTMLElement;
    expect(document.body.style.getPropertyValue('--action-dock-height')).toBe('');

    updateDockHeight(dock, 72);
    expect(document.body.style.getPropertyValue('--action-dock-height')).toBe('72px');

    updateDockHeight(dock, 188);
    expect(document.body.style.getPropertyValue('--action-dock-height')).toBe('188px');
    view.unmount();
    expect(document.body.style.getPropertyValue('--action-dock-height')).toBe('');
  });

  it('publishes the maximum live dock and recomputes it in either unmount order', () => {
    const first = render(<ActionDock label="Pertama" primary={<button type="button">Pertama</button>} />);
    const firstDock = first.container.querySelector('.action-dock') as HTMLElement;
    updateDockHeight(firstDock, 220);

    const second = render(<ActionDock label="Kedua" primary={<button type="button">Kedua</button>} />);
    const secondDock = second.container.querySelector('.action-dock') as HTMLElement;
    updateDockHeight(secondDock, 128);
    expect(document.body.style.getPropertyValue('--action-dock-height')).toBe('220px');

    first.unmount();
    expect(document.body.style.getPropertyValue('--action-dock-height')).toBe('128px');
    second.unmount();
    expect(document.body.style.getPropertyValue('--action-dock-height')).toBe('');

    const third = render(<ActionDock label="Ketiga" primary={<button type="button">Ketiga</button>} />);
    const thirdDock = third.container.querySelector('.action-dock') as HTMLElement;
    updateDockHeight(thirdDock, 128);
    const fourth = render(<ActionDock label="Keempat" primary={<button type="button">Keempat</button>} />);
    const fourthDock = fourth.container.querySelector('.action-dock') as HTMLElement;
    updateDockHeight(fourthDock, 220);
    expect(document.body.style.getPropertyValue('--action-dock-height')).toBe('220px');

    fourth.unmount();
    expect(document.body.style.getPropertyValue('--action-dock-height')).toBe('128px');
    third.unmount();
    expect(document.body.style.getPropertyValue('--action-dock-height')).toBe('');
  });
});
