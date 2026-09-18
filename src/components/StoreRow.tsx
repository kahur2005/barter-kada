import { Link, useLocation } from 'react-router-dom';
import type { PublicStore } from '../features/discovery/types';
import { Icon } from './Icon';

export function StoreRow({ store }: { store: PublicStore }) {
  const location = useLocation();
  return (
    <article className="listing-row store-row-card store-row">
      <div className="store-card-header">
        <div className="store-avatar">
          <Icon name="shop" />
        </div>
        <span className="badge badge-purple">Toko UMKM</span>
      </div>
      <div className="listing-content">
        <h3>
          <Link to={`/stores/${store.slug}`} state={{ from: location.pathname + location.search }}>
            {store.name}
          </Link>
        </h3>
        <p className="store-desc">{store.description}</p>
        <p className="metadata">{store.area.name} · sekitar {store.area.distanceKm} km</p>
        <p className="metadata">
          {store.rating ? `${store.rating.toLocaleString('id-ID')} dari 5 (${store.reviewCount} ulasan)` : 'Belum ada ulasan'}
        </p>
      </div>
    </article>
  );
}
