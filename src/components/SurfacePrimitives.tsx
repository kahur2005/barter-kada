import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function PageHeading({ kicker, title, description, leading, actions }: { kicker?: ReactNode; title: ReactNode; description?: ReactNode; leading?: ReactNode; actions?: ReactNode }) {
  return <header className="page-heading">
    {leading}
    {kicker && <p className="page-kicker">{kicker}</p>}
    <div className="page-heading-row"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions}</div>
  </header>;
}

export function FactList({ label, children }: { label: string; children: ReactNode }) {
  return <dl className="fact-list" role="group" aria-label={label}>{children}</dl>;
}

export function FactRow({ icon, label, value }: { icon?: IconName; label: string; value: ReactNode }) {
  return <div className="fact-row">{icon && <span className="fact-icon" aria-hidden="true"><Icon name={icon} /></span>}<dt>{label}</dt><dd>{value}</dd></div>;
}

export function StageRail({ label, stages, current }: { label: string; stages: ReadonlyArray<{ id: string; label: string }>; current: string }) {
  const currentIndex = Math.max(0, stages.findIndex(stage => stage.id === current));
  return <ol className="stage-rail" aria-label={label}>{stages.map((stage, index) => <li key={stage.id} aria-current={stage.id === current ? 'step' : undefined} data-state={index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'pending'}><span>{index + 1}</span><b>{stage.label}</b></li>)}</ol>;
}

export function ActionDock({ label, primary, secondary, note }: { label: string; primary: ReactNode; secondary?: ReactNode; note?: ReactNode }) {
  return <aside className="action-dock" role="group" aria-label={label}>{note && <p>{note}</p>}<div>{secondary}{primary}</div></aside>;
}
