import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useListingGateway } from './ListingContext';
import type { ListingDraft, ListingValidationIssue } from './types';
import { validateListingDraft } from './validation';
import { useOnboardingGateway } from '../onboarding/OnboardingContext';
import type { ServiceArea } from '../onboarding/types';

const stages = ['Penawaran', 'Detail', 'Ketersediaan', 'Tinjau'] as const;
const categories = [['food', 'Makanan'], ['clothing', 'Pakaian'], ['home', 'Rumah & furnitur'], ['vehicles', 'Kendaraan'], ['garden', 'Hasil kebun'], ['other', 'Lainnya']] as const;
const initialDraft: ListingDraft = {
  sourceLifecycle: null, listingId: null, expectedVersion: null, publisher: { kind: 'personal' }, modes: ['sale'], fulfillment: 'ready_stock', categoryId: '', title: '', description: '', condition: null, defects: '', negotiable: false, barter: null, basePriceRupiah: null, variants: [], assetIds: [], handoverMethods: [], preorder: null, catering: null,
};

function WizardSteps({ current }: { current: number }) {
  return <ol className="listing-steps" aria-label="Tahap memasang penawaran">{stages.map((label, index) => <li key={label} className={index <= current ? 'reached' : ''} aria-current={index === current ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>;
}

export function ListingEditorPage() {
  const gateway = useListingGateway();
  const onboarding = useOnboardingGateway();
  const { id: listingId } = useParams<{ id: string }>();
  const [draft, setDraft] = useState<ListingDraft>(initialDraft);
  const [stage, setStage] = useState(listingId ? 1 : 0);
  const [issues, setIssues] = useState<ListingValidationIssue[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [localFiles, setLocalFiles] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(Boolean(listingId && gateway));
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
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

  const stageIssues = useMemo(() => {
    const all = validateListingDraft(draft, { intent: 'publish', now: new Date() });
    const prefixes = stage === 0 ? ['modes', 'fulfillment', 'categoryId', 'publisher'] : stage === 1 ? ['title', 'description', 'condition', 'defects', 'basePriceRupiah', 'negotiable', 'barter', 'variants', 'assetIds'] : stage === 2 ? ['handoverMethods', 'preorder', 'catering'] : [];
    return all.filter(issue => prefixes.some(prefix => issue.field === prefix || issue.field.startsWith(`${prefix}.`)));
  }, [draft, stage]);

  function toggleMode(mode: 'sale' | 'barter' | 'free', checked: boolean) {
    let modes = checked ? [...draft.modes, mode] : draft.modes.filter(item => item !== mode);
    if (checked && mode === 'free') modes = ['free'];
    if (checked && mode !== 'free') modes = modes.filter(item => item !== 'free');
    modes = [...new Set(modes)];
    patch({ modes, negotiable: modes.includes('sale') ? draft.negotiable : false, barter: modes.includes('barter') ? draft.barter ?? { openToOffers: true, wantedDescription: '' } : null, basePriceRupiah: modes.includes('sale') ? draft.basePriceRupiah : null });
  }
  function next() { setIssues(stageIssues); if (stageIssues.length === 0) { setStage(value => Math.min(3, value + 1)); window.scrollTo(0, 0); } }
  async function saveDraft() {
    if (!gateway) return; setPending(true); setIssues([]); setNotice(null);
    try {
      const editingActive = draft.sourceLifecycle === 'active';
      const validation = editingActive ? validateListingDraft(draft, { intent: 'publish', now: new Date() }) : [];
      if (validation.length > 0) { setIssues(validation); return; }
      const result = editingActive ? await gateway.publish(draft) : await gateway.saveDraft(draft);
      setDraft(current => ({ ...current, sourceLifecycle: result.lifecycle, listingId: result.listingId, expectedVersion: result.version }));
      setDirty(false);
      setNotice(editingActive ? 'Perubahan listing aktif tersimpan.' : 'Draft tersimpan. Penawaran belum diterbitkan.');
    }
    catch { setIssues([{ field: 'form', message: 'Draft belum dapat disimpan. Isianmu tetap ada; coba lagi.' }]); }
    finally { setPending(false); }
  }
  async function publish() {
    if (!gateway) return;
    const validation = validateListingDraft(draft, { intent: 'publish', now: new Date() }); setIssues(validation);
    if (validation.length > 0) return;
    setPending(true); setNotice(null);
    try { const result = await gateway.publish(draft); setDraft(current => ({ ...current, sourceLifecycle: result.lifecycle, listingId: result.listingId, expectedVersion: result.version })); setDirty(false); setNotice('Penawaran berhasil diterbitkan dan dapat ditemukan warga sekitar.'); }
    catch { setIssues([{ field: 'form', message: 'Penawaran belum dapat diterbitkan. Periksa isian dan batas akun.' }]); }
    finally { setPending(false); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); event.target.value = '';
    const invalid = files.find(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) { setIssues([{ field: 'assetIds', message: 'Foto harus JPEG, PNG, atau WebP dan maksimal 5 MB.' }]); return; }
    if (draft.assetIds.length + localFiles.length + files.length > 8) { setIssues([{ field: 'assetIds', message: 'Maksimal delapan foto.' }]); return; }
    if (!gateway) { setLocalFiles(current => [...current, ...files.map(file => file.name)]); setDirty(true); return; }
    setPending(true); setIssues([]);
    try {
      const ids: string[] = [];
      for (const file of files) ids.push(await gateway.uploadImage(file, setUploadProgress));
      patch({ assetIds: [...draft.assetIds, ...ids] });
    } catch { setIssues([{ field: 'assetIds', message: 'Foto belum berhasil diproses. Teks lain tetap tersimpan; coba foto ini lagi.' }]); }
    finally { setUploadProgress(null); setPending(false); }
  }

  if (loading) return <section className="listing-editor" aria-live="polite"><h1>Memuat listing…</h1></section>;
  return <div className="listing-editor"><header><Link className="back-link" to={listingId ? '/my/listings' : '/'}>Kembali</Link><p className="eyebrow">Jual, barter, atau bagikan</p><h1>{listingId ? 'Edit penawaran' : 'Pasang penawaran'}</h1><p>Isi bertahap. Penawaran yang valid langsung terbit tanpa menunggu persetujuan admin.</p></header>
    {!gateway && <p className="preview-form-notice">Form contoh — perubahan tidak disimpan atau diterbitkan.</p>}
    <WizardSteps current={stage} />
    {issues.length > 0 && <div className="form-alert" role="alert" tabIndex={-1}><strong>Periksa bagian berikut:</strong><ul>{issues.map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.message}</li>)}</ul></div>}
    {notice && <p className="success-notice" role="status">{notice}</p>}
    <section className="listing-editor-panel">
      {stage === 0 && <><h2>Pilih jenis penawaran</h2><div className="publisher-choice"><strong>Profil pribadi</strong><span>Semua akun lengkap dapat menerbitkan dagangan, PO, dan catering.</span></div><p className="inline-notice">Toko adalah fitur Plus. Kamu tetap bisa <Link to="/plus">pelajari Plus</Link> atau lanjut lewat profil pribadi.</p>
        <fieldset><legend>Jenis transaksi</legend><div className="choice-grid">{([['sale', 'Jual'], ['barter', 'Barter'], ['free', 'Gratis']] as const).map(([mode, label]) => <label key={mode}><input type="checkbox" checked={draft.modes.includes(mode)} onChange={event => toggleMode(mode, event.target.checked)} />{label}</label>)}</div></fieldset>
        <label htmlFor="category">Kategori</label><select id="category" value={draft.categoryId} onChange={event => patch({ categoryId: event.target.value })}><option value="">Pilih kategori</option>{categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
        <label htmlFor="fulfillment">Bentuk pemenuhan</label><select id="fulfillment" value={draft.fulfillment} onChange={event => patch({ fulfillment: event.target.value as ListingDraft['fulfillment'] })}><option value="ready_stock">Ready stock / barang tersedia</option><option value="preorder">Pre-order</option><option value="catering">Catering</option></select><p className="form-help">PO dan catering harus memakai Jual. Barter dan Gratis tersedia untuk barang ready stock.</p>
      </>}
      {stage === 1 && <><h2>Jelaskan barang atau produk</h2><label htmlFor="listing-title">Nama penawaran</label><input id="listing-title" value={draft.title} maxLength={120} onChange={event => patch({ title: event.target.value })} />
        <label htmlFor="listing-description">Detail</label><textarea id="listing-description" rows={6} value={draft.description} maxLength={5000} onChange={event => patch({ description: event.target.value })} />
        {!['food', 'garden'].includes(draft.categoryId) && draft.fulfillment === 'ready_stock' && <><label htmlFor="condition">Kondisi</label><select id="condition" value={draft.condition ?? ''} onChange={event => patch({ condition: event.target.value as ListingDraft['condition'] })}><option value="">Pilih kondisi</option><option value="new">Baru</option><option value="like_new">Seperti baru</option><option value="good">Baik</option><option value="fair">Cukup</option><option value="needs_repair">Perlu perbaikan</option></select><label htmlFor="defects">Kekurangan/kondisi penting</label><textarea id="defects" rows={3} value={draft.defects} onChange={event => patch({ defects: event.target.value })} /></>}
        {draft.modes.includes('sale') && <><label htmlFor="price">Harga utama (rupiah)</label><input id="price" inputMode="numeric" value={draft.basePriceRupiah ?? ''} onChange={event => patch({ basePriceRupiah: event.target.value || null })} /><label className="check-row"><input type="checkbox" checked={draft.negotiable} onChange={event => patch({ negotiable: event.target.checked })} />Harga bisa ditawar</label></>}
        {draft.modes.includes('barter') && <><label className="check-row"><input type="checkbox" checked={draft.barter?.openToOffers ?? true} onChange={event => patch({ barter: { openToOffers: event.target.checked, wantedDescription: draft.barter?.wantedDescription ?? '' } })} />Terbuka untuk semua tawaran</label>{!draft.barter?.openToOffers && <><label htmlFor="wanted">Barang yang diinginkan</label><textarea id="wanted" value={draft.barter?.wantedDescription ?? ''} onChange={event => patch({ barter: { openToOffers: false, wantedDescription: event.target.value } })} /></>}</>}
        <label htmlFor="photos">Foto aktual (maksimal 8 × 5 MB)</label><input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={upload} />{uploadProgress !== null && <p role="status">Memproses foto… {uploadProgress}%</p>}{localFiles.length > 0 && <ul className="file-list">{localFiles.map(name => <li key={name}>{name} — contoh lokal, belum diunggah</li>)}</ul>}
      </>}
      {stage === 2 && <><h2>Atur ketersediaan dan penyerahan</h2><fieldset><legend>Cara penyerahan</legend><div className="choice-grid">{([['pickup', 'Diambil'], ['meetup', 'Meet up'], ['delivery', 'Diantar']] as const).map(([method, label]) => <label key={method}><input type="checkbox" checked={draft.handoverMethods.includes(method)} onChange={event => patch({ handoverMethods: event.target.checked ? [...draft.handoverMethods, method] : draft.handoverMethods.filter(item => item !== method) })} />{label}</label>)}</div></fieldset>
        {draft.fulfillment === 'preorder' && <div className="nested-fields"><h3>Ketentuan pre-order</h3><button className="button secondary" type="button" onClick={() => patch({ preorder: draft.preorder ?? { orderClosesAt: '', fulfillmentAt: '', minimumQty: '1', quotaMode: 'unlimited', sharedQuota: null, dpPercent: '0' } })}>Isi ketentuan PO</button>{draft.preorder && <><label>Batas pemesanan<input type="datetime-local" value={draft.preorder.orderClosesAt} onChange={event => patch({ preorder: { ...draft.preorder!, orderClosesAt: event.target.value } })} /></label><label>Jadwal tersedia<input type="datetime-local" value={draft.preorder.fulfillmentAt} onChange={event => patch({ preorder: { ...draft.preorder!, fulfillmentAt: event.target.value } })} /></label><label>Minimum jumlah<input inputMode="numeric" value={draft.preorder.minimumQty} onChange={event => patch({ preorder: { ...draft.preorder!, minimumQty: event.target.value } })} /></label><label>Jenis kuota<select value={draft.preorder.quotaMode} onChange={event => patch({ preorder: { ...draft.preorder!, quotaMode: event.target.value as NonNullable<ListingDraft['preorder']>['quotaMode'], sharedQuota: event.target.value === 'shared' ? draft.preorder?.sharedQuota ?? '' : null } })}><option value="unlimited">Tanpa batas</option><option value="shared">Kuota bersama</option><option value="per_variant">Per varian</option></select></label>{draft.preorder.quotaMode === 'shared' && <label>Kuota tersedia<input inputMode="numeric" value={draft.preorder.sharedQuota ?? ''} onChange={event => patch({ preorder: { ...draft.preorder!, sharedQuota: event.target.value } })} /></label>}<label>DP (%)<input inputMode="numeric" value={draft.preorder.dpPercent} onChange={event => patch({ preorder: { ...draft.preorder!, dpPercent: event.target.value } })} /></label></>}</div>}
        {draft.fulfillment === 'catering' && <div className="nested-fields"><h3>Ketentuan catering</h3><button className="button secondary" type="button" onClick={() => patch({ catering: draft.catering ?? { minimumQty: '1', unit: 'box', leadTimeHours: '24', serviceAreaIds: [], availabilityNotes: '' } })}>Isi ketentuan catering</button>{draft.catering && <><label>Minimum pesanan<input inputMode="numeric" value={draft.catering.minimumQty} onChange={event => patch({ catering: { ...draft.catering!, minimumQty: event.target.value } })} /></label><label>Satuan<input value={draft.catering.unit} onChange={event => patch({ catering: { ...draft.catering!, unit: event.target.value } })} /></label><label>Waktu persiapan (jam)<input inputMode="numeric" value={draft.catering.leadTimeHours} onChange={event => patch({ catering: { ...draft.catering!, leadTimeHours: event.target.value } })} /></label><fieldset><legend>Area layanan</legend><div className="choice-grid">{serviceAreas.map(area => <label key={area.areaId}><input type="checkbox" checked={draft.catering?.serviceAreaIds.includes(area.areaId) ?? false} onChange={event => patch({ catering: { ...draft.catering!, serviceAreaIds: event.target.checked ? [...draft.catering!.serviceAreaIds, area.areaId] : draft.catering!.serviceAreaIds.filter(id => id !== area.areaId) } })} />{area.name}</label>)}</div>{serviceAreas.length === 0 && <p className="form-help">Area layanan belum dapat dimuat.</p>}</fieldset><label>Catatan ketersediaan<textarea value={draft.catering.availabilityNotes} onChange={event => patch({ catering: { ...draft.catering!, availabilityNotes: event.target.value } })} /></label></>}</div>}
      </>}
      {stage === 3 && <><h2>Tinjau penawaran</h2><div className="listing-review"><span className="label">{draft.publisher.kind === 'personal' ? 'Pribadi' : 'Toko'}</span><h3>{draft.title || 'Nama belum diisi'}</h3><p>{draft.description || 'Detail belum diisi.'}</p><dl><dt>Jenis</dt><dd>{draft.modes.join(' + ') || 'Belum dipilih'}</dd><dt>Pemenuhan</dt><dd>{draft.fulfillment}</dd><dt>Foto diproses</dt><dd>{draft.assetIds.length}</dd></dl></div><p className="inline-notice">Lokasi tepat tidak ditampilkan. Penawaran memakai area perkiraan dari profil atau toko.</p></>}
    </section>
    <div className="editor-actions"><button className="button secondary" type="button" onClick={() => setStage(value => Math.max(0, value - 1))} disabled={stage === 0}>Kembali</button>{stage < 3 ? <button className="button" type="button" onClick={next}>Lanjut ke {stages[stage + 1].toLocaleLowerCase('id-ID')}</button> : <button className="button" type="button" onClick={publish} disabled={!gateway || pending}>{gateway ? 'Terbitkan penawaran' : 'Publikasi tidak aktif'}</button>}</div>
    <button className="text-button draft-save" type="button" onClick={saveDraft} disabled={!gateway || pending}>{gateway ? pending ? 'Menyimpan…' : draft.sourceLifecycle === 'active' ? 'Simpan perubahan' : 'Simpan draft' : 'Simpan draft tidak aktif'}</button>
  </div>;
}
