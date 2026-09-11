import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      // Close first: elements outside an open modal are inert, including
      // during StrictMode's effect cleanup/setup cycle.
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={onClose} className="dialog">
    <div className="dialog-heading"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="Tutup" onClick={onClose}><Icon name="close" /></button></div>
    {children}
  </dialog>;
}
