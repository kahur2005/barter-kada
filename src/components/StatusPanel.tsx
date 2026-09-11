import type { ReactNode } from 'react';

export function StatusPanel({ title, children, error = false }: { title: string; children?: ReactNode; error?: boolean }) {
  return <section className={`status-panel ${error ? 'error-panel' : ''}`} role={error ? 'alert' : undefined}><h2>{title}</h2>{children}</section>;
}
export function LoadingRows() { return <div role="status" aria-label="Memuat penawaran" className="skeleton-list">{[1, 2, 3].map(id => <div className="skeleton-row" key={id}><span /><div><i /><i /></div></div>)}</div>; }
