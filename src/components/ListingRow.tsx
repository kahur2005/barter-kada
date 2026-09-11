import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { PublicListing } from '../features/discovery/types';
import { formatRupiah } from '../lib/money';

export function listingPrice(listing: PublicListing) {
  if (listing.modes.includes('free')) return 'Gratis';
  if (!listing.modes.includes('sale') || listing.priceMin === null) return 'Barter';
  return `${listing.priceMin !== listing.priceMax ? 'Mulai ' : ''}${formatRupiah(listing.priceMin)}${listing.fulfillment !== 'ready_stock' ? `/${listing.unit}` : ''}`;
}
export function dateWib(value: string) { return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) + ' WIB'; }
export function ProductImage({ image, className = '', eager = false }: { image?: PublicListing['images'][number]; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return image && !failed ? <img className={`product-image ${className}`} src={image.url} alt={image.alt} loading={eager ? 'eager' : 'lazy'} width="80" height="80" onError={() => setFailed(true)} /> : <div className={`image-fallback ${className}`}>Foto tidak tersedia</div>;
}
export function ListingRow({ listing, eager = false }: { listing: PublicListing; eager?: boolean }) {
  const location = useLocation();
  return <article className="listing-row">
    <ProductImage image={listing.images[0]} eager={eager} />
    <div className="listing-content">
      {listing.promoted && <span className="label">Dipromosikan</span>}
      <h3><Link to={`/listings/${listing.id}`} state={{ from: location.pathname + location.search }}>{listing.title}</Link></h3>
      <p className="listing-price">{listingPrice(listing)}{listing.modes.length === 2 && <span className="secondary-inline"> atau barter</span>}</p>
      <p className="metadata">{listing.fulfillment === 'preorder' ? 'Pre-order' : listing.fulfillment === 'catering' ? 'Catering' : listing.negotiable ? 'Bisa ditawar' : listing.modes.includes('sale') ? 'Harga tetap' : 'Tawaran tetangga'}</p>
      {listing.preorder && <p className="metadata">Tutup {dateWib(listing.preorder.closesAt)}<br />Tersedia {dateWib(listing.preorder.availableAt)} · Min. {listing.preorder.minimumQty} {listing.unit}</p>}
      <p className="metadata">{listing.area.name} · sekitar {listing.area.distanceKm} km</p>
      <p className="publisher-line">{listing.publisher.storeSlug ? 'Toko' : 'Pribadi'} · {listing.publisher.name}</p>
    </div>
  </article>;
}
