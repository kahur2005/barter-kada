import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useRepository } from '../../app/providers';
import { StatusPanel } from '../../components/StatusPanel';
import { formatRupiah } from '../../lib/money';
import { useToast } from '../../components/Toast';
import { useAuth } from '../auth/AuthProvider';
import { useChatGateway } from '../chat/ChatContext';
import { useListingGateway } from '../listings/ListingContext';
import { useTradeGateway } from './TradeContext';
import type { TradeItemInput, TradeTopupInput } from './types';

type EditableItem = {
  clientId: string; source: 'listing' | 'direct'; listingId: string; name: string; details: string;
  quantity: string; assetIds: string[]; uploadProgress: number; uploading: boolean;
  previewUrls?: string[];
};
const emptyItem = (): EditableItem => ({ clientId: crypto.randomUUID(), source: 'direct', listingId: '', name: '', details: '', quantity: '1', assetIds: [], uploadProgress: 0, uploading: false });

export function NewTradePage() {
  const { listingId = '' } = useParams(); const repository = useRepository(); const auth = useAuth();
  const chat = useChatGateway(); const listings = useListingGateway(); const trade = useTradeGateway(); const navigate = useNavigate();
  const { showToast } = useToast();
  const [items, setItems] = useState<EditableItem[]>(() => [emptyItem()]);
  const [topupDirection, setTopupDirection] = useState<'none' | 'actor' | 'counterpart'>('none');
  const [topupAmount, setTopupAmount] = useState(''); const [error, setError] = useState<string | null>(null);
  const [commandKey, setCommandKey] = useState<string | null>(null);
  const target = useQuery({ queryKey: [repository.source, 'listing', listingId], queryFn: ({ signal }) => repository.getListing(listingId, signal) });
  const conversation = useQuery({ queryKey: ['trade', 'conversation', listingId], queryFn: () => chat!.openConversation(listingId), enabled: Boolean(chat && listingId) });
  const mine = useQuery({ queryKey: ['listings', 'mine', 'active', 'trade-form'], queryFn: () => listings!.listMine('active'), enabled: Boolean(listings) });
  const create = useMutation({
    mutationFn: ({ payload, topup, key }: { payload: TradeItemInput[]; topup: TradeTopupInput; key: string }) => trade!.create(listingId, payload, topup, key),
    onSuccess: room => {
      setCommandKey(null);
      showToast('Tawaran barter berhasil diajukan!', 'success');
      navigate(`/transactions/${room.id}`, { replace: true });
    },
    onError: () => {
      showToast('Gagal mengajukan barter. Silakan periksa kembali isian.', 'error');
    }
  });
  function update(clientId: string, change: Partial<EditableItem>) { setItems(current => current.map(item => item.clientId === clientId ? { ...item, ...change } : item)); }
  async function upload(item: EditableItem, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); event.target.value = '';
    if (!conversation.data || files.length < 1 || files.length > 4 || files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024)) {
      setError('Pilih 1–4 foto JPG, PNG, atau WebP; maksimal 5 MB per foto.'); return;
    }
    const localPreviews = files.map(f => URL.createObjectURL(f));
    setError(null); update(item.clientId, { uploading: true, uploadProgress: 0, assetIds: [], previewUrls: localPreviews });
    try {
      const assetIds: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const assetId = await trade!.uploadDirectImage(conversation.data, files[index], progress => update(item.clientId, { uploadProgress: Math.round((index * 100 + progress) / files.length) }));
        assetIds.push(assetId);
      }
      update(item.clientId, { assetIds, uploading: false, uploadProgress: 100 });
      showToast('Foto barang berhasil diunggah', 'success');
    } catch {
      update(item.clientId, { uploading: false });
      setError('Foto belum selesai diproses. Pilih ulang foto untuk mencoba lagi.');
      showToast('Gagal memproses foto barang', 'error');
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const valid = items.length > 0 && items.every(item => item.source === 'listing' ? Boolean(item.listingId) : item.name.trim().length >= 2 && item.details.trim().length >= 2 && /^(?:[1-9][0-9]{0,2})$/.test(item.quantity) && item.assetIds.length >= 1 && item.assetIds.length <= 4);
    if (!valid) {
      const msg = 'Lengkapi setiap barang, termasuk nama, detail, jumlah, dan minimal 1 foto.';
      setError(msg);
      showToast(msg, 'warning');
      return;
    }
    if (!auth.session || !target.data) {
      const msg = 'Data akun atau listing belum siap. Muat ulang halaman.';
      setError(msg);
      showToast(msg, 'error');
      return;
    }
    let topup: TradeTopupInput = null;
    if (topupDirection !== 'none') {
      if (!/^[1-9][0-9]{0,15}$/.test(topupAmount)) {
        const msg = 'Masukkan nominal tambahan uang dalam rupiah.';
        setError(msg);
        showToast(msg, 'warning');
        return;
      }
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
  return <section className="trade-editor">
    <header>
      <Link className="back-link" to={`/listings/${listingId}`}>Kembali ke listing</Link>
      <p className="eyebrow">Penawaran barter</p>
      <h1>Ajukan barter untuk {target.data.title}</h1>
      <p>Pemilik menawarkan listing ini. Pilih listing milikmu atau masukkan barang yang ingin kamu tukarkan.</p>
    </header>

    <div className="trade-target-summary" aria-label="Listing target yang akan dibarter">
      {target.data.images?.[0]?.url ? (
        <img src={target.data.images[0].url} alt={target.data.title} className="trade-target-img" />
      ) : (
        <div className="image-fallback trade-target-img">Tanpa Foto</div>
      )}
      <div className="trade-target-info">
        <span className="badge badge-info" style={{ display: 'inline-block', marginBottom: '4px' }}>
          {target.data.modes.includes('barter') ? 'Bisa Barter' : 'Penjualan / Barter'}
        </span>
        <h2>{target.data.title}</h2>
        <p>Pemilik: <strong>{target.data.publisher.name}</strong></p>
        {target.data.area?.name && <p>Lokasi: {target.data.area.name}</p>}
      </div>
    </div>

    <form onSubmit={submit} className="stack-form">
      {items.map((item, index) => (
        <fieldset key={item.clientId} className="trade-item-editor">
          <legend>Barangmu {index + 1}</legend>
          <div className="choice-grid">
            <label><input type="radio" name={`source-${item.clientId}`} checked={item.source === 'listing'} onChange={() => update(item.clientId, { source: 'listing' })} />Pilih listing milikmu</label>
            <label><input type="radio" name={`source-${item.clientId}`} checked={item.source === 'direct'} onChange={() => update(item.clientId, { source: 'direct' })} />Tambah barang di sini</label>
          </div>
          {item.source === 'listing' ? (
            <label>
              Listing yang ditawarkan
              <select value={item.listingId} onChange={event => update(item.clientId, { listingId: event.target.value })}>
                <option value="">Pilih listing aktif</option>
                {mine.data?.items.filter(entry => !entry.reserved).map(entry => (
                  <option key={entry.listingId} value={entry.listingId}>{entry.title}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="nested-fields">
              <label>
                Nama barang
                <input maxLength={120} value={item.name} onChange={event => update(item.clientId, { name: event.target.value })} placeholder="Contoh: Kamera Analog Yashica" />
              </label>
              <label>
                Detail dan kondisi/kekurangan
                <textarea rows={3} maxLength={1000} value={item.details} onChange={event => update(item.clientId, { details: event.target.value })} placeholder="Jelaskan kondisi fisik, fungsi, dan kelengkapan secara jujur..." />
              </label>
              <label>
                Jumlah
                <input inputMode="numeric" value={item.quantity} onChange={event => update(item.clientId, { quantity: event.target.value })} />
              </label>
              <label>
                Foto barang
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={item.uploading} onChange={event => void upload(item, event)} />
              </label>
              {item.previewUrls && item.previewUrls.length > 0 && (
                <div className="chat-previews-strip" aria-label="Pratinjau foto barang">
                  {item.previewUrls.map((url, i) => (
                    <div key={url} className="chat-preview-item">
                      <img src={url} alt={`Foto barang ${i + 1}`} />
                    </div>
                  ))}
                </div>
              )}
              <p className="form-help">{item.uploading ? `Memproses foto ${item.uploadProgress}%` : item.assetIds.length ? `${item.assetIds.length} foto siap dan tidak dipublikasikan ke feed.` : 'Wajib 1–4 foto; foto hanya dapat dilihat oleh rekan barter.'}</p>
            </div>
          )}
          {items.length > 1 && (
            <button className="text-button danger" type="button" onClick={() => setItems(current => current.filter(entry => entry.clientId !== item.clientId))}>
              Hapus barang {index + 1}
            </button>
          )}
        </fieldset>
      ))}
      <button className="button secondary" type="button" disabled={items.length >= 10} onClick={() => setItems(current => [...current, emptyItem()])}>
        + Tambah barang lain
      </button>

      <section className="trade-item-editor">
        <h2>Tambahan uang (Top-up)</h2>
        <label htmlFor="topup-direction">
          Tambahan uang
          <select id="topup-direction" value={topupDirection} onChange={event => setTopupDirection(event.target.value as typeof topupDirection)}>
            <option value="none">Tidak ada tambahan uang</option>
            <option value="actor">Kamu yang membayar tambahan uang</option>
            <option value="counterpart">{target.data.publisher.name} membayar tambahan uang</option>
          </select>
        </label>
        {topupDirection !== 'none' && (
          <>
            <label htmlFor="topup-amount">Nominal tambahan</label>
            <div className="currency-input-wrap">
              <span className="currency-prefix">Rp</span>
              <input
                id="topup-amount"
                inputMode="numeric"
                value={topupAmount}
                onChange={event => setTopupAmount(event.target.value.replace(/\D/g, ''))}
                placeholder="0"
              />
            </div>
            {topupAmount && (
              <p className="form-help" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                {formatRupiah(topupAmount)}
              </p>
            )}
          </>
        )}
        <p className="form-help">Dibayar langsung saat serah terima/COD setelah fisik barang diperiksa bersama. Barter Kada tidak meminta uang muka (DP).</p>
      </section>

      <p className="revision-warning">Catatan: Setelah tawaran berubah di kemudian hari, status Siap dan Setuju kedua pihak akan direset agar adil bagi kedua pihak.</p>
      {(error || create.error) && <p className="form-alert" role="alert">{error ?? 'Tawaran belum tersimpan. Isian tetap ada; coba lagi.'}</p>}
      <button className="button full-button" disabled={create.isPending || items.some(item => item.uploading)}>
        {create.isPending ? 'Membuat tawaran…' : 'Buat tawaran barter'}
      </button>
    </form>
  </section>;
}
