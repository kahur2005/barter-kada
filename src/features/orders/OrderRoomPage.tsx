import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { StatusPanel } from '../../components/StatusPanel';
import { formatRupiah } from '../../lib/money';
import { useOrderGateway } from './OrderContext';
import type { OrderRoom } from './types';

function OrderActions({ room, run, pending }: { room: OrderRoom; run: (action: string) => void; pending: boolean }) {
  if (room.lifecycle === 'completed') return <p className="success-notice">Pesanan selesai. Ringkasan dan konfirmasi manual tetap tersimpan.</p>;
  if (room.lifecycle === 'cancelled') return <p className="inline-notice">Pesanan dibatalkan: {room.cancellationReason}</p>;
  if (room.actorRole === 'buyer' && room.lifecycle === 'quoted') return <button className="button full-button" disabled={pending} onClick={() => run('confirm')}>Konfirmasi pesanan</button>;
  if (room.actorRole === 'buyer' && ['ready', 'awaiting_receipt'].includes(room.lifecycle) && !room.fulfillment.receivedAt) return <button className="button full-button" disabled={pending} onClick={() => run('receive')}>Pesanan sudah diterima</button>;
  if (room.actorRole === 'seller') {
    const dueDp = room.payments.find(payment => payment.kind === 'dp' && payment.state === 'due');
    if (dueDp && room.lifecycle === 'awaiting_dp') return <button className="button full-button" disabled={pending} onClick={() => run('payment:dp')}>Konfirmasi DP diterima</button>;
    if (room.lifecycle === 'confirmed') return <button className="button full-button" disabled={pending} onClick={() => run('processing')}>Mulai diproses</button>;
    if (room.lifecycle === 'processing') return <button className="button full-button" disabled={pending} onClick={() => run('ready')}>Tandai siap diambil</button>;
    if (room.lifecycle === 'ready') return <button className="button full-button" disabled={pending} onClick={() => run('handed')}>Konfirmasi penyerahan</button>;
    const due = room.payments.find(payment => payment.state === 'due');
    if (due) return <button className="button full-button" disabled={pending} onClick={() => run(`payment:${due.kind}`)}>Konfirmasi pelunasan diterima</button>;
  }
  return <p className="inline-notice">Menunggu tindakan pihak lain. Pembayaran dilakukan langsung, bukan melalui Barter.</p>;
}

export function OrderRoomPage() {
  const { id = '' } = useParams(); const gateway = useOrderGateway(); const client = useQueryClient(); const [key, setKey] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['order', id], queryFn: () => gateway!.get(id), enabled: Boolean(gateway && id) });
  useEffect(() => gateway?.subscribe(id, () => void client.invalidateQueries({ queryKey: ['order', id] })), [client, gateway, id]);
  const action = useMutation({ mutationFn: async (kind: string) => { const room = query.data!; const nextKey = key ?? crypto.randomUUID(); setKey(nextKey); if (kind === 'confirm') return gateway!.confirm(id, room.revision, nextKey); if (kind === 'receive') return gateway!.confirmReceived(id, room.acceptedRevision ?? room.revision, nextKey); if (kind === 'processing') return gateway!.markProcessing(id, room.acceptedRevision ?? room.revision, nextKey); if (kind === 'ready') return gateway!.markReady(id, room.acceptedRevision ?? room.revision, nextKey); if (kind === 'handed') return gateway!.markHandedOver(id, room.acceptedRevision ?? room.revision, nextKey); return gateway!.acknowledgePayment(id, room.acceptedRevision ?? room.revision, kind.split(':')[1] as 'dp' | 'balance' | 'shipping', nextKey); }, onSuccess: data => { setKey(null); client.setQueryData(['order', id], data); } });
  if (!gateway) return <StatusPanel title="Pesanan belum aktif"><p>Hubungkan backend untuk memakai pesanan nyata.</p></StatusPanel>;
  if (query.isPending) return <StatusPanel title="Memuat pesanan…" />;
  if (query.error || !query.data) return <StatusPanel title="Pesanan tidak tersedia" error><Link to="/chat">Kembali ke pesan</Link></StatusPanel>;
  const room = query.data;
  return <section className="order-room"><header className="trade-heading"><div><p className="eyebrow">{room.kind === 'free' ? 'Pemberian gratis' : 'Pesanan'} · Versi {room.revision}</p><h1>{room.actorRole === 'buyer' ? `Pesanan dari ${room.seller.name}` : `Pesanan dari ${room.buyer.name}`}</h1><p>Status: {room.lifecycle}</p></div><Link className="text-button" to={`/chat/${room.conversationId}`}>Buka chat</Link></header><section className="trade-package"><h2>Ringkasan barang</h2>{room.items.map(item => <article className="order-line" key={item.id}><strong>{item.name} × {item.quantity}</strong><span>{formatRupiah(item.lineTotalRupiah)}</span></article>)}<dl className="order-totals"><dt>Subtotal</dt><dd>{formatRupiah(room.terms.subtotalRupiah)}</dd><dt>Ongkir</dt><dd>{formatRupiah(room.terms.shippingAmountRupiah)}</dd><dt>Total</dt><dd><strong>{formatRupiah(room.terms.totalRupiah)}</strong></dd></dl></section><section className="trade-topup"><h2>Penyerahan & pembayaran</h2><p>{room.terms.handoverMethod} · {room.terms.handoverNote}</p><p>{room.terms.dpPercent ? `DP ${room.terms.dpPercent}%: ${formatRupiah(room.terms.dpAmountRupiah)}` : 'Tanpa DP.'}</p>{room.payments.length ? <ul>{room.payments.map(payment => <li key={payment.kind}>{payment.kind === 'dp' ? 'DP' : 'Pelunasan'} {formatRupiah(payment.amountRupiah)} · {payment.state === 'acknowledged' ? 'Dikonfirmasi penjual' : 'Menunggu konfirmasi penjual'}</li>)}</ul> : <p>Pembayaran barang dilakukan langsung saat kesepakatan.</p>}</section>{action.error && <p className="form-alert" role="alert">Aksi belum tersimpan. Muat ulang status pesanan lalu coba lagi.</p>}<OrderActions room={room} run={kind => action.mutate(kind)} pending={action.isPending} />{room.lifecycle === 'completed' && <Link className="button secondary" to={`/reviews/new?kind=order&id=${room.id}`}>Beri ulasan</Link>}</section>;
}
