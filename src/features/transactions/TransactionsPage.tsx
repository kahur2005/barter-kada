import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { StatusPanel } from '../../components/StatusPanel';
import { BackButton, ActionLink } from '../../components/NavigationLinks';
import { useTransactionGateway } from './TransactionContext';
import type { TransactionKind } from './gateway';
import type { TransactionSummary } from './types';
import { transactionStatusLabel } from '../shared/status-labels';

const labels: Record<TransactionKind, string> = { all: 'Semua', barter: 'Barter', order: 'Pesanan' };
const bucketLabels = { needs_action: 'Perlu tindakan', in_progress: 'Berjalan', completed: 'Selesai' } as const;
const bucketOrder: TransactionSummary['bucket'][] = ['needs_action', 'in_progress', 'completed'];
const roleLabels: Record<TransactionSummary['actorRole'], string> = { buyer: 'Pembeli', seller: 'Penjual', party_a: 'Pihak A', party_b: 'Pihak B' };
const publisherLabels: Record<TransactionSummary['publisherKind'], string> = { personal: 'profil pribadi', store: 'toko' };

function TransactionRow({ item }: { item: TransactionSummary }) {
  return <article><div><span className="label">{item.kind === 'barter' ? 'Barter' : 'Pesanan'} · {transactionStatusLabel(item.kind, item.lifecycle)}</span><h3><Link to={item.href}>{item.title}</Link></h3><p>Dengan {item.counterpartName}</p><p className="transaction-publisher">{roleLabels[item.actorRole]} · Penerbit {publisherLabels[item.publisherKind]} · {item.publisherName}</p><time dateTime={item.updatedAt}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(item.updatedAt))}</time></div></article>;
}

export function TransactionsPage() {
  const gateway = useTransactionGateway(); const [kind, setKind] = useState<TransactionKind>('all');
  const query = useQuery({ queryKey: ['my-transactions', kind], queryFn: () => gateway!.list(kind), enabled: Boolean(gateway) });
  if (!gateway) return <section className="transactions-page"><BackButton fallback="/profile" /><StatusPanel title="Transaksi belum aktif"><p>Hubungkan backend untuk melihat transaksi nyata.</p></StatusPanel></section>;
  if (query.isPending) return <section className="transactions-page"><BackButton fallback="/profile" /><StatusPanel title="Memuat transaksi…" /></section>;
  if (query.error) return <section className="transactions-page"><BackButton fallback="/profile" /><StatusPanel title="Transaksi tidak dapat dimuat" error><button className="button" type="button" onClick={() => void query.refetch()}>Coba lagi</button></StatusPanel></section>;
  const items = query.data ?? [];
  const groups = bucketOrder.map(bucket => ({ bucket, items: items.filter(item => item.bucket === bucket) }));
  return <section className="transactions-page"><BackButton fallback="/profile" /><header><p className="eyebrow">Riwayat kesepakatan</p><h1>Transaksi saya</h1><p>Ringkasan di sini mengarah ke snapshot barter atau pesanan. Pembayaran tetap langsung antar pihak.</p></header><nav className="discovery-tabs" aria-label="Jenis transaksi">{Object.entries(labels).map(([value, label]) => <button key={value} className={kind === value ? 'selected' : ''} type="button" onClick={() => setKind(value as TransactionKind)}>{label}</button>)}</nav>{items.length ? <div className="transaction-groups">{groups.map(({ bucket, items: groupItems }) => <section className="transaction-section" key={bucket} aria-labelledby={`transaction-${bucket}`}><header><h2 id={`transaction-${bucket}`}>{bucketLabels[bucket]}</h2><span className="transaction-count">{groupItems.length}</span></header>{groupItems.length ? <div className="transaction-list">{groupItems.map(item => <TransactionRow key={`${item.kind}-${item.id}`} item={item} />)}</div> : <p className="transaction-section-empty">Tidak ada transaksi di bagian ini.</p>}</section>)}</div> : <StatusPanel title="Belum ada transaksi"><p>Mulai dari listing sekitar, lalu buka chat untuk menyepakati barter atau pesanan.</p><ActionLink to="/">Jelajahi listing</ActionLink></StatusPanel>}</section>;
}
