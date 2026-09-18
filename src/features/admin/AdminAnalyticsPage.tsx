import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatusPanel } from '../../components/StatusPanel';
import { BackLink } from '../../components/NavigationLinks';
import { PageHeading } from '../../components/SurfacePrimitives';
import { useAdminGateway } from './AdminContext';

function dateInput(daysAgo: number) {
  const value = new Date();
  value.setDate(value.getDate() - daysAgo);
  return value.toISOString().slice(0, 10);
}
function percent(value: number | null) { return value === null ? '—' : `${(value * 100).toFixed(1)}%`; }
function seconds(value: number | null) { return value === null ? '—' : value < 60 ? `${Math.round(value)} detik` : `${(value / 60).toFixed(1)} menit`; }

export function AdminAnalyticsPage() {
  const gateway = useAdminGateway();
  const [from, setFrom] = useState(() => dateInput(27));
  const [to, setTo] = useState(() => dateInput(0));
  const query = useQuery({ queryKey: ['admin-product-metrics', from, to], queryFn: () => gateway!.getProductMetrics({ from, to }), enabled: Boolean(gateway) && Boolean(from) && Boolean(to) });
  if (!gateway) return <StatusPanel title="Analytics admin belum aktif"><p>Data metrik hanya tersedia setelah backend dan role admin dikonfigurasi.</p></StatusPanel>;
  return <section className="admin-analytics-page">
    <PageHeading leading={<BackLink to="/admin/reports">Kembali ke admin</BackLink>} kicker="Metrik produk tanpa data pribadi" title="Analytics Barter" description="Ringkasan aktivitas komunitas untuk membantu mengevaluasi listing, transaksi, chat, toko, dan Plus." />
    <form className="metrics-window" onSubmit={event => { event.preventDefault(); void query.refetch(); }}><label>Dari<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>Sampai<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label><button className="button" type="submit">Muat metrik</button></form>
    {query.isPending ? <StatusPanel title="Memuat metrik…" /> : query.error || !query.data ? <StatusPanel title="Metrik tidak dapat dimuat" error><p>Pastikan rentang tanggal valid dan akunmu memiliki role admin aktif.</p><button className="button" type="button" onClick={() => void query.refetch()}>Coba lagi</button></StatusPanel> : <>
      <div className="metrics-grid"><article className="metric-card"><span>Rata-rata respons chat</span><strong>{seconds(query.data.averageChatResponseSeconds)}</strong></article><article className="metric-card"><span>Retensi D7</span><strong>{percent(query.data.retention.d7Rate)}</strong><small>{query.data.retention.d7Users} dari {query.data.retention.cohortUsers} akun cohort</small></article><article className="metric-card"><span>Retensi W1</span><strong>{percent(query.data.retention.w1Rate)}</strong><small>{query.data.retention.w1Users} akun aktif kembali</small></article><article className="metric-card"><span>Store aktif</span><strong>{query.data.activeStoreCount}</strong><small>{query.data.activePlusUserCount} pengguna Plus aktif</small></article></div>
      <section className="metrics-section"><h2>Transaksi selesai</h2>{query.data.completedTransactions.length ? <dl className="metrics-list">{query.data.completedTransactions.map(item => <div key={item.kind}><dt>{item.kind === 'barter' ? 'Barter' : 'Pesanan'}</dt><dd>{item.count}</dd></div>)}</dl> : <p className="metadata">Belum ada transaksi pada rentang ini.</p>}</section>
      <section className="metrics-section"><h2>Listing aktif per area dan minggu</h2>{query.data.activeListingsByArea.length ? <div className="metrics-table"><div className="metrics-row metrics-header"><span>Minggu</span><span>Area</span><span>Listing aktif</span></div>{query.data.activeListingsByArea.map(item => <div className="metrics-row" key={`${item.weekStart}-${item.areaId}`}><span>{item.weekStart}</span><span>{item.areaId}</span><strong>{item.activeListings}</strong></div>)}</div> : <p className="metadata">Belum ada periode visibilitas listing.</p>}</section>
      <p className="metadata">Dibuat {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(query.data.generatedAt))}. Data agregat ini tidak menampilkan isi pesan, nomor telepon, atau alamat.</p>
    </>}
  </section>;
}
