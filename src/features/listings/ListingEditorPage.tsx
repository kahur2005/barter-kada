import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useListingGateway } from './ListingContext';
import type { ListingDraft, ListingValidationIssue } from './types';
import { validateListingDraft } from './validation';
import { useOnboardingGateway } from '../onboarding/OnboardingContext';
import type { ServiceArea } from '../onboarding/types';
import { useStoreGateway } from '../stores/StoreContext';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';

const stages = ['Penawaran', 'Detail', 'Ketersediaan', 'Tinjau'] as const;
const categories = [['food', 'Makanan'], ['clothing', 'Pakaian'], ['home', 'Rumah & furnitur'], ['vehicles', 'Kendaraan'], ['garden', 'Hasil kebun'], ['other', 'Lainnya']] as const;
const initialDraft: ListingDraft = {
  sourceLifecycle: null, listingId: null, expectedVersion: null, publisher: { kind: 'personal' }, modes: ['sale'], fulfillment: 'ready_stock', categoryId: '', title: '', description: '', condition: null, defects: '', negotiable: false, barter: null, basePriceRupiah: null, variants: [], assetIds: [], handoverMethods: [], preorder: null, catering: null,
};

function WizardSteps({ current, onSelect }: { current: number; onSelect: (index: number) => void }) {
  return (
    <ol className="listing-steps" aria-label="Tahap memasang penawaran">
      {stages.map((label, index) => (
        <li key={label} className={index <= current ? 'reached' : ''} aria-current={index === current ? 'step' : undefined}>
          <button
            type="button"
            disabled={index > current}
            onClick={() => onSelect(index)}
            aria-label={`Tahap ${index + 1}: ${label}`}
          >
            <span>{index + 1}</span>
            {label}
          </button>
        </li>
      ))}
    </ol>
  );
}

export function ListingEditorPage() {
  const gateway = useListingGateway();
  const onboarding = useOnboardingGateway();
  const storesGateway = useStoreGateway();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { id: listingId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const requestedStoreId = searchParams.get('storeId');
  const [draft, setDraft] = useState<ListingDraft>(initialDraft);
  const [stage, setStage] = useState(listingId ? 1 : 0);
  const [issues, setIssues] = useState<ListingValidationIssue[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [localFiles, setLocalFiles] = useState<string[]>([]);
  const [assetPreviews, setAssetPreviews] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [retryFiles, setRetryFiles] = useState<File[]>([]);
  const [dirty, setDirty] = useState(false);
  const [exitDialog, setExitDialog] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(Boolean(listingId && gateway));
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const stores = useQuery({ queryKey: ['stores', 'mine', 'listing-editor'], queryFn: () => storesGateway!.getMyStores(), enabled: Boolean(storesGateway) });
  const patch = (next: Partial<ListingDraft>) => { setDraft(current => ({ ...current, ...next })); setDirty(true); setNotice(null); };

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!listingId || !gateway) return;
    let active = true;
    setLoading(true);
    gateway.getMine(listingId).then(value => {
      if (!active) return;
      if (value) setDraft(value);
      else setIssues([{ field: 'form', message: 'Listing tidak ditemukan atau bukan milikmu.' }]);
    }).catch(() => {
      if (active) setIssues([{ field: 'form', message: 'Listing belum dapat dimuat. Coba lagi.' }]);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gateway, listingId]);

  useEffect(() => {
    if (!onboarding) return;
    let active = true;
    onboarding.listAreas().then(value => { if (active) setServiceAreas(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [onboarding]);

  useEffect(() => {
    if (listingId || !requestedStoreId || !stores.data?.some(store => store.id === requestedStoreId)) return;
    setDraft(current => current.publisher.kind === 'personal' ? { ...current, publisher: { kind: 'store', storeId: requestedStoreId } } : current);
  }, [listingId, requestedStoreId, stores.data]);

  const stageIssues = useMemo(() => {
    const all = validateListingDraft(draft, { intent: 'publish', now: new Date() });
    const prefixes = stage === 0 ? ['modes', 'fulfillment', 'categoryId', 'publisher'] : stage === 1 ? ['title', 'description', 'condition', 'defects', 'basePriceRupiah', 'negotiable', 'barter', 'variants', 'assetIds'] : stage === 2 ? ['handoverMethods', 'preorder', 'catering'] : [];
    return all.filter(issue => prefixes.some(prefix => issue.field === prefix || issue.field.startsWith(`${prefix}.`)));
  }, [draft, stage]);

  const issueMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const issue of issues) {
      if (!map[issue.field]) map[issue.field] = issue.message;
    }
    return map;
  }, [issues]);

  function toggleMode(mode: 'sale' | 'barter' | 'free', checked: boolean) {
    let modes = checked ? [...draft.modes, mode] : draft.modes.filter(item => item !== mode);
    if (checked && mode === 'free') modes = ['free'];
    if (checked && mode !== 'free') modes = modes.filter(item => item !== 'free');
    modes = [...new Set(modes)];
    patch({ modes, negotiable: modes.includes('sale') ? draft.negotiable : false, barter: modes.includes('barter') ? draft.barter ?? { openToOffers: true, wantedDescription: '' } : null, basePriceRupiah: modes.includes('sale') ? draft.basePriceRupiah : null });
  }

  function next() {
    setIssues(stageIssues);
    if (stageIssues.length === 0) {
      setStage(value => Math.min(3, value + 1));
      window.scrollTo(0, 0);
    }
  }

  async function saveDraft(): Promise<boolean> {
    if (!gateway) return false;
    setPending(true); setIssues([]); setNotice(null);
    try {
      const editingActive = draft.sourceLifecycle === 'active';
      const validation = editingActive ? validateListingDraft(draft, { intent: 'publish', now: new Date() }) : [];
      if (validation.length > 0) { setIssues(validation); return false; }
      const result = editingActive ? await gateway.publish(draft) : await gateway.saveDraft(draft);
      setDraft(current => ({ ...current, sourceLifecycle: result.lifecycle, listingId: result.listingId, expectedVersion: result.version }));
      setDirty(false);
      const msg = editingActive ? 'Perubahan listing aktif tersimpan.' : 'Draft tersimpan. Penawaran belum diterbitkan.';
      setNotice(msg);
      toast.success(msg);
      return true;
    }
    catch {
      const err = 'Draft belum dapat disimpan. Isianmu tetap ada; coba lagi.';
      setIssues([{ field: 'form', message: err }]);
      toast.error(err);
      return false;
    }
    finally { setPending(false); }
  }

  function requestExit(event: MouseEvent<HTMLAnchorElement>) {
    if (!dirty) return;
    event.preventDefault();
    setExitDialog(true);
  }

  function discardAndExit() {
    setDirty(false);
    setExitDialog(false);
    navigate(listingId ? '/my/listings' : '/');
  }

  async function saveAndExit() {
    if (await saveDraft()) {
      setExitDialog(false);
      navigate(listingId ? '/my/listings' : '/');
    }
  }

  async function publish() {
    if (!gateway) return;
    const validation = validateListingDraft(draft, { intent: 'publish', now: new Date() });
    setIssues(validation);
    if (validation.length > 0) return;
    setPending(true); setNotice(null);
    try {
      const result = await gateway.publish(draft);
      setDraft(current => ({ ...current, sourceLifecycle: result.lifecycle, listingId: result.listingId, expectedVersion: result.version }));
      setDirty(false);
      toast.success('Penawaran berhasil diterbitkan dan dapat ditemukan warga sekitar!');
      navigate('/my/listings');
    }
    catch {
      const err = 'Penawaran belum dapat diterbitkan. Periksa isian dan batas akun.';
      setIssues([{ field: 'form', message: err }]);
      toast.error(err);
    }
    finally { setPending(false); }
  }

  function removeAsset(assetId: string) {
    patch({ assetIds: draft.assetIds.filter(id => id !== assetId) });
    setAssetPreviews(current => {
      const nextMap = { ...current };
      delete nextMap[assetId];
      return nextMap;
    });
    toast.info('Foto dihapus.');
  }

  function makePrimary(assetId: string) {
    patch({ assetIds: [assetId, ...draft.assetIds.filter(id => id !== assetId)] });
    toast.success('Foto utama diperbarui.');
  }

  async function processFiles(files: File[]) {
    const invalid = files.find(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) {
      setIssues([{ field: 'assetIds', message: 'Foto harus JPEG, PNG, atau WebP dan maksimal 5 MB.' }]);
      return;
    }
    if (draft.assetIds.length + localFiles.length + files.length > 8) {
      setIssues([{ field: 'assetIds', message: 'Maksimal 8 foto.' }]);
      return;
    }
    if (!gateway) {
      setLocalFiles(current => [...current, ...files.map(file => file.name)]);
      setDirty(true);
      return;
    }
    setRetryFiles(files);
    setPending(true); setIssues([]);
    try {
      for (const [index, file] of files.entries()) {
        const localPreview = URL.createObjectURL(file);
        const id = await gateway.uploadImage(file, setUploadProgress);
        setAssetPreviews(prev => ({ ...prev, [id]: localPreview }));
        setDraft(current => ({ ...current, assetIds: [...current.assetIds, id] }));
        setDirty(true);
        setRetryFiles(files.slice(index + 1));
      }
      setRetryFiles([]);
      toast.success('Foto berhasil diproses.');
    } catch {
      setIssues([{ field: 'assetIds', message: 'Foto belum berhasil diproses. Teks lain tetap tersimpan; coba foto ini lagi.' }]);
    }
    finally { setUploadProgress(null); setPending(false); }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    await processFiles(files);
  }

  if (loading) return <section className="listing-editor" aria-live="polite"><h1>Memuat listing…</h1></section>;

  return (
    <div className="listing-editor">
      <header>
        <Link className="back-link" to={listingId ? '/my/listings' : '/'} onClick={requestExit}>Kembali</Link>
        <p className="eyebrow">Jual, barter, atau bagikan</p>
        <h1>{listingId ? 'Edit penawaran' : 'Pasang penawaran'}</h1>
        <p>Tahap {stage + 1} dari 4: {stages[stage]}. Penawaran yang valid langsung terbit tanpa menunggu persetujuan admin.</p>
      </header>

      {!gateway && <p className="preview-form-notice">Form contoh — perubahan tidak disimpan atau diterbitkan.</p>}
      <WizardSteps current={stage} onSelect={s => { setStage(s); window.scrollTo(0, 0); }} />

      {issues.length > 0 && (
        <div className="form-alert" role="alert" tabIndex={-1}>
          <strong>Periksa bagian berikut:</strong>
          <ul>{issues.map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.message}</li>)}</ul>
        </div>
      )}
      {notice && <p className="success-notice" role="status">{notice}</p>}

      <section className="listing-editor-panel">
        {stage === 0 && (
          <>
            <h2>Pilih jenis penawaran</h2>
            <div className="publisher-choice">
              <strong>Profil pribadi</strong>
              <span>Semua akun lengkap dapat menerbitkan dagangan, PO, dan catering.</span>
            </div>
            {stores.data && stores.data.length > 0 && (
              <fieldset>
                <legend>Penerbit</legend>
                <div className="choice-grid">
                  <label>
                    <input type="radio" name="publisher" checked={draft.publisher.kind === 'personal'} onChange={() => patch({ publisher: { kind: 'personal' } })} />
                    Profil pribadi
                  </label>
                  {stores.data.map(store => (
                    <label key={store.id}>
                      <input type="radio" name="publisher" checked={draft.publisher.kind === 'store' && draft.publisher.storeId === store.id} onChange={() => patch({ publisher: { kind: 'store', storeId: store.id } })} />
                      {store.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <p className="inline-notice">Toko adalah fitur Plus. Kamu tetap bisa <Link to="/plus">pelajari Plus</Link> atau lanjut lewat profil pribadi.</p>

            <fieldset>
              <legend>Jenis transaksi</legend>
              <div className="choice-grid">
                {([['sale', 'Jual'], ['barter', 'Barter'], ['free', 'Gratis']] as const).map(([mode, label]) => (
                  <label key={mode}>
                    <input type="checkbox" checked={draft.modes.includes(mode)} onChange={event => toggleMode(mode, event.target.checked)} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label htmlFor="category">Kategori</label>
            <select
              id="category"
              value={draft.categoryId}
              aria-invalid={Boolean(issueMap.categoryId)}
              onChange={event => patch({ categoryId: event.target.value })}
            >
              <option value="">Pilih kategori</option>
              {categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            {issueMap.categoryId && <span className="input-error-msg"><Icon name="warning" size={16} /> {issueMap.categoryId}</span>}

            <label htmlFor="fulfillment">Bentuk pemenuhan</label>
            <select id="fulfillment" value={draft.fulfillment} onChange={event => patch({ fulfillment: event.target.value as ListingDraft['fulfillment'] })}>
              <option value="ready_stock">Ready stock / barang tersedia</option>
              <option value="preorder">Pre-order</option>
              <option value="catering">Catering</option>
            </select>
            <p className="form-help">PO dan catering harus memakai Jual. Barter dan Gratis tersedia untuk barang ready stock.</p>
          </>
        )}

        {stage === 1 && (
          <>
            <h2>Jelaskan barang atau produk</h2>
            <label htmlFor="listing-title">Nama penawaran</label>
            <input
              id="listing-title"
              value={draft.title}
              maxLength={120}
              placeholder="Contoh: Kamera Mirrorless Canon M50 Mulus"
              aria-invalid={Boolean(issueMap.title)}
              onChange={event => patch({ title: event.target.value })}
            />
            {issueMap.title && <span className="input-error-msg"><Icon name="warning" size={16} /> {issueMap.title}</span>}

            <label htmlFor="listing-description">Detail</label>
            <textarea
              id="listing-description"
              rows={6}
              value={draft.description}
              maxLength={5000}
              placeholder="Jelaskan spesifikasi, fungsi, kelengkapan barang, riwayat pemakaian..."
              aria-invalid={Boolean(issueMap.description)}
              onChange={event => patch({ description: event.target.value })}
            />
            {issueMap.description && <span className="input-error-msg"><Icon name="warning" size={16} /> {issueMap.description}</span>}

            {!['food', 'garden'].includes(draft.categoryId) && draft.fulfillment === 'ready_stock' && (
              <>
                <label htmlFor="condition">Kondisi barang</label>
                <select id="condition" value={draft.condition ?? ''} onChange={event => patch({ condition: event.target.value as ListingDraft['condition'] })}>
                  <option value="">Pilih kondisi</option>
                  <option value="new">Baru (Segel / Belum Dipakai)</option>
                  <option value="like_new">Seperti Baru (Mulus Normal)</option>
                  <option value="good">Baik (Fungsi Normal, Ada Bekas Pakai Wajar)</option>
                  <option value="fair">Cukup (Ada Lecet / Minus Ringan)</option>
                  <option value="needs_repair">Perlu Perbaikan / Rusak Sebagian</option>
                </select>
                <label htmlFor="defects">Kekurangan / kondisi penting (opsional)</label>
                <textarea id="defects" rows={3} placeholder="Contoh: Ada lecet halus di sudut bawah, tutup lensa tidak ada..." value={draft.defects} onChange={event => patch({ defects: event.target.value })} />
              </>
            )}

            {draft.modes.includes('sale') && (
              <>
                <label htmlFor="price">Harga utama (rupiah)</label>
                <div className="currency-input-wrap">
                  <span className="currency-prefix" aria-hidden="true">Rp</span>
                  <input
                    id="price"
                    inputMode="numeric"
                    value={draft.basePriceRupiah ? Number(draft.basePriceRupiah.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                    placeholder="0"
                    aria-invalid={Boolean(issueMap.basePriceRupiah)}
                    onChange={event => {
                      const raw = event.target.value.replace(/\D/g, '');
                      patch({ basePriceRupiah: raw || null });
                    }}
                  />
                </div>
                {issueMap.basePriceRupiah && <span className="input-error-msg"><Icon name="warning" size={16} /> {issueMap.basePriceRupiah}</span>}
                <label className="check-row">
                  <input type="checkbox" checked={draft.negotiable} onChange={event => patch({ negotiable: event.target.checked })} />
                  Harga bisa ditawar
                </label>
              </>
            )}

            {draft.modes.includes('barter') && (
              <>
                <label className="check-row">
                  <input type="checkbox" checked={draft.barter?.openToOffers ?? true} onChange={event => patch({ barter: { openToOffers: event.target.checked, wantedDescription: draft.barter?.wantedDescription ?? '' } })} />
                  Terbuka untuk semua tawaran barter
                </label>
                {!draft.barter?.openToOffers && (
                  <>
                    <label htmlFor="wanted">Barang yang diinginkan</label>
                    <textarea id="wanted" placeholder="Contoh: Ingin barter dengan sepeda lipat atau meja kerja minimalis" value={draft.barter?.wantedDescription ?? ''} onChange={event => patch({ barter: { openToOffers: false, wantedDescription: event.target.value } })} />
                  </>
                )}
              </>
            )}

            <label htmlFor="photos">Foto aktual</label>
            <div
              className={`photo-dropzone ${dragOver ? 'drag-active' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const files = Array.from(e.dataTransfer.files ?? []);
                void processFiles(files);
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Unggah foto barang"
            >
              <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span className="dropzone-title">Tarik &amp; lepas foto di sini, atau klik untuk memilih</span>
              <span className="dropzone-help">Format JPG, PNG, atau WebP (maksimal 8 foto, masing-masing maks 5 MB)</span>
              <input
                ref={fileInputRef}
                id="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={upload}
              />
            </div>
            {issueMap.assetIds && <span className="input-error-msg"><Icon name="warning" size={16} /> {issueMap.assetIds}</span>}

            {uploadProgress !== null && (
              <div className="upload-progress-box">
                <div className="upload-progress-track">
                  <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p role="status">Memproses foto… {uploadProgress}%</p>
              </div>
            )}

            {retryFiles.length > 0 && issues.some(issue => issue.field === 'assetIds') && (
              <button className="button secondary" type="button" onClick={() => void processFiles(retryFiles)} disabled={pending}>
                Ulangi unggah foto
              </button>
            )}

            {localFiles.length > 0 && (
              <ul className="file-list">{localFiles.map(name => <li key={name}>{name} — contoh lokal, belum diunggah</li>)}</ul>
            )}

            {draft.assetIds.length > 0 && (
              <div className="uploaded-photos-wrap">
                <p className="form-help">Urutan foto pertama menjadi foto utama.</p>
                <ul className="file-list listing-photos-grid" aria-label="Foto terunggah">
                  {draft.assetIds.map((assetId, index) => (
                    <li key={assetId} className="listing-photo-card">
                      <div className="photo-card-media">
                        {assetPreviews[assetId] ? (
                          <img src={assetPreviews[assetId]} alt={`Foto ${index + 1}`} className="photo-card-img" />
                        ) : (
                          <div className="photo-card-placeholder"><span>Foto {index + 1}</span></div>
                        )}
                        {index === 0 && <span className="photo-card-badge">Utama</span>}
                      </div>
                      <div className="photo-card-details">
                        <span className="photo-card-name">Foto {index + 1}{index === 0 ? ' — utama' : ''}</span>
                        <div className="form-actions">
                          {index > 0 && (
                            <button
                              className="button secondary"
                              type="button"
                              aria-label={`Jadikan foto utama ${index + 1}`}
                              onClick={() => makePrimary(assetId)}
                            >
                              Jadikan foto utama {index + 1}
                            </button>
                          )}
                          <button
                            className="button secondary"
                            type="button"
                            aria-label={`Hapus foto ${index + 1}`}
                            onClick={() => removeAsset(assetId)}
                          >
                            Hapus foto {index + 1}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {stage === 2 && (
          <>
            <h2>Atur ketersediaan dan penyerahan</h2>
            <fieldset>
              <legend>Cara penyerahan</legend>
              <div className="choice-grid">
                {([['pickup', 'Diambil'], ['meetup', 'Meet up'], ['delivery', 'Diantar']] as const).map(([method, label]) => (
                  <label key={method}>
                    <input type="checkbox" checked={draft.handoverMethods.includes(method)} onChange={event => patch({ handoverMethods: event.target.checked ? [...draft.handoverMethods, method] : draft.handoverMethods.filter(item => item !== method) })} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {issueMap.handoverMethods && <span className="input-error-msg"><Icon name="warning" size={16} /> {issueMap.handoverMethods}</span>}

            {draft.fulfillment === 'preorder' && (
              <div className="nested-fields">
                <h3>Ketentuan pre-order</h3>
                <button className="button secondary" type="button" onClick={() => patch({ preorder: draft.preorder ?? { orderClosesAt: '', fulfillmentAt: '', minimumQty: '1', quotaMode: 'unlimited', sharedQuota: null, dpPercent: '0' } })}>Isi ketentuan PO</button>
                {draft.preorder && (
                  <>
                    <label>Batas pemesanan<input type="datetime-local" value={draft.preorder.orderClosesAt} onChange={event => patch({ preorder: { ...draft.preorder!, orderClosesAt: event.target.value } })} /></label>
                    <label>Jadwal tersedia<input type="datetime-local" value={draft.preorder.fulfillmentAt} onChange={event => patch({ preorder: { ...draft.preorder!, fulfillmentAt: event.target.value } })} /></label>
                    <label>Minimum jumlah<input inputMode="numeric" value={draft.preorder.minimumQty} onChange={event => patch({ preorder: { ...draft.preorder!, minimumQty: event.target.value } })} /></label>
                    <label>Jenis kuota
                      <select value={draft.preorder.quotaMode} onChange={event => patch({ preorder: { ...draft.preorder!, quotaMode: event.target.value as NonNullable<ListingDraft['preorder']>['quotaMode'], sharedQuota: event.target.value === 'shared' ? draft.preorder?.sharedQuota ?? '' : null } })}>
                        <option value="unlimited">Tanpa batas</option>
                        <option value="shared">Kuota bersama</option>
                        <option value="per_variant">Per varian</option>
                      </select>
                    </label>
                    {draft.preorder.quotaMode === 'shared' && <label>Kuota tersedia<input inputMode="numeric" value={draft.preorder.sharedQuota ?? ''} onChange={event => patch({ preorder: { ...draft.preorder!, sharedQuota: event.target.value } })} /></label>}
                    <label>DP (%)<input inputMode="numeric" value={draft.preorder.dpPercent} onChange={event => patch({ preorder: { ...draft.preorder!, dpPercent: event.target.value } })} /></label>
                  </>
                )}
              </div>
            )}

            {draft.fulfillment === 'catering' && (
              <div className="nested-fields">
                <h3>Ketentuan catering</h3>
                <button className="button secondary" type="button" onClick={() => patch({ catering: draft.catering ?? { minimumQty: '1', unit: 'box', leadTimeHours: '24', serviceAreaIds: [], availabilityNotes: '' } })}>Isi ketentuan catering</button>
                {draft.catering && (
                  <>
                    <label>Minimum pesanan<input inputMode="numeric" value={draft.catering.minimumQty} onChange={event => patch({ catering: { ...draft.catering!, minimumQty: event.target.value } })} /></label>
                    <label>Satuan<input value={draft.catering.unit} onChange={event => patch({ catering: { ...draft.catering!, unit: event.target.value } })} /></label>
                    <label>Waktu persiapan (jam)<input inputMode="numeric" value={draft.catering.leadTimeHours} onChange={event => patch({ catering: { ...draft.catering!, leadTimeHours: event.target.value } })} /></label>
                    <fieldset>
                      <legend>Area layanan</legend>
                      <div className="choice-grid">
                        {serviceAreas.map(area => (
                          <label key={area.areaId}>
                            <input type="checkbox" checked={draft.catering?.serviceAreaIds.includes(area.areaId) ?? false} onChange={event => patch({ catering: { ...draft.catering!, serviceAreaIds: event.target.checked ? [...draft.catering!.serviceAreaIds, area.areaId] : draft.catering!.serviceAreaIds.filter(id => id !== area.areaId) } })} />
                            {area.name}
                          </label>
                        ))}
                      </div>
                      {serviceAreas.length === 0 && <p className="form-help">Area layanan belum dapat dimuat.</p>}
                    </fieldset>
                    <label>Catatan ketersediaan<textarea value={draft.catering.availabilityNotes} onChange={event => patch({ catering: { ...draft.catering!, availabilityNotes: event.target.value } })} /></label>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {stage === 3 && (
          <>
            <h2>Tinjau penawaran</h2>
            <div className="listing-review">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="badge badge-info">{draft.publisher.kind === 'personal' ? 'Pribadi' : 'Toko'}</span>
                {draft.modes.map(m => (
                  <span key={m} className={`badge ${m === 'free' ? 'badge-success' : m === 'barter' ? 'badge-warning' : 'badge-info'}`}>
                    {m === 'free' ? 'Gratis' : m === 'barter' ? 'Barter' : 'Jual'}
                  </span>
                ))}
              </div>
              <h3>{draft.title || 'Nama belum diisi'}</h3>
              <p>{draft.description || 'Detail belum diisi.'}</p>

              {draft.assetIds.length > 0 && (
                <div style={{ margin: '8px 0' }}>
                  <p className="sidebar-title">Pratinjau Foto ({draft.assetIds.length})</p>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
                    {draft.assetIds.map((id, idx) => (
                      <div key={id} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--rule)', flexShrink: 0 }}>
                        <img src={assetPreviews[id]} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {idx === 0 && <span style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'var(--action)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '1px 4px', borderRadius: '2px' }}>UTAMA</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <dl>
                <dt>Pemenuhan</dt>
                <dd>{draft.fulfillment === 'ready_stock' ? 'Ready Stock' : draft.fulfillment === 'preorder' ? 'Pre-Order' : 'Catering'}</dd>
                {draft.modes.includes('sale') && (
                  <>
                    <dt>Harga</dt>
                    <dd><strong>{draft.basePriceRupiah ? `Rp ${Number(draft.basePriceRupiah).toLocaleString('id-ID')}` : 'Belum diisi'}</strong>{draft.negotiable ? ' (Bisa ditawar)' : ' (Harga tetap)'}</dd>
                  </>
                )}
                {draft.condition && (
                  <>
                    <dt>Kondisi</dt>
                    <dd>{draft.condition === 'new' ? 'Baru' : draft.condition === 'like_new' ? 'Seperti Baru' : draft.condition === 'good' ? 'Baik' : draft.condition === 'fair' ? 'Cukup' : 'Perlu Perbaikan'}</dd>
                  </>
                )}
                <dt>Penyerahan</dt>
                <dd>{draft.handoverMethods.map(h => h === 'pickup' ? 'Diambil' : h === 'meetup' ? 'Meet Up' : 'Diantar').join(', ') || 'Belum dipilih'}</dd>
              </dl>
            </div>
            <p className="inline-notice">Lokasi tepat tidak ditampilkan. Penawaran memakai area perkiraan dari profil atau toko.</p>
          </>
        )}
      </section>

      <div className="editor-actions">
        <button className="button secondary" type="button" onClick={() => setStage(value => Math.max(0, value - 1))} disabled={stage === 0}>
          Kembali
        </button>
        {stage < 3 ? (
          <button className="button" type="button" onClick={next}>
            Lanjut ke {stages[stage + 1].toLocaleLowerCase('id-ID')}
          </button>
        ) : (
          <button className="button" type="button" onClick={publish} disabled={!gateway || pending}>
            {gateway ? (pending ? 'Menerbitkan…' : 'Terbitkan penawaran') : 'Publikasi tidak aktif'}
          </button>
        )}
      </div>

      <button className="text-button draft-save" type="button" onClick={saveDraft} disabled={!gateway || pending}>
        {gateway ? (pending ? 'Menyimpan…' : draft.sourceLifecycle === 'active' ? 'Simpan perubahan' : 'Simpan draft') : 'Simpan draft tidak aktif'}
      </button>

      {exitDialog && (
        <Dialog title="Simpan perubahan sebelum keluar?" onClose={() => setExitDialog(false)}>
          <p>Isian yang belum disimpan akan hilang jika kamu keluar dari editor.</p>
          <div className="form-actions">
            <button className="button secondary" type="button" onClick={() => setExitDialog(false)}>
              Tetap di editor
            </button>
            <button className="button secondary" type="button" onClick={discardAndExit} disabled={pending}>
              Buang perubahan
            </button>
            <button className="button" type="button" onClick={() => void saveAndExit()} disabled={pending || !gateway}>
              {pending ? 'Menyimpan…' : draft.sourceLifecycle === 'active' ? 'Simpan perubahan & keluar' : 'Simpan draft & keluar'}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
