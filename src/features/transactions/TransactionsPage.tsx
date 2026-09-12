import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { StatusPanel } from '../../components/StatusPanel';
import { useTransactionGateway } from './TransactionContext';
import type { TransactionKind } from './gateway';
import { transactionStatusLabel } from '../shared/status-labels';

const labels: Record<TransactionKind, string> = { all: 'Semua', barter: 'Barter', order: 'Pesanan' };
export function TransactionsPage() {
  const gateway = useTransactionGateway(); const [kind, setKind] = useState<TransactionKind>('all');
  const query = useQuery({ queryKey: ['my-transactions', kind], queryFn: () => gateway!.list(kind), enabled: Boolean(gateway) });
  if (!gateway) return <StatusPanel title="Transaksi belum aktif"><p>Hubungkan backend untuk melihat transaksi nyata.</p></StatusPanel>;
  if (query.isPending) return <StatusPanel title="Memuat transaksi…" />;
  if (query.error) return <StatusPanel title="Transaksi tidak dapat dimuat" error><button className="button" type="button" onClick={() => void query.refetch()}>Coba lagi</button></StatusPanel>;
  const items = query.data ?? [];
  return <section className="transactions-page"><header><p className="eyebrow">Riwayat kesepakatan</p><h1>Transaksi saya</h1><p>Ringkasan di sini mengarah ke snapshot barter atau pesanan. Pembayaran tetap langsung antar pihak.</p></header><nav className="discovery-tabs" aria-label="Jenis transaksi">{Object.entries(labels).map(([value, label]) => <button key={value} className={kind === value ? 'selected' : ''} type="button" onClick={() => setKind(value as TransactionKind)}>{label}</button>)}</nav>{items.length ? <div className="transaction-list">{items.map(item => <article key={`${item.kind}-${item.id}`}><div><span className="label">{item.kind === 'barter' ? 'Barter' : 'Pesanan'} · {transactionStatusLabel(item.kind, item.lifecycle)}</span><h2><Link to={item.href}>{item.title}</Link></h2><p>Dengan {item.counterpartName}</p><time dateTime={item.updatedAt}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(item.updatedAt))}</time></div></article>)}</div> : <StatusPanel title="Belum ada transaksi"><p>Mulai dari listing sekitar, lalu buka chat untuk menyepakati barter atau pesanan.</p><Link to="/">Jelajahi listing</Link></StatusPanel>}</section>;
}
