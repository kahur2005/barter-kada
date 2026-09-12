import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { StatusPanel } from '../../components/StatusPanel';
import { useReviewGateway } from './ReviewContext';

export function ReviewListPage() {
  const gateway = useReviewGateway(); const [params] = useSearchParams(); const subjectId = params.get('subjectId') ?? ''; const storeId = params.get('storeId') ?? ''; const client = useQueryClient(); const isStore = Boolean(storeId);
  const query = useQuery({ queryKey: ['reviews', isStore ? 'store' : 'subject', isStore ? storeId : subjectId], queryFn: () => isStore ? gateway!.listStore(storeId, null) : gateway!.list(subjectId, null), enabled: Boolean(gateway && (subjectId || storeId)) });
  const [replyId, setReplyId] = useState<string | null>(null); const [body, setBody] = useState(''); const [error, setError] = useState<string | null>(null);
  const reply = useMutation({ mutationFn: () => gateway!.reply(replyId!, body.trim()), onSuccess: () => { setReplyId(null); setBody(''); setError(null); void client.invalidateQueries({ queryKey: ['reviews', subjectId] }); } });
  if (!gateway) return <StatusPanel title="Ulasan belum aktif"><p>Hubungkan backend untuk melihat reputasi.</p></StatusPanel>;
  if (!subjectId && !storeId) return <StatusPanel title="Target ulasan tidak ditemukan"><p>Tautan ulasan harus memuat profil atau toko yang ingin dilihat.</p></StatusPanel>;
  if (query.isPending) return <StatusPanel title="Memuat ulasan…" />;
  if (query.error) return <StatusPanel title="Ulasan tidak dapat dimuat" error><button className="button" type="button" onClick={() => void query.refetch()}>Coba lagi</button></StatusPanel>;
  const items = query.data?.items ?? [];
  function submitReply() { if (body.trim().length < 1 || body.trim().length > 1000) { setError('Balasan wajib diisi dan maksimal 1.000 karakter.'); return; } setError(null); reply.mutate(); }
  return <section className="review-list-page"><Link className="back-link" to={isStore ? '/stores' : '/'}>Kembali</Link><header><p className="eyebrow">{isStore ? 'Reputasi toko' : 'Reputasi komunitas'}</p><h1>{isStore ? 'Ulasan toko' : 'Ulasan'}</h1><p>Ulasan yang tampil berasal dari transaksi yang selesai dan telah memenuhi aturan publikasi.</p></header>{items.length ? <div className="review-list">{items.map(item => <article className="review-card" key={item.id}><header><strong>{item.authorName}</strong><span>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span></header><p>{item.comment || 'Tanpa komentar.'}</p><time dateTime={item.createdAt}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(item.createdAt))}</time>{item.reply ? <div className="review-reply"><strong>Balasan pemilik</strong><p>{item.reply.body}</p></div> : item.canReply ? replyId === item.id ? <div className="stack-form"><label htmlFor={`reply-${item.id}`}>Balasan<textarea id={`reply-${item.id}`} rows={3} maxLength={1000} value={body} onChange={event => setBody(event.target.value)} /></label>{(error || reply.error) && <p className="form-alert" role="alert">{error ?? 'Balasan belum tersimpan.'}</p>}<div className="form-actions"><button className="button secondary" type="button" onClick={() => setReplyId(null)}>Batal</button><button className="button" type="button" disabled={reply.isPending} onClick={submitReply}>Balas</button></div></div> : <button className="text-button" type="button" onClick={() => { setReplyId(item.id); setBody(''); setError(null); }}>Balas ulasan</button> : null}</article>)}</div> : <StatusPanel title="Belum ada ulasan"><p>Reputasi akan tampil setelah transaksi selesai.</p></StatusPanel>}</section>;
}
