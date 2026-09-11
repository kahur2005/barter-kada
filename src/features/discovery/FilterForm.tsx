import { useId, useState, type FormEvent } from 'react';
import type { DiscoveryQuery } from './types';
import { categories } from './filters';

export function FilterForm({ query, onApply, stores = false }: { query: DiscoveryQuery; onApply: (query: DiscoveryQuery) => void; stores?: boolean }) {
  const id = useId();
  const [draft, setDraft] = useState(query);
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    const money = /^(0|[1-9]\d{0,18})$/;
    if ([draft.minPrice, draft.maxPrice].some(v => v !== null && !money.test(v))) { setError('Harga harus berupa rupiah utuh, tanpa titik atau koma.'); return; }
    if (draft.minPrice && draft.maxPrice && BigInt(draft.minPrice) > BigInt(draft.maxPrice)) { setError('Harga maksimum harus sama atau lebih besar dari minimum.'); return; }
    onApply({ ...draft, cursor: null });
  }
  return <form className="filter-form" onSubmit={submit}>
    <label htmlFor={`${id}-category`}>Kategori</label><select id={`${id}-category`} value={draft.category ?? ''} onChange={e => setDraft({ ...draft, category: e.target.value || null })}><option value="">Semua kategori</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    {!stores && <>
      <label htmlFor={`${id}-mode`}>Jenis penawaran</label><select id={`${id}-mode`} value={draft.mode ?? ''} onChange={e => setDraft({ ...draft, mode: (e.target.value || null) as DiscoveryQuery['mode'] })}><option value="">Semua penawaran</option><option value="sale">Jual</option><option value="barter">Barter</option><option value="free">Gratis</option></select>
      <label htmlFor={`${id}-fulfillment`}>Ketersediaan</label><select id={`${id}-fulfillment`} value={draft.fulfillment ?? ''} onChange={e => setDraft({ ...draft, fulfillment: (e.target.value || null) as DiscoveryQuery['fulfillment'] })}><option value="">Semua</option><option value="ready_stock">Siap tersedia</option><option value="preorder">Pre-order</option><option value="catering">Catering</option></select>
      <fieldset><legend>Harga barang (Rp)</legend><div className="price-fields"><div><label htmlFor={`${id}-min`}>Minimum</label><input id={`${id}-min`} inputMode="numeric" value={draft.minPrice ?? ''} onChange={e => setDraft({ ...draft, minPrice: e.target.value || null })} aria-describedby={error ? `${id}-error` : undefined} /></div><div><label htmlFor={`${id}-max`}>Maksimum</label><input id={`${id}-max`} inputMode="numeric" value={draft.maxPrice ?? ''} onChange={e => setDraft({ ...draft, maxPrice: e.target.value || null })} aria-describedby={error ? `${id}-error` : undefined} /></div></div></fieldset>
    </>}
    {error && <p role="alert" id={`${id}-error`} className="field-error">{error}</p>}
    <div className="form-actions"><button type="button" className="button secondary" onClick={() => { setError(''); const reset = { ...draft, category: null, mode: null, fulfillment: null, minPrice: null, maxPrice: null, cursor: null }; setDraft(reset); onApply(reset); }}>Reset</button><button type="submit" className="button">Terapkan</button></div>
  </form>;
}
