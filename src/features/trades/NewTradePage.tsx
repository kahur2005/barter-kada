import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useRepository } from '../../app/providers';
import { StatusPanel } from '../../components/StatusPanel';
import { useAuth } from '../auth/AuthProvider';
import { useChatGateway } from '../chat/ChatContext';
import { useListingGateway } from '../listings/ListingContext';
import { useTradeGateway } from './TradeContext';
import type { TradeItemInput, TradeTopupInput } from './types';

type EditableItem = {
  clientId: string; source: 'listing' | 'direct'; listingId: string; name: string; details: string;
  quantity: string; assetIds: string[]; uploadProgress: number; uploading: boolean;
};
const emptyItem = (): EditableItem => ({ clientId: crypto.randomUUID(), source: 'direct', listingId: '', name: '', details: '', quantity: '1', assetIds: [], uploadProgress: 0, uploading: false });

export function NewTradePage() {
  const { listingId = '' } = useParams(); const repository = useRepository(); const auth = useAuth();
  const chat = useChatGateway(); const listings = useListingGateway(); const trade = useTradeGateway(); const navigate = useNavigate();
  const [items, setItems] = useState<EditableItem[]>(() => [emptyItem()]);
  const [topupDirection, setTopupDirection] = useState<'none' | 'actor' | 'counterpart'>('none');
  const [topupAmount, setTopupAmount] = useState(''); const [error, setError] = useState<string | null>(null);
  const [commandKey, setCommandKey] = useState<string | null>(null);
  const target = useQuery({ queryKey: [repository.source, 'listing', listingId], queryFn: ({ signal }) => repository.getListing(listingId, signal) });
  const conversation = useQuery({ queryKey: ['trade', 'conversation', listingId], queryFn: () => chat!.openConversation(listingId), enabled: Boolean(chat && listingId) });
  const mine = useQuery({ queryKey: ['listings', 'mine', 'active', 'trade-form'], queryFn: () => listings!.listMine('active'), enabled: Boolean(listings) });
  const create = useMutation({
    mutationFn: ({ payload, topup, key }: { payload: TradeItemInput[]; topup: TradeTopupInput; key: string }) => trade!.create(listingId, payload, topup, key),
    onSuccess: room => { setCommandKey(null); navigate(`/transactions/${room.id}`, { replace: true }); },
  });
  function update(clientId: string, change: Partial<EditableItem>) { setItems(current => current.map(item => item.clientId === clientId ? { ...item, ...change } : item)); }
  async function upload(item: EditableItem, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); event.target.value = '';
    if (!conversation.data || files.length < 1 || files.length > 4 || files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024)) {
      setError('Pilih 1–4 foto JPG, PNG, atau WebP; maksimal 5 MB per foto.'); return;
    }
    setError(null); update(item.clientId, { uploading: true, uploadProgress: 0, assetIds: [] });
    try {
      const assetIds: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const assetId = await trade!.uploadDirectImage(conversation.data, files[index], progress => update(item.clientId, { uploadProgress: Math.round((index * 100 + progress) / files.length) }));
        assetIds.push(assetId);
      }
      update(item.clientId, { assetIds, uploading: false, uploadProgress: 100 });
    } catch { update(item.clientId, { uploading: false }); setError('Foto belum selesai diproses. Pilih ulang foto untuk mencoba lagi.'); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const valid = items.length > 0 && items.every(item => item.source === 'listing' ? Boolean(item.listingId) : item.name.trim().length >= 2 && item.details.trim().length >= 2 && /^(?:[1-9][0-9]{0,2})$/.test(item.quantity) && item.assetIds.length >= 1 && item.assetIds.length <= 4);
    if (!valid) { setError('Lengkapi setiap barang, termasuk detail, jumlah, dan minimal satu foto.'); return; }
    if (!auth.session || !target.data) { setError('Data akun atau listing belum siap. Muat ulang halaman.'); return; }
    let topup: TradeTopupInput = null;
    if (topupDirection !== 'none') {
      if (!/^[1-9][0-9]{0,15}$/.test(topupAmount)) { setError('Masukkan nominal tambahan uang dalam rupiah.'); return; }
      topup = { payerId: topupDirection === 'actor' ? auth.session.userId : target.data.publisher.id, amountRupiah: topupAmount };
    }
    const payload: TradeItemInput[] = items.map(item => item.source === 'listing'
      ? { clientId: item.clientId, source: 'listing', listingId: item.listingId }
      : { clientId: item.clientId, source: 'direct', name: item.name.trim(), details: item.details.trim(), quantity: item.quantity, assetIds: item.assetIds });
    setError(null); const key = commandKey ?? crypto.randomUUID(); setCommandKey(key); create.mutate({ payload, topup, key });
  }
  if (!chat || !listings || !trade) return <StatusPanel title="Pengajuan barter belum aktif"><p>Hubungkan backend untuk membuat tawaran nyata.</p></StatusPanel>;
  if (target.isPending || conversation.isPending || mine.isPending || auth.status === 'loading') return <StatusPanel title="Menyiapkan tawaran barter…" />;
  if (target.error || conversation.error || mine.error || !target.data) return <StatusPanel title="Tawaran barter tidak dapat disiapkan" error><Link to={`/listings/${listingId}`}>Kembali ke listing</Link></StatusPanel>;
  return <section className="trade-editor"><header><Link className="back-link" to={`/listings/${listingId}`}>Kembali ke listing</Link><p className="eyebrow">Penawaran untuk {target.data.publisher.name}</p><h1>Ajukan barter untuk {target.data.title}</h1><p>Penjual menawarkan listing ini. Tambahkan minimal satu barang dari pihakmu.</p></header>
    <form onSubmit={submit} className="stack-form">
      {items.map((item, index) => <fieldset key={item.clientId} className="trade-item-editor"><legend>Barangmu {index + 1}</legend>
        <div className="choice-grid"><label><input type="radio" name={`source-${item.clientId}`} checked={item.source === 'listing'} onChange={() => update(item.clientId, { source: 'listing' })} />Pilih listing milikmu</label><label><input type="radio" name={`source-${item.clientId}`} checked={item.source === 'direct'} onChange={() => update(item.clientId, { source: 'direct' })} />Tambah barang di sini</label></div>
        {item.source === 'listing' ? <label>Listing yang ditawarkan<select value={item.listingId} onChange={event => update(item.clientId, { listingId: event.target.value })}><option value="">Pilih listing aktif</option>{mine.data?.items.filter(entry => !entry.reserved).map(entry => <option key={entry.listingId} value={entry.listingId}>{entry.title}</option>)}</select></label> : <div className="nested-fields"><label>Nama barang<input maxLength={120} value={item.name} onChange={event => update(item.clientId, { name: event.target.value })} /></label><label>Detail dan kekurangan<textarea rows={3} maxLength={1000} value={item.details} onChange={event => update(item.clientId, { details: event.target.value })} /></label><label>Jumlah<input inputMode="numeric" value={item.quantity} onChange={event => update(item.clientId, { quantity: event.target.value })} /></label><label>Foto barang<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={item.uploading} onChange={event => void upload(item, event)} /></label><p className="form-help">{item.uploading ? `Memproses foto ${item.uploadProgress}%` : item.assetIds.length ? `${item.assetIds.length} foto siap dan tidak dipublikasikan.` : 'Wajib 1–4 foto; tidak dipasang ke feed.'}</p></div>}
        {items.length > 1 && <button className="text-button danger" type="button" onClick={() => setItems(current => current.filter(entry => entry.clientId !== item.clientId))}>Hapus barang {index + 1}</button>}
      </fieldset>)}
      <button className="button secondary" type="button" disabled={items.length >= 10} onClick={() => setItems(current => [...current, emptyItem()])}>Tambah barang lain</button>
      <section className="trade-item-editor"><h2>Tambahan uang</h2><label>Tambahan uang<select value={topupDirection} onChange={event => setTopupDirection(event.target.value as typeof topupDirection)}><option value="none">Tidak ada</option><option value="actor">Kamu membayar</option><option value="counterpart">{target.data.publisher.name} membayar</option></select></label>{topupDirection !== 'none' && <label>Nominal tambahan<input inputMode="numeric" value={topupAmount} onChange={event => setTopupAmount(event.target.value.replace(/\D/g, ''))} /></label>}<p className="form-help">Dibayar langsung saat bertemu setelah barang diperiksa. Barter tidak memakai DP.</p></section>
      <p className="revision-warning">Setelah tawaran berubah, status Siap dan Setuju kedua pihak akan direset untuk versi baru.</p>
      {(error || create.error) && <p className="form-alert" role="alert">{error ?? 'Tawaran belum tersimpan. Isian tetap ada; coba lagi.'}</p>}
      <button className="button full-button" disabled={create.isPending || items.some(item => item.uploading)}>{create.isPending ? 'Membuat tawaran…' : 'Buat tawaran barter'}</button>
    </form>
  </section>;
}
