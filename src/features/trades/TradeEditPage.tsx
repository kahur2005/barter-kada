import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useListingGateway } from '../listings/ListingContext';
import { StatusPanel } from '../../components/StatusPanel';
import { PageHeading } from '../../components/SurfacePrimitives';
import { formatRupiah } from '../../lib/money';
import { useToast } from '../../components/Toast';
import { useTradeGateway } from './TradeContext';
import type { TradeItemInput, TradeRoom, TradeTopupInput } from './types';

type EditableItem = {
  clientId: string;
  source: 'listing' | 'direct';
  listingId: string;
  name: string;
  details: string;
  quantity: string;
  assetIds: string[];
  photoCount: number;
  uploadProgress: number;
  uploading: boolean;
};

function itemFromRoom(item: TradeRoom['ownItems'][number]): EditableItem {
  return {
    clientId: crypto.randomUUID(),
    source: item.source,
    listingId: item.listingId ?? '',
    name: item.name,
    details: item.details,
    quantity: String(item.quantity),
    assetIds: item.photos.flatMap(photo => photo.assetId ? [photo.assetId] : []),
    photoCount: item.photos.length,
    uploadProgress: 100,
    uploading: false,
  };
}

export function TradeEditPage() {
  const { id = '' } = useParams();
  const auth = useAuth();
  const listings = useListingGateway();
  const trade = useTradeGateway();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [room, setRoom] = useState<TradeRoom | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [topupDirection, setTopupDirection] = useState<'none' | 'actor' | 'counterpart'>('none');
  const [topupAmount, setTopupAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [commandKey, setCommandKey] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['trade', id], queryFn: () => trade!.get(id), enabled: Boolean(trade && id) });
  const mine = useQuery({ queryKey: ['listings', 'mine', 'active', 'trade-edit', id], queryFn: () => listings!.listMine('active'), enabled: Boolean(listings && id) });

  useEffect(() => {
    if (!query.data || room?.id === query.data.id) return;
    setRoom(query.data);
    setItems(query.data.ownItems.map(itemFromRoom));
    if (query.data.topup) {
      setTopupDirection(query.data.topup.payerId === query.data.actor.id ? 'actor' : 'counterpart');
      setTopupAmount(query.data.topup.amountRupiah);
    }
  }, [query.data, room?.id]);

  const revise = useMutation({
    mutationFn: ({ payload, topup, key }: { payload: TradeItemInput[]; topup: TradeTopupInput; key: string }) => trade!.revise(id, room!.revision, payload, topup, reason.trim(), key),
    onSuccess: next => {
      setCommandKey(null);
      showToast('Versi penawaran baru berhasil disimpan!', 'success');
      navigate(`/transactions/${next.id}`, { replace: true });
    },
    onError: () => {
      showToast('Gagal menyimpan revisi barter. Silakan coba lagi.', 'error');
    }
  });

  function update(clientId: string, change: Partial<EditableItem>) {
    setItems(current => current.map(item => item.clientId === clientId ? { ...item, ...change } : item));
  }

  async function upload(item: EditableItem, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!room || files.length < 1 || files.length > 4 || files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024)) {
      setError('Pilih 1–4 foto JPG, PNG, atau WebP; maksimal 5 MB per foto.');
      return;
    }
    setError(null);
    update(item.clientId, { uploading: true, uploadProgress: 0, assetIds: [], photoCount: 0 });
    try {
      const assetIds: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const assetId = await trade!.uploadDirectImage(room.conversationId, files[index], progress => update(item.clientId, { uploadProgress: Math.round((index * 100 + progress) / files.length) }));
        assetIds.push(assetId);
      }
      update(item.clientId, { assetIds, photoCount: assetIds.length, uploading: false, uploadProgress: 100 });
    } catch {
      update(item.clientId, { uploading: false });
      setError('Foto belum selesai diproses. Pilih ulang foto untuk mencoba lagi.');
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!room || room.lifecycle !== 'negotiating') {
      setError('Versi ini sudah tidak dapat diubah.');
      return;
    }
    const valid = items.length > 0 && items.every(item => item.source === 'listing'
      ? Boolean(item.listingId)
      : item.name.trim().length >= 2 && item.details.trim().length >= 2 && /^(?:[1-9][0-9]{0,2})$/.test(item.quantity) && item.assetIds.length >= 1 && item.assetIds.length <= 4);
    if (!valid) { setError('Lengkapi setiap barang, termasuk detail, jumlah, dan minimal satu foto.'); return; }
    if (reason.trim().length < 2 || reason.trim().length > 300) { setError('Jelaskan perubahan dalam 2–300 karakter.'); return; }
    let topup: TradeTopupInput = null;
    if (topupDirection !== 'none') {
      if (!/^[1-9][0-9]{0,15}$/.test(topupAmount)) { setError('Masukkan nominal tambahan uang dalam rupiah.'); return; }
      topup = { payerId: topupDirection === 'actor' ? room.actor.id : room.counterpart.id, amountRupiah: topupAmount };
    }
    const payload: TradeItemInput[] = items.map(item => item.source === 'listing'
      ? { clientId: item.clientId, source: 'listing', listingId: item.listingId }
      : { clientId: item.clientId, source: 'direct', name: item.name.trim(), details: item.details.trim(), quantity: item.quantity, assetIds: item.assetIds });
    setError(null);
    const key = commandKey ?? crypto.randomUUID();
    setCommandKey(key);
    revise.mutate({ payload, topup, key });
  }

  if (!trade || !listings) return <StatusPanel title="Editor barter belum aktif"><p>Hubungkan backend untuk mengubah tawaran nyata.</p></StatusPanel>;
  if (query.isPending || mine.isPending || auth.status === 'loading' || !room) return <StatusPanel title="Memuat versi barter…" />;
  if (query.error || mine.error) return <StatusPanel title="Versi barter tidak dapat dibuka" error><Link to={`/transactions/${id}`}>Kembali ke barter</Link></StatusPanel>;
  if (room.lifecycle !== 'negotiating') return <StatusPanel title="Barter tidak lagi dapat diubah"><p>Perubahan hanya bisa diajukan saat kedua pihak masih menegosiasikan barter.</p><Link className="button" to={`/transactions/${id}`}>Kembali ke ruang barter</Link></StatusPanel>;

  return <section className="trade-editor">
    <PageHeading leading={<Link className="back-link" to={`/transactions/${id}`}>Kembali ke barter</Link>} kicker={`Revisi versi ${room.revision}`} title="Ubah penawaranmu" description="Perubahan akan membuat versi baru dan menghapus status Siap serta Setuju kedua pihak." />
    <form onSubmit={submit} className="stack-form">
      {items.map((item, index) => <fieldset key={item.clientId} className="trade-item-editor"><legend>Barangmu {index + 1}</legend>
        <div className="choice-grid"><label><input type="radio" name={`source-${item.clientId}`} checked={item.source === 'listing'} onChange={() => update(item.clientId, { source: 'listing' })} />Pilih listing milikmu</label><label><input type="radio" name={`source-${item.clientId}`} checked={item.source === 'direct'} onChange={() => update(item.clientId, { source: 'direct' })} />Tambah barang di sini</label></div>
        {item.source === 'listing' ? <label>Listing yang ditawarkan<select value={item.listingId} onChange={event => update(item.clientId, { listingId: event.target.value })}><option value="">Pilih listing aktif</option>{mine.data?.items.filter(entry => !entry.reserved || entry.listingId === item.listingId).map(entry => <option key={entry.listingId} value={entry.listingId}>{entry.title}</option>)}</select></label> : <div className="nested-fields"><label>Nama barang<input maxLength={120} value={item.name} onChange={event => update(item.clientId, { name: event.target.value })} /></label><label>Detail dan kekurangan<textarea rows={3} maxLength={1000} value={item.details} onChange={event => update(item.clientId, { details: event.target.value })} /></label><label>Jumlah<input inputMode="numeric" value={item.quantity} onChange={event => update(item.clientId, { quantity: event.target.value })} /></label><label>Ganti foto barang<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={item.uploading} onChange={event => void upload(item, event)} /></label><p className="form-help">{item.uploading ? `Memproses foto ${item.uploadProgress}%` : `${item.assetIds.length || item.photoCount} foto siap dan tetap privat.`}</p></div>}
        {items.length > 1 && <button className="text-button danger" type="button" onClick={() => setItems(current => current.filter(entry => entry.clientId !== item.clientId))}>Hapus barang {index + 1}</button>}
      </fieldset>)}
      <button className="button secondary" type="button" disabled={items.length >= 10} onClick={() => setItems(current => [...current, { clientId: crypto.randomUUID(), source: 'direct', listingId: '', name: '', details: '', quantity: '1', assetIds: [], photoCount: 0, uploadProgress: 0, uploading: false }])}>Tambah barang lain</button>
      <section className="trade-item-editor">
        <h2>Tambahan uang (Top-up)</h2>
        <label>
          Arah pembayaran tambahan
          <select value={topupDirection} onChange={event => setTopupDirection(event.target.value as typeof topupDirection)}>
            <option value="none">Tidak ada tambahan uang</option>
            <option value="actor">Kamu membayar tambahan uang</option>
            <option value="counterpart">{room.counterpart.name} membayar tambahan uang</option>
          </select>
        </label>
        {topupDirection !== 'none' && (
          <label>
            Nominal tambahan
            <div className="currency-input-wrap">
              <span className="currency-prefix">Rp</span>
              <input
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
          </label>
        )}
        <p className="form-help">Dibayar langsung saat serah terima/COD setelah fisik barang diperiksa bersama. Barter Kada tidak memakai DP.</p>
      </section>
      <label>Alasan perubahan<textarea rows={3} minLength={2} maxLength={300} value={reason} onChange={event => setReason(event.target.value)} placeholder="Contoh: mengganti barang karena stok sudah berubah" /></label>
      {(error || revise.error) && <p className="form-alert" role="alert">{error ?? 'Revisi belum tersimpan. Isian tetap ada; coba lagi.'}</p>}
      <button className="button full-button" disabled={revise.isPending || items.some(item => item.uploading)}>{revise.isPending ? 'Menyimpan versi baru…' : 'Simpan versi baru'}</button>
    </form>
  </section>;
}
