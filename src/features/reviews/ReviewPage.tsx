import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { StatusPanel } from '../../components/StatusPanel';
import { useReviewGateway } from './ReviewContext';
import type { ReviewInput } from './types';

export function ReviewPage() {
  const gateway = useReviewGateway(); const location = useLocation(); const navigate = useNavigate();
  const params = new URLSearchParams(location.search); const kind = params.get('kind') as ReviewInput['kind'] | null; const transactionId = params.get('id') ?? '';
  const [rating, setRating] = useState(0); const [comment, setComment] = useState(''); const [error, setError] = useState<string | null>(null);
  const submit = useMutation({ mutationFn: () => gateway!.submit({ kind: kind!, transactionId, rating, comment: comment.trim() }), onSuccess: () => navigate(-1) });
  function onSubmit(event: FormEvent) { event.preventDefault(); if (!kind || !transactionId || rating < 1) { setError('Pilih rating 1–5. Komentar boleh dikosongkan.'); return; } setError(null); submit.mutate(); }
  if (!gateway) return <StatusPanel title="Ulasan belum aktif"><p>Hubungkan backend untuk memberi ulasan setelah transaksi selesai.</p></StatusPanel>;
  return <section className="review-page"><header><button className="back-link text-button" type="button" onClick={() => navigate(-1)}>Kembali</button><p className="eyebrow">Setelah transaksi selesai</p><h1>Beri ulasan</h1><p>Ulasan membantu tetangga memilih lawan transaksi yang dapat dipercaya. Tulis pengalaman sesuai kejadian.</p></header><form className="stack-form" onSubmit={onSubmit}><fieldset><legend>Rating</legend><div className="rating-choice">{[1, 2, 3, 4, 5].map(value => <label key={value}><input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} />{value} dari 5</label>)}</div></fieldset><label htmlFor="review-comment">Komentar<textarea id="review-comment" rows={6} maxLength={1000} value={comment} onChange={event => setComment(event.target.value)} placeholder="Contoh: komunikasi jelas, kondisi barang sesuai kesepakatan." /></label>{(error || submit.error) && <p className="form-alert" role="alert">{error ?? 'Ulasan belum tersimpan. Coba lagi.'}</p>}<button className="button" type="submit" disabled={submit.isPending}>{submit.isPending ? 'Menyimpan ulasan…' : 'Kirim ulasan'}</button></form></section>;
}
