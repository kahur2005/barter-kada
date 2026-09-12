import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { StatusPanel } from '../../components/StatusPanel';
import { useStoreGateway } from './StoreContext';
import type { StoreInput, StoreSummary } from './types';

const emptyInput: StoreInput = {
  slug: '',
  name: '',
  description: '',
  category: 'Makanan',
  areaId: 'jabodetabek',
  areaLabel: 'Jabodetabek',
  operatingHours: '',
  handoverMethods: ['meetup'],
  publicAddress: '',
  publicAddressConsent: false,
};

function inputFromStore(store: StoreSummary): StoreInput {
  return {
    slug: store.slug,
    name: store.name,
    description: store.description,
    category: store.category,
    areaId: store.areaId ?? 'jabodetabek',
    areaLabel: store.areaLabel,
    operatingHours: store.operatingHours ?? '',
    handoverMethods: store.handoverMethods?.length ? store.handoverMethods : ['meetup'],
    publicAddress: store.publicAddress ?? '',
    publicAddressConsent: store.publicAddressConsent ?? false,
  };
}

type StoreFormProps = {
  input: StoreInput;
  editing: boolean;
  pending: boolean;
  error: string | null;
  onChange: (key: keyof StoreInput, value: string | boolean) => void;
  onToggleHandover: (method: string, checked: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

function StoreForm({ input, editing, pending, error, onChange, onToggleHandover, onSubmit, onCancel }: StoreFormProps) {
  return (
    <form className="stack-form plus-panel" onSubmit={onSubmit}>
      <h2>{editing ? 'Edit profil toko' : 'Buat toko baru'}</h2>
      <label>
        Slug publik
        <input value={input.slug} readOnly={editing} onChange={event => onChange('slug', event.target.value.toLowerCase())} placeholder="dapur-rina" />
      </label>
      <label>
        Nama toko
        <input value={input.name} onChange={event => onChange('name', event.target.value)} />
      </label>
      <label>
        Kategori usaha
        <input value={input.category} onChange={event => onChange('category', event.target.value)} />
      </label>
      <label>
        Deskripsi
        <textarea rows={3} maxLength={2000} value={input.description} onChange={event => onChange('description', event.target.value)} />
      </label>
      <label>
        Wilayah usaha
        <input value={input.areaLabel} readOnly={editing} onChange={event => onChange('areaLabel', event.target.value)} />
        {editing && <small>Wilayah mengikuti area layanan resmi dan belum dapat dipindahkan dari sini.</small>}
      </label>
      <label>
        Jam operasional
        <input value={input.operatingHours} onChange={event => onChange('operatingHours', event.target.value)} placeholder="Senin–Sabtu, 08.00–17.00" />
      </label>
      <fieldset>
        <legend>Metode serah-terima</legend>
        {[
          ['pickup', 'Ambil di tempat'],
          ['meetup', 'Bertemu'],
          ['delivery', 'Antar'],
        ].map(([value, label]) => (
          <label className="check-row" key={value}>
            <input type="checkbox" checked={input.handoverMethods.includes(value)} onChange={event => onToggleHandover(value, event.target.checked)} />
            {label}
          </label>
        ))}
      </fieldset>
      <label>
        Alamat publik (opsional)
        <textarea rows={2} value={input.publicAddress} onChange={event => onChange('publicAddress', event.target.value)} />
      </label>
      <label className="check-row">
        <input type="checkbox" checked={input.publicAddressConsent} onChange={event => onChange('publicAddressConsent', event.target.checked)} />
        Tampilkan alamat ini di profil toko
      </label>
      {input.publicAddressConsent && input.publicAddress.trim() && (
        <aside className="store-public-preview">
          <h3>Pratinjau profil publik</h3>
          <p>Alamat ini akan terlihat oleh pengunjung.</p>
          <div className="store-public-preview-card">
            <strong>{input.name.trim() || 'Nama toko'}</strong>
            <p>{input.areaLabel}</p>
            <p>{input.publicAddress.trim()}</p>
          </div>
        </aside>
      )}
      {error && <p className="form-alert" role="alert">{error}</p>}
      <div className="form-actions">
        {editing && <button className="button secondary" type="button" disabled={pending} onClick={onCancel}>Batal</button>}
        <button className="button" disabled={pending}>
          {pending ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Buat toko'}
        </button>
      </div>
    </form>
  );
}

export function MyStoresPage() {
  const gateway = useStoreGateway();
  const client = useQueryClient();
  const [input, setInput] = useState<StoreInput>(emptyInput);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stores = useQuery({ queryKey: ['stores', 'mine'], queryFn: () => gateway!.getMyStores(), enabled: Boolean(gateway) });
  const plus = useQuery({ queryKey: ['plus', 'status'], queryFn: () => gateway!.getPlusStatus(), enabled: Boolean(gateway) });
  const reset = () => {
    setInput(emptyInput);
    setEditingId(null);
    setError(null);
    create.reset();
    update.reset();
  };
  const create = useMutation({
    mutationFn: () => gateway!.createStore(input),
    onSuccess: () => {
      reset();
      void client.invalidateQueries({ queryKey: ['stores', 'mine'] });
    },
  });
  const update = useMutation({
    mutationFn: () => gateway!.updateStore(editingId!, input),
    onSuccess: () => {
      reset();
      void client.invalidateQueries({ queryKey: ['stores', 'mine'] });
    },
  });
  const pending = create.isPending || update.isPending;

  function change(key: keyof StoreInput, value: string | boolean) {
    setInput(current => ({ ...current, [key]: value }));
    setError(null);
  }

  function toggleHandover(method: string, checked: boolean) {
    setInput(current => ({
      ...current,
      handoverMethods: checked ? [...new Set([...current.handoverMethods, method])] : current.handoverMethods.filter(item => item !== method),
    }));
    setError(null);
  }

  function edit(store: StoreSummary) {
    setEditingId(store.id);
    setInput(inputFromStore(store));
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/.test(input.slug) || input.name.trim().length < 2 || input.category.trim().length < 2) {
      setError('Slug, nama toko, dan kategori wajib diisi. Gunakan slug huruf kecil.');
      return;
    }
    if (!input.handoverMethods.length) {
      setError('Pilih minimal satu metode serah-terima.');
      return;
    }
    setError(null);
    if (editingId) update.mutate();
    else create.mutate();
  }

  if (!gateway) return <StatusPanel title="Toko belum aktif"><p>Aktifkan backend dan Plus untuk mengelola toko.</p></StatusPanel>;
  if (stores.isPending) return <StatusPanel title="Memuat toko…" />;
  if (stores.error) return <StatusPanel title="Toko belum dapat dimuat" error><button className="button" onClick={() => void stores.refetch()}>Coba lagi</button></StatusPanel>;

  return (
    <section className="stores-page">
      <header>
        <p className="eyebrow">Toko saya</p>
        <h1>Profil usaha</h1>
        <p>Satu akun dapat memiliki sampai tiga toko Plus. Produk tetap dikelola lewat listing.</p>
      </header>
      {stores.data?.length && plus.data && !plus.data.active && (
        <div className="plus-expired-banner" role="status">
          <h2>Plus berakhir</h2>
          <p>Toko disembunyikan karena Plus berakhir. Data dan transaksi berjalan tetap tersedia.</p>
          <div className="form-actions">
            <Link className="button" to="/plus">Perpanjang Plus</Link>
            <Link className="button secondary" to="/transactions">Buka transaksi</Link>
          </div>
        </div>
      )}
      {stores.data?.length ? (
        <div className="owner-list">
          {stores.data.map(store => (
            <article key={store.id}>
              <div>
                <span className="label">{store.status === 'active' && plus.data?.active !== false ? 'Aktif' : 'Tersembunyi'}</span>
                <h2>{store.name}</h2>
                <p>barter.app/stores/{store.slug} · {store.category} · {store.areaLabel}</p>
                <p>Produk aktif: {store.activeProductCount ?? '—'}</p>
              </div>
              <div className="form-actions">
                <Link className="button secondary" to={`/listings/new?storeId=${store.id}`}>Tambah produk</Link>
                <button className="button secondary" type="button" onClick={() => edit(store)}>Edit profil</button>
                <Link className="button secondary" to={`/stores/${store.slug}`}>Lihat profil</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <StatusPanel title="Belum ada toko"><p>Tambahkan profil untuk usaha catering, PO, atau produk preloved.</p></StatusPanel>
      )}
      <StoreForm
        input={input}
        editing={Boolean(editingId)}
        pending={pending}
        error={error ?? (create.error || update.error ? 'Toko belum tersimpan. Coba lagi.' : null)}
        onChange={change}
        onToggleHandover={toggleHandover}
        onSubmit={submit}
        onCancel={reset}
      />
    </section>
  );
}
