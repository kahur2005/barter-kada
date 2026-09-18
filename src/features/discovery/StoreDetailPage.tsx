import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRepository } from '../../app/providers';
import { parseDiscoveryQuery, serializeDiscoveryQuery } from './filters';
import { ListingRow } from '../../components/ListingRow';
import { LoadingRows, StatusPanel } from '../../components/StatusPanel';
import { Icon } from '../../components/Icon';
import { handoverLabels, returnPath } from './ListingDetailPage';
import { BackLink } from '../../components/NavigationLinks';

export function StoreDetailPage() {
  const { slug = '' } = useParams(); const location = useLocation(); const repo = useRepository();
  const [params, setParams] = useSearchParams(); const query = parseDiscoveryQuery(params);
  const store = useQuery({ queryKey: [repo.source, 'store', slug], queryFn: ({ signal }) => repo.getStore(slug, signal) });
  const catalogue = useInfiniteQuery({ queryKey: [repo.source, 'store-catalogue', slug, query], enabled: !!store.data,
    initialPageParam: null as string | null, queryFn: ({ pageParam, signal }) => repo.getStoreListings(slug, { ...query, cursor: pageParam }, signal), getNextPageParam: page => page.nextCursor ?? undefined });
  if (store.isPending) return <LoadingRows />;
  if (store.error) return <StatusPanel title="Toko belum dapat dimuat" error><button className="button" onClick={() => void store.refetch()}>Coba lagi</button></StatusPanel>;
  if (!store.data) return <StatusPanel title="Toko tidak tersedia"><Link to="/stores">Kembali ke toko sekitar</Link></StatusPanel>;
  const data = store.data;
  return <div className="store-page"><BackLink to={returnPath(location.state, '/stores')}>Kembali ke hasil</BackLink><section className="store-profile"><div className="store-avatar large"><Icon name="shop" /></div><div><p className="metadata">Toko UMKM sekitar</p><h1>{data.name}</h1><p>{data.description}</p><p>{data.rating ? `${data.rating.toLocaleString('id-ID')} dari 5 (${data.reviewCount} ulasan)` : 'Belum ada ulasan'} · <Link to={`/reviews?storeId=${data.id}`}>lihat ulasan toko</Link></p></div></section>
    <section className="store-information"><div><h2>Lokasi usaha</h2><p>{data.area.name}</p>{data.publicAddressConsent && data.publicAddress && <p>{data.publicAddress}</p>}</div><div><h2>Jam operasional</h2><p>{data.hours}</p></div><div><h2>Penyerahan</h2>{data.handoverMethods.map(m => <p key={m}>{handoverLabels[m]}</p>)}</div></section>
    <div className="catalogue-heading"><h2>Katalog toko</h2><form onSubmit={e => { e.preventDefault(); setParams(serializeDiscoveryQuery({ ...query, query: new FormData(e.currentTarget).get('q')?.toString().trim().slice(0, 120) ?? '' })); }}><label className="sr-only" htmlFor="catalogue-query">Cari di katalog toko</label><input id="catalogue-query" name="q" type="search" defaultValue={query.query} placeholder="Cari di toko ini" /><button className="button secondary">Cari</button></form></div>
    {catalogue.isPending && <LoadingRows />}{catalogue.error && <StatusPanel title="Katalog belum dapat dimuat" error><button className="button" onClick={() => void catalogue.refetch()}>Coba lagi</button></StatusPanel>}
    {catalogue.data?.pages.flatMap(p => p.items).map((item, index) => <ListingRow key={item.id} listing={item} eager={index < 3} />)}
    {catalogue.data?.pages[0].items.length === 0 && <StatusPanel title="Belum ada produk yang cocok"><p>Coba kata pencarian lain.</p></StatusPanel>}
    {catalogue.hasNextPage && <button className="button secondary load-more" disabled={catalogue.isFetchingNextPage} onClick={() => void catalogue.fetchNextPage()}>Tampilkan lagi</button>}
  </div>;
}
