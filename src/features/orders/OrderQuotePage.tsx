import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useChatGateway } from '../chat/ChatContext';
import { useRepository } from '../../app/providers';
import { StatusPanel } from '../../components/StatusPanel';
import { PageHeading } from '../../components/SurfacePrimitives';
import { formatRupiah } from '../../lib/money';
import { useOrderGateway } from './OrderContext';
import type { OrderItemInput, OrderQuoteInput } from './types';

export function OrderQuotePage() {
  const { conversationId = '' } = useParams(); const auth = useAuth(); const chat = useChatGateway(); const order = useOrderGateway(); const repository = useRepository(); const navigate = useNavigate();
  const [quantity, setQuantity] = useState('1'); const [variantId, setVariantId] = useState(''); const [handoverMethod, setHandoverMethod] = useState<OrderQuoteInput['handoverMethod']>('meetup'); const [handoverNote, setHandoverNote] = useState(''); const [shipping, setShipping] = useState('0'); const [dpPercent, setDpPercent] = useState('0'); const [deadline, setDeadline] = useState(''); const [reason, setReason] = useState('Ringkasan pesanan dari chat.'); const [error, setError] = useState<string | null>(null); const [key, setKey] = useState<string | null>(null);
  const inbox = useQuery({ queryKey: ['chat', 'inbox'], queryFn: () => chat!.listConversations(), enabled: Boolean(chat && conversationId) });
  const conversation = inbox.data?.find(item => item.id === conversationId);
  const listing = useQuery({ queryKey: [repository.source, 'listing', conversation?.listing.id], queryFn: ({ signal }) => repository.getListing(conversation!.listing.id, signal), enabled: Boolean(conversation) });
  const create = useMutation({ mutationFn: ({ items, terms, idempotencyKey }: { items: OrderItemInput[]; terms: OrderQuoteInput; idempotencyKey: string }) => order!.createQuote(conversationId, items, terms, idempotencyKey), onSuccess: data => navigate(`/orders/${data.id}`, { replace: true }) });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!listing.data || !auth.session || listing.data.publisher.id !== auth.session.userId) { setError('Hanya pemilik listing yang dapat membuat ringkasan pesanan.'); return; }
    if (!/^[1-9][0-9]{0,4}$/.test(quantity) || !/^[0-9]{1,16}$/.test(shipping) || !/^(?:0|[1-9][0-9]?)$/.test(dpPercent)) { setError('Jumlah, ongkir, dan DP belum valid.'); return; }
    if (!reason.trim() || !handoverNote.trim()) { setError('Alasan dan catatan penyerahan wajib diisi.'); return; }
    const terms: OrderQuoteInput = { handoverMethod, handoverNote: handoverNote.trim(), shippingAmountRupiah: shipping, dpPercent: Number(dpPercent), dpDeadline: Number(dpPercent) > 0 && deadline ? new Date(deadline).toISOString() : null, reason: reason.trim() };
    const nextKey = key ?? crypto.randomUUID(); setKey(nextKey); setError(null); create.mutate({ items: [{ ...(variantId ? { variantId } : {}), quantity }], terms, idempotencyKey: nextKey });
  }
  if (!order || !chat) return <StatusPanel title="Ringkasan pesanan belum aktif"><p>Hubungkan backend untuk membuat pesanan nyata.</p></StatusPanel>;
  if (inbox.isPending || listing.isPending || auth.status === 'loading') return <StatusPanel title="Menyiapkan ringkasan pesanan…" />;
  if (inbox.error || listing.error || !conversation || !listing.data) return <StatusPanel title="Ringkasan pesanan tidak dapat disiapkan" error><Link to="/chat">Kembali ke pesan</Link></StatusPanel>;
  if (!auth.session || listing.data.publisher.id !== auth.session.userId) return <StatusPanel title="Akses ringkasan ditolak"><p>Ringkasan pesanan dibuat oleh pemilik listing.</p><Link to={`/chat/${conversationId}`}>Kembali ke chat</Link></StatusPanel>;
  const isFree = listing.data.modes.includes('free');
  return <section className="order-editor"><PageHeading leading={<Link className="back-link" to={`/chat/${conversationId}`}>Kembali ke chat</Link>} kicker="Ringkasan pesanan" title={listing.data.title} description="Pembeli akan melihat snapshot harga dan cara penyerahan sebelum mengonfirmasi." /><form className="stack-form" onSubmit={submit}><label>Varian<select value={variantId} onChange={event => setVariantId(event.target.value)}><option value="">Harga dasar · {isFree ? 'Gratis' : formatRupiah(listing.data.priceMin ?? '0')}</option>{listing.data.variants.map(variant => <option value={variant.id} key={variant.id}>{variant.name} · {formatRupiah(variant.price)}/{variant.unit}</option>)}</select></label><label>Jumlah<input inputMode="numeric" value={quantity} onChange={event => setQuantity(event.target.value.replace(/\D/g, ''))} /></label><label>Cara penyerahan<select value={handoverMethod} onChange={event => setHandoverMethod(event.target.value as OrderQuoteInput['handoverMethod'])}><option value="pickup">Diambil pembeli</option><option value="meetup">Bertemu</option><option value="delivery">Diantar dengan kesepakatan</option></select></label><label>Catatan penyerahan<textarea rows={3} value={handoverNote} onChange={event => setHandoverNote(event.target.value)} placeholder="Contoh: bertemu di lobi pada jam yang disepakati" /></label><label>Ongkir terpisah<input inputMode="numeric" value={shipping} onChange={event => setShipping(event.target.value.replace(/\D/g, ''))} /><span className="form-help">Nominal ini dibayar langsung ke penjual bila disepakati.</span></label><label>DP<input inputMode="numeric" value={dpPercent} onChange={event => setDpPercent(event.target.value.replace(/\D/g, '').slice(0, 2))} /><span className="form-help">Persentase dari total. Isi 0 bila tanpa DP.</span></label>{Number(dpPercent) > 0 && <label>Tenggat DP<input type="datetime-local" value={deadline} onChange={event => setDeadline(event.target.value)} /></label>}<label>Alasan ringkasan<textarea rows={2} maxLength={300} value={reason} onChange={event => setReason(event.target.value)} /></label>{(error || create.error) && <p className="form-alert" role="alert">{error ?? 'Ringkasan belum tersimpan. Isian tetap ada; coba lagi.'}</p>}<button className="button full-button" disabled={create.isPending}>{create.isPending ? 'Menyimpan ringkasan…' : 'Kirim ringkasan ke pembeli'}</button></form></section>;
}
