import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { StatusPanel } from '../../components/StatusPanel';
import { PageHeading } from '../../components/SurfacePrimitives';
import { useAdminGateway } from './AdminContext';

export function AdminSettingsLimitsPage() {
  const gateway = useAdminGateway();
  const client = useQueryClient();
  const settings = useQuery({ queryKey: ['admin-plan-settings'], queryFn: () => gateway!.getPlanSettings(), enabled: Boolean(gateway) });
  const history = useQuery({ queryKey: ['admin-plan-settings-history'], queryFn: () => gateway!.listPlanSettingsHistory(null), enabled: Boolean(gateway) });
  const [personal, setPersonal] = useState('');
  const [storeProducts, setStoreProducts] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = useMutation({
    mutationFn: () => gateway!.updatePlanLimits({ expectedVersion: settings.data!.version, personalActiveLimit: Number(personal), storeProductActiveLimit: Number(storeProducts), reason: reason.trim(), idempotencyKey: crypto.randomUUID() }),
    onSuccess: data => { client.setQueryData(['admin-plan-settings'], data); void client.invalidateQueries({ queryKey: ['admin-plan-settings-history'] }); setPersonal(''); setStoreProducts(''); setReason(''); setConfirmed(false); setError(null); },
  });
  if (!gateway) return <StatusPanel title="Panel admin belum aktif"><p>Pengaturan ini hanya tersedia setelah backend dan role admin dikonfigurasi.</p></StatusPanel>;
  if (settings.isPending) return <StatusPanel title="Memuat batas platform…" />;
  if (settings.error || !settings.data) return <StatusPanel title="Batas platform tidak dapat dimuat" error><button className="button" type="button" onClick={() => void settings.refetch()}>Coba lagi</button></StatusPanel>;
  const current = settings.data;
  const personalValue = Number(personal);
  const storeValue = Number(storeProducts);
  const hasDraft = Number.isInteger(personalValue) && personalValue > 0 && Number.isInteger(storeValue) && storeValue > 0 && reason.trim().length >= 10;
  function submit(event: FormEvent) { event.preventDefault(); if (!hasDraft) { setError('Isi batas positif dan alasan minimal 10 karakter.'); return; } if (!confirmed) { setError('Konfirmasi ringkasan perubahan terlebih dahulu.'); return; } setError(null); update.mutate(); }
  return <section className="admin-settings-page"><PageHeading leading={<Link className="back-link" to="/admin/reports">Kembali ke admin</Link>} kicker="Konfigurasi operasional" title="Batas listing" description="Perubahan hanya memengaruhi publikasi baru. Listing lama tidak dihapus otomatis." /><section className="case-context"><p><strong>Versi konfigurasi:</strong> {current.version}</p><p><strong>Saat ini:</strong> {current.personalActiveLimit} listing pribadi · {current.storeProductActiveLimit} produk per toko · maksimal {current.maxStores} toko Plus</p><p className="metadata">Pemilik yang sudah di atas batas baru akan tetap memiliki listingnya, tetapi publikasi berikutnya ditolak sampai batas dinaikkan.</p></section><form className="stack-form" onSubmit={submit}><label>Batas listing pribadi<input inputMode="numeric" value={personal} onChange={event => setPersonal(event.target.value.replace(/\D/g, ''))} placeholder={String(current.personalActiveLimit)} /></label><label>Batas produk aktif per toko<input inputMode="numeric" value={storeProducts} onChange={event => setStoreProducts(event.target.value.replace(/\D/g, ''))} placeholder={String(current.storeProductActiveLimit)} /></label><label>Alasan perubahan<textarea rows={4} maxLength={3000} value={reason} onChange={event => setReason(event.target.value)} placeholder="Contoh: menyesuaikan kapasitas pilot Jabodetabek" /></label>{hasDraft && <section className="case-context"><h2>Ringkasan before/after</h2><p>{current.personalActiveLimit} → <strong>{personalValue}</strong> listing pribadi</p><p>{current.storeProductActiveLimit} → <strong>{storeValue}</strong> produk per toko</p><p>{current.personalOverLimitOwners} pemilik pribadi dan {current.storeOverLimitStores} toko sedang terdeteksi pada batas saat ini.</p><label className="checkbox-label"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Saya memahami perubahan ini tidak menghapus listing lama.</label></section>}{(error || update.error) && <p className="form-alert" role="alert">{error ?? 'Perubahan belum tersimpan. Versi konfigurasi mungkin sudah berubah.'}</p>}<button className="button" type="submit" disabled={update.isPending}>{update.isPending ? 'Menyimpan…' : 'Simpan batas baru'}</button></form><section className="admin-history"><h2>Riwayat perubahan</h2>{history.isPending ? <p>Memuat riwayat…</p> : history.error ? <p className="form-alert">Riwayat tidak dapat dimuat.</p> : history.data?.items.length ? <div className="admin-report-list">{history.data.items.map(item => <article key={item.version}><strong>Versi {item.version}</strong><p>{item.personalActiveLimit} pribadi · {item.storeProductActiveLimit} per toko</p><p>{item.reason}</p><time dateTime={item.effectiveAt}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(item.effectiveAt))}</time></article>)}</div> : <p className="metadata">Belum ada riwayat.</p>}</section></section>;
}
