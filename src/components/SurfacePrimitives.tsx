import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

const defaultActionDockHeight = 104;

export function PageHeading({ kicker, title, description, leading, actions }: { kicker?: ReactNode; title: ReactNode; description?: ReactNode; leading?: ReactNode; actions?: ReactNode }) {
  return <header className="page-heading">
    {leading}
    {kicker && <p className="page-kicker">{kicker}</p>}
    <div className="page-heading-row"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions}</div>
  </header>;
}

export function FactList({ label, children }: { label: string; children: ReactNode }) {
  return <dl className="fact-list" aria-label={label}>{children}</dl>;
}

export function FactRow({ icon, label, value }: { icon?: IconName; label: string; value: ReactNode }) {
  return <div className="fact-row">{icon && <span className="fact-icon" aria-hidden="true"><Icon name={icon} /></span>}<dt>{label}</dt><dd>{value}</dd></div>;
}

export function StageRail({ label, stages, current }: { label: string; stages: ReadonlyArray<{ id: string; label: string }>; current: string }) {
  const currentIndex = stages.findIndex(stage => stage.id === current);
  return <ol className="stage-rail" aria-label={label}>{stages.map((stage, index) => {
    const state = currentIndex >= 0 && index < currentIndex ? 'complete' : currentIndex >= 0 && index === currentIndex ? 'current' : 'pending';
    const status = state === 'complete' ? 'Selesai' : state === 'current' ? 'Tahap saat ini' : 'Belum dimulai';
    return <li key={stage.id} aria-current={state === 'current' ? 'step' : undefined} data-state={state}><span>{index + 1}</span><b>{stage.label}</b><span className="sr-only">{status}</span></li>;
  })}</ol>;
}

export function ActionDock({ label, primary, secondary, note }: { label: string; primary: ReactNode; secondary?: ReactNode; note?: ReactNode }) {
  const dockRef = useRef<HTMLElement>(null);
  const [dockHeight, setDockHeight] = useState(defaultActionDockHeight);

  useLayoutEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    const updateHeight = () => {
      const measuredHeight = Math.max(defaultActionDockHeight, Math.ceil(dock.getBoundingClientRect().height));
      setDockHeight(previous => previous === measuredHeight ? previous : measuredHeight);
      document.body.style.setProperty('--action-dock-height', `${measuredHeight}px`);
    };

    updateHeight();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(updateHeight) : null;
    observer?.observe(dock);
    return () => {
      observer?.disconnect();
      queueMicrotask(() => {
        if (!document.querySelector('[data-action-dock]')) document.body.style.removeProperty('--action-dock-height');
      });
    };
  }, []);

  return <div className="action-dock-anchor" style={{ '--action-dock-height': `${dockHeight}px` } as CSSProperties}>
    <div className="action-dock-reservation" data-action-dock-reservation aria-hidden="true" />
    <aside ref={dockRef} className="action-dock" data-action-dock role="group" aria-label={label}>{note && <p>{note}</p>}<div>{secondary}{primary}</div></aside>
  </div>;
}
