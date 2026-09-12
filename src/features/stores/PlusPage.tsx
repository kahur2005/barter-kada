import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { StatusPanel } from '../../components/StatusPanel';
import { formatRupiah } from '../../lib/money';
import { billingStatusLabel } from '../shared/status-labels';
import { useStoreGateway } from './StoreContext';
import type { BillingOrder } from './types';

export function PlusPage() {
  const gateway = useStoreGateway(); const client = useQueryClient(); const [method, setMethod] = useState<BillingOrder['method']>('qris'); const [invoice, setInvoice] = useState<BillingOrder | null>(null);
  const status = useQuery({ queryKey: ['plus', 'status'], queryFn: () => gateway!.getPlusStatus(), enabled: Boolean(gateway) });
  const billing = useMutation({ mutationFn: () => gateway!.createBillingOrder(method), onSuccess: setInvoice });
  const simulate = useMutation({ mutationFn: (result: Exclude<BillingOrder['status'], 'pending'>) => gateway!.simulateBilling(invoice!.id, result), onSuccess: () => { setInvoice(null); void client.invalidateQueries({ queryKey: ['plus', 'status'] }); } });
  if (!gateway) return <StatusPanel title="Plus belum aktif"><p>Hubungkan backend untuk melihat entitlement dan simulasi pembayaran.</p></StatusPanel>;
  if (status.isPending) return <StatusPanel title="Memuat status Plus…" />;
  if (status.error || !status.data) return <StatusPanel title="Status Plus tidak tersedia" error><button className="button" onClick={() => void status.refetch()}>Coba lagi</button></StatusPanel>;
  return <section className="plus-page"><header><p className="eyebrow">Akun Plus</p><h1>Buat toko untuk usahamu</h1><p>Plus bersifat opsional. Listing pribadi tetap bisa dipasang tanpa toko.</p></header><section className="plus-panel"><h2>{formatRupiah(status.data.priceRupiah)} / bulan</h2><p>{status.data.active ? `Aktif sampai ${new Date(status.data.paidThrough ?? '').toLocaleDateString('id-ID')}.` : 'Belum aktif.'} Maksimal {status.data.maxStores} toko per akun; saat ini {status.data.storeCount}.</p>{status.data.active ? <Link className="button" to="/my/stores">Kelola toko</Link> : <><label>Metode simulasi<select value={method} onChange={event => setMethod(event.target.value as BillingOrder['method'])}><option value="qris">QRIS (simulasi)</option><option value="virtual_account">Virtual account (simulasi)</option></select></label><p className="simulation-warning">Simulasi pembayaran — jangan transfer uang. Barter tidak menerima atau menahan pembayaran ini.</p>{invoice ? <div className="billing-simulation"><strong>Invoice simulasi {invoice.id.slice(0, 8)}</strong><p>Nominal: {formatRupiah(invoice.amountRupiah)} · status {invoice.status}</p><div className="form-actions"><button className="button" disabled={simulate.isPending} onClick={() => simulate.mutate('succeeded')}>Simulasikan berhasil</button><button className="button secondary" disabled={simulate.isPending} onClick={() => simulate.mutate('failed')}>Simulasikan gagal</button></div></div> : <button className="button" disabled={billing.isPending} onClick={() => billing.mutate()}>{billing.isPending ? 'Membuat invoice…' : 'Buat invoice simulasi'}</button>}</>}</section>{(billing.error || simulate.error) && <p className="form-alert" role="alert">Simulasi belum tersimpan. Coba lagi.</p>}</section>;
}
