import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Dialog } from '../../components/Dialog';
import { StatusPanel } from '../../components/StatusPanel';
import { formatRupiah } from '../../lib/money';
import { StuckTransactionPanel } from '../shared/StuckTransactionPanel';
import { useTradeGateway } from './TradeContext';
import type { TradeItem, TradeRoom } from './types';

function Package({ title, status, items }: { title: string; status: string; items: TradeItem[] }) {
  return <section className="trade-package">
    <header><h2>{title}</h2><span className="label">{status}</span></header>
    {items.map(item => <article key={item.id} className="trade-item">
      {item.photos[0]?.url ? <img src={item.photos[0].url} alt="" /> : <div className="image-fallback">Foto privat</div>}
      <div><h3>{item.name} · {item.quantity} {item.quantity === 1 ? 'buah' : 'unit'}</h3><p>{item.details}</p><span>{item.source === 'listing' ? 'Dari listing' : 'Hanya di ruang barter'}</span></div>
    </article>)}
  </section>;
}

function consentStatus(ready: boolean, approved: boolean) {
  if (approved) return 'Setuju';
  if (ready) return 'Siap';
  return 'Belum siap';
}

function TradeActions({ room, onApprove, onReceive, onTopup, onCancel, pending }: {
  room: TradeRoom; onApprove: () => void; onReceive: () => void; onTopup: () => void; onCancel: () => void; pending: boolean;
}) {
  if (room.lifecycle === 'completed') return <div className="trade-action-stack"><p className="success-notice">Barter selesai. Ringkasan kesepakatan tetap tersimpan.</p><Link className="button secondary" to={`/reviews/new?kind=barter&id=${room.id}`}>Beri ulasan</Link></div>;
  if (room.lifecycle === 'cancelled') return <p className="inline-notice">Barter dibatalkan: {room.cancellationReason}</p>;
  if (room.lifecycle === 'agreed') return <div className="trade-action-stack">
    <p className="inspection-notice">Periksa barang asli dan cocokkan dengan foto, detail, serta kekurangan sebelum menerima.</p>
    {!room.receipts.actorReceived && <button className="button" type="button" disabled={pending} onClick={onReceive}>Barang sudah diterima</button>}
    {room.receipts.actorReceived && <p className="success-notice">Kamu sudah mengonfirmasi penerimaan barang.</p>}
    {room.topup && room.topup.payeeId === room.actor.id && !room.topup.acknowledged && <button className="button secondary" type="button" disabled={pending} onClick={onTopup}>Uang tambahan diterima</button>}
    <button className="text-button danger" type="button" disabled={pending || room.receipts.actorReceived || room.receipts.counterpartReceived} onClick={onCancel}>Batalkan barter</button>
  </div>;
  if (!room.readiness.actor) return <button className="button full-button" type="button" disabled={pending} onClick={onApprove}>Siap untuk versi {room.revision}</button>;
  if (!room.readiness.counterpart) return <p className="inline-notice">Menunggu {room.counterpart.name} menekan Siap untuk versi {room.revision}.</p>;
  if (!room.approvals.actor) return <button className="button full-button" type="button" disabled={pending} onClick={onApprove}>Setujui barter</button>;
  return <p className="inline-notice">Menunggu persetujuan {room.counterpart.name}. Barang belum direservasi sampai keduanya setuju.</p>;
}

export function TradeRoomPage() {
  const { id = '' } = useParams(); const gateway = useTradeGateway(); const client = useQueryClient();
  const [dialog, setDialog] = useState<'approve' | 'receive' | 'topup' | 'cancel' | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [commandKey, setCommandKey] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['trade', id], queryFn: () => gateway!.get(id), enabled: Boolean(gateway && id) });
  useEffect(() => gateway?.subscribe(id, () => void client.invalidateQueries({ queryKey: ['trade', id] })), [client, gateway, id]);
  const action = useMutation({
    mutationFn: async ({ kind, key }: { kind: 'ready' | 'approve' | 'receive' | 'topup' | 'cancel'; key: string }) => {
      const room = query.data!;
      if (kind === 'ready') return gateway!.markReady(id, room.revision, key);
      if (kind === 'approve') return gateway!.approve(id, room.revision, key);
      if (kind === 'receive') return gateway!.confirmReceived(id, room.acceptedRevision ?? room.revision, key);
      if (kind === 'topup') return gateway!.acknowledgeTopup(id, room.acceptedRevision ?? room.revision, key);
      return gateway!.cancel(id, room.revision, cancelReason.trim(), key);
    },
    onSuccess: data => { client.setQueryData(['trade', id], data); setDialog(null); setCancelReason(''); setCommandKey(null); void client.invalidateQueries({ queryKey: ['chat', data.conversationId, 'messages'] }); },
  });
  const adminHelp = useMutation({ mutationFn: (description: string) => gateway?.requestAdminHelp ? gateway.requestAdminHelp(id, description) : Promise.reject(new Error('Bantuan admin belum aktif.')), onSuccess: () => { void client.invalidateQueries({ queryKey: ['trade', id] }); } });
  function run(kind: 'ready' | 'approve' | 'receive' | 'topup' | 'cancel') {
    const key = commandKey ?? crypto.randomUUID(); setCommandKey(key); action.mutate({ kind, key });
  }
  if (!gateway) return <StatusPanel title="Ruang barter belum aktif"><p>Hubungkan backend untuk membuat kesepakatan nyata.</p></StatusPanel>;
  if (query.isPending) return <StatusPanel title="Memuat ruang barter…" />;
  if (query.error || !query.data) return <StatusPanel title="Ruang barter tidak tersedia" error><button className="button" onClick={() => void query.refetch()}>Coba lagi</button></StatusPanel>;
  const room = query.data;
  const trigger = () => {
    if (room.lifecycle === 'negotiating' && !room.readiness.actor) run('ready');
    else if (room.lifecycle === 'negotiating') setDialog('approve');
  };
  return <section className="trade-room">
    <header className="trade-heading"><div><p className="eyebrow">Barter · Versi {room.revision}</p><h1>Barter dengan {room.counterpart.name}</h1><p>{room.lifecycle === 'negotiating' ? 'Susun dan tinjau paket yang sama sebelum menyetujui.' : 'Kesepakatan tersimpan sebagai snapshot.'}</p></div><Link className="text-button" to={`/chat/${room.conversationId}`}>Buka chat</Link></header>
    <Package title="Penawaranmu" status={consentStatus(room.readiness.actor, room.approvals.actor)} items={room.ownItems} />
    {room.lifecycle === 'negotiating' && <Link className="button secondary edit-trade-link" to={`/transactions/${room.id}/edit`}>Ubah penawaranmu</Link>}
    <Package title={`Penawaran ${room.counterpart.name}`} status={consentStatus(room.readiness.counterpart, room.approvals.counterpart)} items={room.counterpartItems} />
    <section className="trade-topup"><h2>Tambahan uang</h2>{room.topup ? <p><strong>{room.topup.payerId === room.actor.id ? 'Kamu membayar' : `${room.counterpart.name} membayar`} {formatRupiah(room.topup.amountRupiah)}</strong> saat serah terima setelah pemeriksaan.</p> : <p>Tidak ada tambahan uang.</p>}</section>
    <p className="revision-warning">Setiap perubahan barang, foto, detail, jumlah, atau uang membuat versi baru dan mereset status Siap serta Setuju kedua pihak.</p>
    <StuckTransactionPanel followUp={room.receiptFollowUp} counterpartLabel={room.counterpart.name} pending={adminHelp.isPending} onRequest={gateway.requestAdminHelp ? description => adminHelp.mutateAsync(description).then(() => undefined) : undefined} />
    {action.error && <p className="form-alert" role="alert">Status belum tersimpan. Muat versi terbaru lalu coba lagi; persetujuan tidak dijalankan otomatis.</p>}
    <TradeActions room={room} pending={action.isPending} onApprove={trigger} onReceive={() => setDialog('receive')} onTopup={() => setDialog('topup')} onCancel={() => setDialog('cancel')} />
    {dialog === 'approve' && <Dialog title={`Setujui barter versi ${room.revision}?`} onClose={() => setDialog(null)}><p>Tinjau seluruh barang kedua pihak dan tambahan uang. Persetujuan ini hanya berlaku untuk versi {room.revision}.</p><div className="form-actions"><button className="button secondary" onClick={() => setDialog(null)}>Kembali meninjau</button><button className="button" disabled={action.isPending} onClick={() => run('approve')}>Ya, setujui barter</button></div></Dialog>}
    {dialog === 'receive' && <Dialog title="Konfirmasi barang diterima" onClose={() => setDialog(null)}><p>Saya sudah memeriksa barang dari {room.counterpart.name}, mencocokkannya dengan kesepakatan, dan menerimanya.</p><div className="form-actions"><button className="button secondary" onClick={() => setDialog(null)}>Belum</button><button className="button" disabled={action.isPending} onClick={() => run('receive')}>Ya, barang diterima</button></div></Dialog>}
    {dialog === 'topup' && room.topup && <Dialog title="Konfirmasi uang tambahan" onClose={() => setDialog(null)}><p>Sudah menerima {formatRupiah(room.topup.amountRupiah)} dari {room.counterpart.name} setelah memeriksa uang masuk?</p><div className="form-actions"><button className="button secondary" onClick={() => setDialog(null)}>Belum</button><button className="button" disabled={action.isPending} onClick={() => run('topup')}>Ya, uang diterima</button></div></Dialog>}
    {dialog === 'cancel' && <Dialog title="Batalkan barter?" onClose={() => setDialog(null)}><label htmlFor="cancel-reason">Alasan pembatalan</label><textarea id="cancel-reason" minLength={5} maxLength={500} rows={4} value={cancelReason} onChange={event => setCancelReason(event.target.value)} /><p className="form-help">Alasan akan terlihat oleh kedua pihak dan tersimpan dalam riwayat.</p><div className="form-actions"><button className="button secondary" onClick={() => setDialog(null)}>Kembali</button><button className="button" disabled={cancelReason.trim().length < 5 || action.isPending} onClick={() => run('cancel')}>Batalkan dengan alasan</button></div></Dialog>}
  </section>;
}
