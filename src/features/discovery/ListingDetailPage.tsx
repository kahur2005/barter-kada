import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRepository } from '../../app/providers';
import { dateWib, listingPrice, ProductImage } from '../../components/ListingRow';
import { LoadingRows, StatusPanel } from '../../components/StatusPanel';
import { Icon } from '../../components/Icon';
import { Dialog } from '../../components/Dialog';
import { formatRupiah } from '../../lib/money';

export const handoverLabels = { pickup: 'Diambil pembeli', meetup: 'Bertemu di lokasi yang disepakati', delivery: 'Diantar dengan kesepakatan langsung' };
export function returnPath(state: unknown, fallback = '/') {
  if (state && typeof state === 'object' && 'from' in state && typeof state.from === 'string' && state.from.startsWith('/') && !state.from.startsWith('//')) return state.from;
  return fallback;
}
export function ListingDetailPage() {
  const { id = '' } = useParams(); const location = useLocation(); const repo = useRepository();
  const [photo, setPhoto] = useState(0); const [gallery, setGallery] = useState(false);
  const { data: listing, isPending, error, refetch } = useQuery({ queryKey: [repo.source, 'listing', id], queryFn: ({ signal }) => repo.getListing(id, signal) });
  const back = returnPath(location.state);
  if (isPending) return <LoadingRows />;
  if (error) return <StatusPanel title="Tidak dapat memuat barang" error><button className="button" onClick={() => void refetch()}>Coba lagi</button></StatusPanel>;
  if (!listing) return <StatusPanel title="Penawaran tidak tersedia"><p>Penawaran mungkin sudah diarsipkan atau tidak dapat diakses.</p><Link to={back}>Kembali ke hasil</Link></StatusPanel>;
  const available = listing.availability === 'available';
  const free = listing.modes.includes('free'); const sale = listing.modes.includes('sale'); const barter = listing.modes.includes('barter');
  const chatLabel = free ? 'Hubungi pemberi' : listing.fulfillment !== 'ready_stock' ? 'Tanya pesanan' : 'Chat penjual';
  const pending = (feature: string) => `/unavailable?feature=${feature}&listing=${listing.id}`;
  return <div className="detail-page">
    <Link className="back-link" to={back}><Icon name="back" />Kembali ke hasil</Link>
    <div className="detail-layout">
      <div className="detail-media"><ProductImage image={listing.images[photo]} eager className="detail-image" />{listing.images.length > 0 && <button className="gallery-open" onClick={() => setGallery(true)}>Lihat foto {photo + 1}/{listing.images.length}</button>}</div>
      <div className="detail-body">
        <header className="detail-summary"><p className="metadata">{listing.publisher.storeSlug ? 'Penawaran toko' : 'Dari tetangga'} · {listing.area.name}</p><h1>{listing.title}</h1><p className="detail-price">{listingPrice(listing)}</p>
          {sale && <p className="metadata">{listing.negotiable ? 'Bisa ditawar' : 'Harga tetap'}</p>}
          {!available && <p className="inline-notice">{listing.availability === 'reserved' ? 'Sedang dipesan. Kesepakatan baru belum tersedia.' : 'Penawaran sudah tidak tersedia.'}</p>}
        </header>
        <section className="detail-section"><h2>Tentang penawaran</h2><p className="preserve-lines">{listing.description}</p><dl><dt>Kondisi</dt><dd>{listing.condition}</dd><dt>Kekurangan</dt><dd>{listing.defects || 'Belum dijelaskan penjual.'}</dd></dl></section>
        {barter && <section className="detail-section"><h2>Bisa ditukar dengan</h2><p>{listing.barterPreferences || 'Terbuka untuk tawaran barang lain.'}</p></section>}
        {listing.preorder && <section className="detail-section"><h2>Ketentuan pre-order</h2><dl><dt>Minimum</dt><dd>{listing.preorder.minimumQty} {listing.unit}</dd><dt>PO ditutup</dt><dd>{dateWib(listing.preorder.closesAt)}</dd><dt>Tersedia</dt><dd>{dateWib(listing.preorder.availableAt)}</dd><dt>Kuota tersisa</dt><dd>{listing.preorder.remainingQty ?? 'Konfirmasi penjual'}</dd><dt>DP</dt><dd>{listing.preorder.dpPercent ? `${listing.preorder.dpPercent}% dari total termasuk ongkir` : 'Tidak diwajibkan'}</dd></dl><p className="metadata">Jumlah dan jadwal disepakati lewat chat. Bayar langsung ke penjual.</p></section>}
        {listing.catering && <section className="detail-section"><h2>Pesanan catering</h2><p>Minimum {listing.catering.minimumQty} {listing.unit}; persiapan {listing.catering.leadTimeHours} jam.</p><p>Area layanan: {listing.catering.serviceAreas.join(', ')}.</p><p>{listing.catering.notes}</p><p>Ketersediaan dikonfirmasi penjual.</p></section>}
        {listing.variants.length > 0 && <section className="detail-section"><h2>Pilihan varian</h2><ul className="variant-list">{listing.variants.map(v => <li key={v.id}><span>{v.name}</span><strong>{formatRupiah(v.price)}/{v.unit}</strong></li>)}</ul></section>}
        <section className="detail-section"><h2>Area penawaran</h2><p>{listing.area.name} · sekitar {listing.area.distanceKm} km</p><p className="metadata">Lokasi disamarkan dan tidak menunjukkan alamat rumah.</p></section>
        <section className="identity-panel"><h2>{listing.publisher.storeSlug ? <Link to={`/stores/${listing.publisher.storeSlug}`} state={{ from: location.pathname }}>{listing.publisher.name}</Link> : listing.publisher.name}</h2><p className="metadata">{listing.publisher.storeSlug ? 'Toko UMKM' : 'Profil pribadi'}</p><p>{listing.publisher.rating ? `${listing.publisher.rating.toLocaleString('id-ID')} dari 5 (${listing.publisher.reviewCount} ulasan)` : 'Belum ada ulasan'}</p>{listing.publisher.phoneVerified && <p className="metadata">Nomor terverifikasi — bukan jaminan identitas atau keamanan transaksi.</p>}</section>
        <section className="detail-section"><h2>Penyerahan</h2><ul>{listing.handoverMethods.map(method => <li key={method}>{handoverLabels[method]}</li>)}</ul><p className="metadata">Alamat pertemuan dibagikan melalui chat setelah disepakati.{free && ' Barang gratis; ongkir jika ada disepakati terpisah.'}</p></section>
        <Link className="report-link" to={pending('report')} state={{ from: location.pathname }}>Laporkan listing</Link>
      </div>
    </div>
    <div className="context-actions"><div><p className="metadata">Periksa kondisi barang sebelum menerima.</p><div className="action-buttons">{available ? <>{(sale || free) && <Link className="button" to={`/chat/open/${listing.id}`} state={{ from: location.pathname }}>{chatLabel}</Link>}{barter && <Link className={`button ${sale ? 'secondary' : ''}`} to={`/barter/new/${listing.id}`} state={{ from: location.pathname }}>Ajukan barter</Link>}</> : <button className="button" disabled>Tidak tersedia</button>}</div></div></div>
    {gallery && <Dialog title={`Foto ${photo + 1} dari ${listing.images.length}`} onClose={() => setGallery(false)}><ProductImage image={listing.images[photo]} className="gallery-image" eager /><div className="form-actions"><button className="button secondary" disabled={photo === 0} onClick={() => setPhoto(photo - 1)}>Sebelumnya</button><button className="button secondary" disabled={photo === listing.images.length - 1} onClick={() => setPhoto(photo + 1)}>Berikutnya</button></div></Dialog>}
  </div>;
}
