import { useId, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRepository } from '../../app/providers';
import { areas, categories, parseDiscoveryQuery, serializeDiscoveryQuery } from './filters';
import type { DiscoveryQuery, PublicListing, PublicStore } from './types';
import { ListingRow } from '../../components/ListingRow';
import { StoreRow } from '../../components/StoreRow';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { LoadingRows, StatusPanel } from '../../components/StatusPanel';
import { FilterForm } from './FilterForm';
import { AreaPicker } from './AreaPicker';

export function DiscoveryPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const isStores = location.pathname === '/stores';
  const query = parseDiscoveryQuery(params);
  const repo = useRepository();
  const [dialog, setDialog] = useState<'filter' | 'area' | null>(null);
  const inputId = useId();
  const results = useInfiniteQuery({
    queryKey: [repo.source, 'discovery', isStores, query], initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }): Promise<{ items: (PublicListing | PublicStore)[]; nextCursor: string | null }> => {
      return isStores ? repo.searchStores({ ...query, cursor: pageParam }, signal) : repo.searchListings({ ...query, cursor: pageParam }, signal);
    },
    getNextPageParam: last => last.nextCursor ?? undefined,
  });
  function apply(next: DiscoveryQuery) { setParams(serializeDiscoveryQuery(next)); setDialog(null); }
  const filterCount = [query.category, !isStores && query.mode, !isStores && query.fulfillment, !isStores && query.minPrice, !isStores && query.maxPrice].filter(Boolean).length;
  const items = results.data?.pages.flatMap(page => page.items) ?? [];
  const area = areas.find(a => a.id === query.areaId)?.name ?? 'Depok';
  const stateKey = location.pathname + params.toString();
  return <>
    <div className="discovery-heading"><h1>{isStores ? 'Toko sekitar' : 'Penawaran di sekitar'}</h1><button className="area-button" onClick={() => setDialog('area')}><Icon name="pin" />{area} · {query.radiusKm} km<Icon name="chevron" /></button></div>
    <form className="search-form" role="search" onSubmit={e => { e.preventDefault(); const input = new FormData(e.currentTarget).get('query')?.toString().trim().slice(0, 120) ?? ''; apply({ ...query, query: input, sort: input ? 'relevance' : 'newest', cursor: null }); }}>
      <label htmlFor={inputId} className="sr-only">Cari barang, makanan, atau toko</label><Icon name="search" /><input key={stateKey} id={inputId} type="search" name="query" defaultValue={query.query} placeholder="Cari barang, makanan, atau toko" maxLength={120} /><button className="button" type="submit">Cari</button>
    </form>
    <nav className="discovery-tabs" aria-label="Jenis hasil"><Link className={!isStores ? 'selected' : ''} aria-current={!isStores ? 'page' : undefined} to={`/?${params}`}>Barang</Link><Link className={isStores ? 'selected' : ''} aria-current={isStores ? 'page' : undefined} to={`/stores?${params}`}>Toko sekitar</Link></nav>
    <div className="discovery-layout">
      <aside className="discovery-sidebar">
        <h2 className="sidebar-title">Jelajahi kategori</h2><nav aria-label="Kategori" className="category-directory">{categories.map(c => <button key={c.id} className={query.category === c.id ? 'selected' : ''} onClick={() => apply({ ...query, category: query.category === c.id ? null : c.id, cursor: null })}>{c.name}</button>)}</nav>
        <div className="desktop-filters"><h2>Saring penawaran</h2><FilterForm key={stateKey} query={query} onApply={apply} stores={isStores} /><p className="sidebar-note">Jual, barter, atau bagikan.<br />Tanpa biaya platform untuk transaksi barang.</p></div>
      </aside>
      <section className="results-section" aria-label={isStores ? 'Daftar toko' : 'Daftar penawaran'}>
        <div className="results-toolbar"><button className="filter-toggle" onClick={() => setDialog('filter')}><Icon name="filter" />Filter{filterCount ? ` (${filterCount})` : ''}</button><p className="results-caption">{query.query ? `Hasil untuk “${query.query}”` : 'Temukan yang kamu perlukan'}</p><label className="sort-label">Urut<select aria-label="Urutkan hasil" value={query.sort} onChange={e => apply({ ...query, sort: e.target.value as DiscoveryQuery['sort'] })}><option value="newest">Terbaru</option><option value="nearest">Terdekat</option><option value="relevance">Relevansi</option></select></label></div>
        {results.isPending && <LoadingRows />}
        {results.isError && <StatusPanel title="Tidak dapat memuat penawaran" error><p>{results.error.message}</p><button className="button secondary" onClick={() => void results.refetch()}>Coba lagi</button></StatusPanel>}
        {!results.isPending && !results.isError && items.length === 0 && <StatusPanel title="Belum ada penawaran yang cocok"><p>Coba kategori lain atau ubah area pencarianmu.</p><button className="button secondary" onClick={() => apply({ ...query, query: '', category: null, mode: null, fulfillment: null, minPrice: null, maxPrice: null })}>Hapus filter pencarian</button><button className="text-button" onClick={() => setDialog('area')}>Ubah area</button></StatusPanel>}
        <div className="result-list">{items.map((item, index) => 'slug' in item ? <StoreRow key={item.id} store={item} /> : <ListingRow key={item.id} listing={item} eager={index < 3} />)}</div>
        {results.hasNextPage && <button className="button secondary load-more" disabled={results.isFetchingNextPage} onClick={() => void results.fetchNextPage()}>{results.isFetchingNextPage ? 'Memuat…' : 'Tampilkan lagi'}</button>}
        <p className="results-footer">Lokasi disamarkan. Periksa barang dan sepakati penyerahan langsung dengan penjual.</p>
      </section>
    </div>
    {dialog === 'filter' && <Dialog title="Filter pencarian" onClose={() => setDialog(null)}><FilterForm query={query} onApply={apply} stores={isStores} /></Dialog>}
    {dialog === 'area' && <Dialog title="Area pencarian" onClose={() => setDialog(null)}><AreaPicker query={query} onApply={apply} preview={repo.source === 'preview'} /></Dialog>}
  </>;
}
