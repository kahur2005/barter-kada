import { listingStages, type ListingStage } from './listing-presenters';

type ListingProgressRailProps = {
  current: ListingStage;
  furthestReached: ListingStage;
  onSelect: (stage: ListingStage) => void;
};

export function ListingProgressRail({ current, furthestReached, onSelect }: ListingProgressRailProps) {
  return (
    <nav className="listing-progress" aria-label="Progres memasang penawaran">
      <ol aria-label="Tahap memasang penawaran">
        {listingStages.map((label, index) => {
          const stage = index as ListingStage;
          const reached = stage <= furthestReached;
          const state = stage === current ? 'current' : reached ? 'reached' : 'locked';
          return (
            <li key={label} data-state={state}>
              <button
                type="button"
                disabled={!reached}
                aria-current={stage === current ? 'step' : undefined}
                aria-label={`Tahap ${index + 1}: ${label}`}
                onClick={() => onSelect(stage)}
              >
                <span aria-hidden="true">{index + 1}</span>
                <b>{label}</b>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
