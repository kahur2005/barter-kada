import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useListingGateway } from './ListingContext';
import type { MineListing } from './gateway';

const tabs: Array<{ key: MineListing['lifecycle']; label: string }> = [{ key: 'active', label: 'Aktif' }, { key: 'draft', label: 'Draft' }, { key: 'archived', label: 'Arsip' }, { key: 'completed', label: 'Selesai' }];

function publisherLabel(item: MineListing): string {
  return item.publisher?.kind === 'store' ? `Toko: ${item.publisher.storeName}` : 'Profil pribadi';
}

export function MyListingsPage() {
  const gateway = useListingGateway(); const [tab, setTab] = useState<MineListing['lifecycle']>('active');
  const [data, setData] = useState<{ items: MineListing[]; activeCount: number; activeLimit: number } | null>(null);
  const [error, setError] = useState<string | null>(null); const [pendingId, setPendingId] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!gateway) return; setError(null);
    try { setData(await gateway.listMine(tab)); } catch { setError('Daftar listing belum dapat dimuat. Coba lagi.'); }
  }, [gateway, tab]);
  useEffect(() => { void load(); }, [load]);
  async function archive(item: MineListing) {
    if (!gateway || item.reserved) return; setPendingId(item.listingId); setError(null);
    try { await gateway.archive(item.listingId, item.version); await load(); } catch { setError('Listing belum dapat diarsipkan. Periksa apakah ada transaksi aktif.'); }
    finally { setPendingId(null); }
  }
  if (!gateway) return <section className="my-listings"><h1>Listing saya</h1><p className="preview-form-notice">Daftar milik akun tidak tersedia pada mode data contoh.</p><Link className="button" to="/listings/new">Coba form penawaran</Link></section>;
  return <section className="my-listings"><header><div><p className="eyebrow">Kelola dagangan dan barang pribadi</p><h1>Listing saya</h1></div><Link className="button" to="/listings/new">Pasang baru</Link></header>
    {data && <p className="quota-counter"><strong>{data.activeCount} dari {data.activeLimit} aktif</strong><span>Batas diambil dari pengaturan server.</span></p>}
    <div className="owner-tabs" role="tablist" aria-label="Status listing">{tabs.map(item => <button key={item.key} role="tab" aria-selected={tab === item.key} onClick={() => { setTab(item.key); setData(null); }}>{item.label}</button>)}</div>
    {error && <p className="form-alert" role="alert">{error}</p>}
    {!data && !error && <p role="status">Memuat listing…</p>}
    {data?.items.length === 0 && <div className="status-panel"><h2>Belum ada listing di bagian ini</h2><p>Draft, arsip, dan listing selesai tidak memakai kuota aktif.</p></div>}
    <div className="owner-list">{data?.items.map(item => <article key={item.listingId}><div><span className="label">{tabs.find(candidate => candidate.key === item.lifecycle)?.label}</span><h2>{item.title || 'Draft tanpa nama'}</h2><p className="publisher-line">{publisherLabel(item)}</p><p>Diperbarui {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(item.updatedAt))}</p></div><div className="owner-actions"><Link className="button secondary" to={`/my/listings/${item.listingId}/edit`}>Edit</Link>{item.lifecycle === 'active' && <button className="button secondary" aria-label={`Arsipkan ${item.title}`} disabled={item.reserved || pendingId === item.listingId} onClick={() => archive(item)}>Arsipkan</button>}</div>{item.reserved && <p className="reservation-note">Selesaikan atau batalkan transaksi aktif sebelum mengedit detail barang eksklusif atau mengarsipkannya.</p>}</article>)}</div>
  </section>;
}
