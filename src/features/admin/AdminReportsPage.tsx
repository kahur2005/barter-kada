import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { StatusPanel } from '../../components/StatusPanel';
import { useAdminGateway } from './AdminContext';
import type { ReportStatus } from './types';

const labels: Record<ReportStatus | 'all', string> = { all: 'Semua', open: 'Terbuka', under_review: 'Ditinjau', resolved: 'Selesai', rejected: 'Ditolak', decided: 'Diputuskan', closed: 'Ditutup' };
export function AdminReportsPage() {
  const gateway = useAdminGateway(); const [status, setStatus] = useState<ReportStatus | 'all'>('open');
  const query = useQuery({ queryKey: ['admin-reports', status], queryFn: () => gateway!.listReports({ status, cursor: null }), enabled: Boolean(gateway) });
  if (!gateway) return <StatusPanel title="Panel admin belum aktif"><p>Panel ini hanya tersedia setelah backend dan role admin dikonfigurasi.</p></StatusPanel>;
  if (query.isPending) return <StatusPanel title="Memuat antrean laporan…" />;
  if (query.error) return <StatusPanel title="Antrean laporan tidak dapat dimuat" error><p>Pastikan akunmu memiliki role admin aktif.</p><button className="button" type="button" onClick={() => void query.refetch()}>Coba lagi</button></StatusPanel>;
  const items = query.data?.items ?? [];
  return <section className="admin-reports-page"><header><p className="eyebrow">Moderasi terbatas per kasus</p><h1>Laporan komunitas</h1><p>Panel ini menampilkan konteks laporan yang diperlukan, bukan seluruh percakapan pengguna.</p><p><Link className="text-button" to="/admin/settings/limits">Atur batas listing</Link></p></header><label className="filter-label">Status<select value={status} onChange={event => setStatus(event.target.value as ReportStatus | 'all')}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{items.length ? <div className="admin-report-list">{items.map(item => <article key={item.id}><div><span className="label">{labels[item.status]}</span><h2><Link to={`/admin/reports/${item.id}`}>{item.context.title}</Link></h2><p>{item.reason} · {item.targetType} · {item.reporter.name}</p><time dateTime={item.createdAt}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(item.createdAt))}</time></div></article>)}</div> : <StatusPanel title="Antrean kosong"><p>Tidak ada laporan pada filter ini.</p></StatusPanel>}</section>;
}
