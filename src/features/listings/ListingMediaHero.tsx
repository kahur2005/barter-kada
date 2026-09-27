import { listingStages, type ListingStage } from './listing-presenters';
import type { ListingDraft } from './types';

type ListingMediaHeroProps = {
  draft: ListingDraft;
  stage: ListingStage;
  assetPreviews: Record<string, string>;
};

const emptyStageCopy: Record<ListingStage, string> = {
  0: 'Tentukan bentuk penawaran untuk barangmu',
  1: 'Tambahkan foto aktual sebagai wajah penawaran',
  2: 'Foto utama akan tetap terlihat saat kamu mengatur penyerahan',
  3: 'Foto utama akan tampil di sini sebelum diterbitkan',
};

export function ListingMediaHero({ draft, stage, assetPreviews }: ListingMediaHeroProps) {
  const primaryAssetId = draft.assetIds[0];
  const primarySrc = primaryAssetId ? assetPreviews[primaryAssetId] : undefined;
  const fallbackCopy = primaryAssetId ? 'Foto utama sudah tersimpan' : emptyStageCopy[stage];

  return (
    <figure className="listing-media-hero" data-has-photo={Boolean(primarySrc)}>
      {primarySrc ? (
        <img
          src={primarySrc}
          alt={draft.title ? `Foto utama ${draft.title}` : 'Foto utama penawaran'}
        />
      ) : (
        <div className="listing-media-fallback">
          <span>{fallbackCopy}</span>
          {primaryAssetId && <small>Pratinjau tetap aman di penyimpanan listing.</small>}
        </div>
      )}
      <figcaption>
        <span>{listingStages[stage]}</span>
        <strong>{draft.title || 'Satu barang. Satu penawaran yang jelas.'}</strong>
      </figcaption>
    </figure>
  );
}
