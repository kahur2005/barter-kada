import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRepository } from '../../app/providers';
import { dateWib, listingPrice, ProductImage } from '../../components/ListingRow';
import { LoadingRows, StatusPanel } from '../../components/StatusPanel';
import { Icon } from '../../components/Icon';
import { ActionLink, BackLink } from '../../components/NavigationLinks';
import { Dialog } from '../../components/Dialog';
import { formatRupiah } from '../../lib/money';
import { useToast } from '../../components/Toast';
import { ActionDock, FactList, FactRow } from '../../components/SurfacePrimitives';

export const handoverLabels = {
  pickup: 'Diambil pembeli',
  meetup: 'Bertemu di lokasi yang disepakati',
  delivery: 'Diantar dengan kesepakatan langsung',
};

const conditionLabels: Record<string, string> = {
  new: 'Baru (Segel / Belum Dipakai)',
  like_new: 'Seperti Baru (Mulus Normal)',
  good: 'Baik (Fungsi Normal, Bekas Pakai Wajar)',
  fair: 'Cukup (Ada Minus / Lecet Ringan)',
  needs_repair: 'Perlu Perbaikan / Servis',
};

export function returnPath(state: unknown, fallback = '/') {
  if (state && typeof state === 'object' && 'from' in state && typeof state.from === 'string' && state.from.startsWith('/') && !state.from.startsWith('//')) return state.from;
  return fallback;
}

export function ListingDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const repo = useRepository();
  const toast = useToast();
  const [photo, setPhoto] = useState(0);
  const [gallery, setGallery] = useState(false);

  const { data: listing, isPending, error, refetch } = useQuery({
    queryKey: [repo.source, 'listing', id],
    queryFn: ({ signal }) => repo.getListing(id, signal),
  });

  const back = returnPath(location.state);

  function copyShareLink() {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(window.location.href);
      toast.success('Tautan listing berhasil disalin ke papan klip.');
    }
  }

  if (isPending) return <LoadingRows />;
  if (error) return <StatusPanel title="Tidak dapat memuat barang" error><button className="button" onClick={() => void refetch()}>Coba lagi</button></StatusPanel>;
  if (!listing) return <StatusPanel title="Penawaran tidak tersedia"><p>Penawaran mungkin sudah diarsipkan atau tidak dapat diakses.</p><Link to={back}>Kembali ke hasil</Link></StatusPanel>;

  const available = listing.availability === 'available';
  const free = listing.modes.includes('free');
  const sale = listing.modes.includes('sale');
  const barter = listing.modes.includes('barter');
  const chatLabel = free ? 'Hubungi pemberi' : listing.fulfillment !== 'ready_stock' ? 'Tanya pesanan' : 'Chat penjual';
  const pending = (feature: string) => feature === 'report' ? `/reports/new?targetType=listing&targetId=${listing.id}` : `/unavailable?feature=${feature}&listing=${listing.id}`;

  return (
    <div className="detail-page">
      <div className="detail-toolbar">
        <BackLink to={back}>Kembali ke hasil</BackLink>
        <button type="button" className="text-button inline-link" onClick={copyShareLink} aria-label="Salin tautan penawaran">
          <Icon name="link" size={16} /> Salin tautan
        </button>
      </div>

      <div className="detail-layout">
        <div className="detail-media">
          <ProductImage image={listing.images[photo]} eager className="detail-image" />

          {/* Thumbnail Strip for fast selection */}
          {listing.images.length > 1 && (
            <div className="detail-thumbnails" aria-label="Pilih foto produk">
              {listing.images.map((img, idx) => (
                <button
                  key={img.url}
                  type="button"
                  className={`detail-thumb-btn ${idx === photo ? 'selected' : ''}`}
                  onClick={() => setPhoto(idx)}
                  aria-label={`Lihat foto ${idx + 1}`}
                >
                  <img src={img.url} alt="" />
                </button>
              ))}
            </div>
          )}

          {listing.images.length > 0 && (
            <button className="gallery-open" aria-label={`Lihat foto ${photo + 1}/${listing.images.length}`} onClick={() => setGallery(true)}>
              Perbesar foto ({photo + 1}/{listing.images.length})
            </button>
          )}
        </div>

        <div className="detail-body">
          <header className="detail-summary">
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span className="badge badge-info">{listing.publisher.storeSlug ? 'Penawaran toko' : 'Dari tetangga'}</span>
              {free && <span className="badge badge-success">Gratis</span>}
              {barter && <span className="badge badge-warning">Bisa Barter</span>}
              {listing.negotiable && <span className="badge badge-info">Bisa Nego</span>}
            </div>
            <p className="metadata">{listing.area.name} · sekitar {listing.area.distanceKm} km</p>
            <h1>{listing.title}</h1>
            <p className="detail-price">{listingPrice(listing)}</p>
            {sale && <p className="metadata">{listing.negotiable ? 'Harga bisa ditawar' : 'Harga tetap'}</p>}
            {!available && (
              <p className="inline-notice">
                {listing.availability === 'reserved' ? 'Sedang dipesan. Kesepakatan baru belum tersedia.' : 'Penawaran sudah tidak tersedia.'}
              </p>
            )}
          </header>

          <section className="detail-facts" role="group" aria-label="Detail penawaran">
            <FactList label="Detail penawaran">
              <FactRow icon="tag" label="Kondisi" value={(listing.condition && conditionLabels[listing.condition]) || 'Tidak dijelaskan'} />
              <FactRow icon="pin" label="Lokasi tepat" value="Tetap privat" />
              <FactRow icon="package" label="Penyerahan" value={listing.handoverMethods.map(method => handoverLabels[method]).join(', ')} />
            </FactList>
          </section>

          <section className="detail-section">
            <h2>Tentang penawaran</h2>
            <p className="preserve-lines">{listing.description}</p>
            <p><strong>Kekurangan:</strong> {listing.defects || 'Tidak ada kekurangan khusus yang dilaporkan.'}</p>
          </section>

          {barter && (
            <section className="detail-section">
              <h2>Bisa ditukar dengan</h2>
              <p>{listing.barterPreferences || 'Terbuka untuk tawaran barang lain yang setara.'}</p>
            </section>
          )}

          {listing.preorder && (
            <section className="detail-section">
              <h2>Ketentuan pre-order</h2>
              <dl>
                <dt>Minimum</dt>
                <dd>{listing.preorder.minimumQty} {listing.unit}</dd>
                <dt>PO ditutup</dt>
                <dd>{dateWib(listing.preorder.closesAt)}</dd>
                <dt>Tersedia</dt>
                <dd>{dateWib(listing.preorder.availableAt)}</dd>
                <dt>Kuota tersisa</dt>
                <dd>{listing.preorder.remainingQty ?? 'Konfirmasi penjual'}</dd>
                <dt>DP</dt>
                <dd>{listing.preorder.dpPercent ? `${listing.preorder.dpPercent}% dari total termasuk ongkir` : 'Tidak diwajibkan'}</dd>
              </dl>
              <p className="metadata">Jumlah dan jadwal disepakati lewat chat. Bayar langsung ke penjual.</p>
            </section>
          )}

          {listing.catering && (
            <section className="detail-section">
              <h2>Pesanan catering</h2>
              <p>Minimum {listing.catering.minimumQty} {listing.unit}; persiapan {listing.catering.leadTimeHours} jam.</p>
              <p>Area layanan: {listing.catering.serviceAreas.join(', ')}.</p>
              <p>{listing.catering.notes}</p>
              <p>Ketersediaan dikonfirmasi penjual.</p>
            </section>
          )}

          {listing.variants.length > 0 && (
            <section className="detail-section">
              <h2>Pilihan varian</h2>
              <ul className="variant-list">
                {listing.variants.map(v => (
                  <li key={v.id}>
                    <span>{v.name}</span>
                    <strong>{formatRupiah(v.price)}/{v.unit}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="detail-section">
            <h2>Privasi lokasi</h2>
            <p className="metadata">Area yang ditampilkan bersifat perkiraan dan tidak menunjukkan alamat rumah spesifik. Alamat pertemuan dibahas lewat chat.</p>
          </section>

          <section className="identity-panel">
            <h2>
              {listing.publisher.storeSlug ? (
                <Link to={`/stores/${listing.publisher.storeSlug}`} state={{ from: location.pathname }}>
                  {listing.publisher.name}
                </Link>
              ) : (
                listing.publisher.name
              )}
            </h2>
            <p className="metadata">{listing.publisher.storeSlug ? 'Toko UMKM' : 'Profil pribadi warga'}</p>
            <p>
              {listing.publisher.rating ? (
                <Link to={`/reviews?subjectId=${listing.publisher.id}`}>
                  <span className="star-icon"><Icon name="star" size={15} /></span> {listing.publisher.rating.toLocaleString('id-ID')} dari 5 ({listing.publisher.reviewCount} ulasan)
                </Link>
              ) : (
                'Belum ada ulasan'
              )}
            </p>
          </section>

          <section className="detail-section">
            <h2>Menyiapkan penyerahan</h2>
            <p className="metadata">
              Pilih salah satu metode di atas saat berbicara dengan penjual. Alamat pertemuan disepakati melalui percakapan chat.{free && ' Barang gratis; ongkir jika ada disepakati terpisah.'}
            </p>
          </section>

          {/* Safety Notice Callout */}
          <div className="safety-card" role="note">
            <span className="safety-card-icon" aria-hidden="true"><Icon name="shield" size={20} /></span>
            <div>
              <strong>Tips Transaksi Aman</strong>
              <span>Sepakati tempat pertemuan di area publik yang aman dan terang. Periksa kondisi fisik barang sebelum deal.</span>
            </div>
          </div>

          <ActionLink className="report-link" to={pending('report')} state={{ from: location.pathname }}>
            Laporkan penawaran ini
          </ActionLink>
        </div>
      </div>

      <ActionDock
        label="Aksi penawaran"
        note="Periksa kondisi barang sebelum menerima."
        secondary={barter && available ? <Link className="button secondary" to={`/barter/new/${listing.id}`} state={{ from: location.pathname }}>Ajukan barter</Link> : undefined}
        primary={available && (sale || free) ? <Link className="button" to={`/chat/open/${listing.id}`} state={{ from: location.pathname }}>{chatLabel}</Link> : <button className="button" disabled>Tidak tersedia</button>}
      />

      {gallery && (
        <Dialog title={`Foto ${photo + 1} dari ${listing.images.length}`} onClose={() => setGallery(false)}>
          <ProductImage image={listing.images[photo]} className="gallery-image" eager />
          <div className="form-actions">
            <button className="button secondary" disabled={photo === 0} onClick={() => setPhoto(photo - 1)}>
              Sebelumnya
            </button>
            <button className="button secondary" disabled={photo === listing.images.length - 1} onClick={() => setPhoto(photo + 1)}>
              Berikutnya
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
