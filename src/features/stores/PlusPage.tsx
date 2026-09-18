import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { StatusPanel } from '../../components/StatusPanel';
import { BackButton } from '../../components/NavigationLinks';
import { PageHeading } from '../../components/SurfacePrimitives';
import { formatRupiah } from '../../lib/money';
import { billingStatusLabel } from '../shared/status-labels';
import { useStoreGateway } from './StoreContext';
import type { BillingOrder } from './types';

export function PlusPage() {
  const gateway = useStoreGateway(); const client = useQueryClient(); const [method, setMethod] = useState<BillingOrder['method']>('qris');
  const status = useQuery({ queryKey: ['plus', 'status'], queryFn: () => gateway!.getPlusStatus(), enabled: Boolean(gateway) });
  const purchase = useMutation({ mutationFn: async () => { const invoice = await gateway!.createBillingOrder(method); return gateway!.simulateBilling(invoice.id, 'succeeded'); }, onSuccess: () => { void client.invalidateQueries({ queryKey: ['plus', 'status'] }); } });
  if (!gateway) return <section className="plus-page"><BackButton fallback="/profile" /><StatusPanel title="Plus belum aktif"><p>Hubungkan backend untuk melihat entitlement dan simulasi pembayaran.</p></StatusPanel></section>;
  if (status.isPending) return <section className="plus-page"><BackButton fallback="/profile" /><StatusPanel title="Memuat status Plus…" /></section>;
  if (status.error || !status.data) return <section className="plus-page"><BackButton fallback="/profile" /><StatusPanel title="Status Plus tidak tersedia" error><button className="button" onClick={() => void status.refetch()}>Coba lagi</button></StatusPanel></section>;
  return <section className="plus-page"><PageHeading kicker="Akun Plus" title="Buat toko untuk usahamu" description="Plus bersifat opsional. Listing pribadi tetap bisa dipasang tanpa toko." leading={<BackButton fallback="/profile" />} /><section className="plus-panel"><h2>{formatRupiah(status.data.priceRupiah)} / bulan</h2><p>{status.data.active ? `Aktif sampai ${new Date(status.data.paidThrough ?? '').toLocaleDateString('id-ID')}.` : 'Belum aktif.'} Maksimal {status.data.maxStores} toko per akun; saat ini {status.data.storeCount}.</p>{status.data.active ? <Link className="button" to="/my/stores">Kelola toko</Link> : <><label>Metode simulasi<select value={method} onChange={event => setMethod(event.target.value as BillingOrder['method'])}><option value="qris">QRIS (simulasi)</option><option value="virtual_account">Virtual account (simulasi)</option></select></label><p className="simulation-warning">Simulasi pembayaran — jangan transfer uang. Barter tidak menerima atau menahan pembayaran ini.</p><button className="button" disabled={purchase.isPending} onClick={() => purchase.mutate()}>{purchase.isPending ? 'Mengaktifkan Plus…' : 'Beli akun Plus'}</button></>}</section>{purchase.error && <p className="form-alert" role="alert">Pembelian Plus belum berhasil. Coba lagi.</p>}</section>;
}
