import {
  conditionLabel,
  formatRupiah,
  fulfillmentLabel,
  handoverLabel,
  modeLabel,
  type ListingStage,
} from './listing-presenters';
import type { ListingDraft } from './types';

type ListingReviewProps = {
  draft: ListingDraft;
  onEdit: (stage: ListingStage) => void;
};

export function ListingReview({ draft, onEdit }: ListingReviewProps) {
  const price = draft.modes.includes('free') ? 'Gratis' : formatRupiah(draft.basePriceRupiah);

  return (
    <section className="listing-review" aria-label="Pratinjau publik penawaran">
      <div className="listing-review-heading">
        <div className="listing-review-tags" aria-label="Jenis penawaran">
          <span>{draft.publisher.kind === 'personal' ? 'Profil pribadi' : 'Toko'}</span>
          <span>{modeLabel(draft.modes)}</span>
        </div>
        <h2>{draft.title || 'Nama belum diisi'}</h2>
        <p className="listing-review-price">{price}</p>
        <p className="listing-review-description">{draft.description || 'Detail belum diisi.'}</p>
        <button className="review-edit" type="button" onClick={() => onEdit(1)}>
          Edit detail penawaran
        </button>
      </div>

      <dl className="listing-review-facts">
        <div>
          <dt>Kondisi</dt>
          <dd>{conditionLabel(draft.condition)}</dd>
        </div>
        <div>
          <dt>Transaksi</dt>
          <dd>{modeLabel(draft.modes)} · {fulfillmentLabel(draft.fulfillment)}</dd>
        </div>
        <div>
          <dt>Penyerahan</dt>
          <dd>{handoverLabel(draft.handoverMethods)}</dd>
        </div>
        <div>
          <dt>Lokasi</dt>
          <dd>Lokasi tepat tetap privat</dd>
        </div>
      </dl>

      <div className="listing-review-edits" aria-label="Edit bagian penawaran">
        <button className="review-edit" type="button" onClick={() => onEdit(0)}>Edit penawaran</button>
        <button className="review-edit" type="button" onClick={() => onEdit(2)}>Edit ketersediaan</button>
      </div>
      <p className="listing-review-privacy">
        Warga hanya melihat area perkiraan dari profil atau toko. Alamat lengkap tidak pernah ditampilkan di penawaran.
      </p>
    </section>
  );
}
