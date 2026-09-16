import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { PublicListing } from '../features/discovery/types';
import { formatRupiah } from '../lib/money';

export function listingPrice(listing: PublicListing) {
  if (listing.modes.includes('free')) return 'Gratis';
  if (!listing.modes.includes('sale') || listing.priceMin === null) return 'Barter';
  return `${listing.priceMin !== listing.priceMax ? 'Mulai ' : ''}${formatRupiah(listing.priceMin)}${listing.fulfillment !== 'ready_stock' ? `/${listing.unit}` : ''}`;
}

export function dateWib(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value)) + ' WIB';
}

export function ProductImage({ image, className = '', eager = false }: { image?: PublicListing['images'][number]; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return image && !failed ? (
    <img
      className={`product-image ${className}`}
      src={image.url}
      alt={image.alt || 'Foto produk'}
      loading={eager ? 'eager' : 'lazy'}
      width="80"
      height="80"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`image-fallback ${className}`}>Foto tidak tersedia</div>
  );
}

export function ListingRow({ listing, eager = false }: { listing: PublicListing; eager?: boolean }) {
  const location = useLocation();
  const isFree = listing.modes.includes('free');
  const isBarter = listing.modes.includes('barter');
  const isSale = listing.modes.includes('sale');

  return (
    <article className="listing-row">
      <div className="listing-image-wrap">
        <ProductImage image={listing.images[0]} eager={eager} />
        <div className="listing-card-badges">
          {listing.promoted && <span className="badge badge-purple">Dipromosikan</span>}
          {isFree && <span className="badge badge-success">Gratis</span>}
          {isBarter && <span className="badge badge-warning">Bisa Barter</span>}
          {listing.fulfillment === 'preorder' && <span className="badge badge-info">Pre-order</span>}
          {listing.fulfillment === 'catering' && <span className="badge badge-info">Catering</span>}
        </div>
      </div>
      <div className="listing-content">
        <h3>
          <Link to={`/listings/${listing.id}`} state={{ from: location.pathname + location.search }}>
            {listing.title}
          </Link>
        </h3>

        <p className="listing-price">
          {listingPrice(listing)}
          {isSale && isBarter && <span className="secondary-inline"> atau barter</span>}
        </p>

        <p className="metadata">
          {listing.area.name} · sekitar {listing.area.distanceKm} km
          {listing.negotiable && ' · Bisa nego'}
        </p>

        {listing.preorder && (
          <p className="metadata">
            PO Tutup {dateWib(listing.preorder.closesAt)} · Min. {listing.preorder.minimumQty} {listing.unit}
          </p>
        )}

        <p className="publisher-line">
          {listing.publisher.storeSlug ? 'Toko UMKM' : 'Profil pribadi'} · {listing.publisher.name}
        </p>
      </div>
    </article>
  );
}
