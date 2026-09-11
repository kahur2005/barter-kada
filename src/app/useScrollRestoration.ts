import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** Ephemeral per-app browsing positions; never stores private data on disk. */
export function useScrollRestoration() {
  const { pathname, search } = useLocation();
  const positions = useRef(new Map<string, number>());
  const key = pathname + search;
  useLayoutEffect(() => {
    const previousMode = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    return () => { history.scrollRestoration = previousMode; };
  }, []);
  useLayoutEffect(() => {
    const keepPosition = ['/', '/search', '/stores'].includes(pathname) || pathname.startsWith('/stores/');
    const target = keepPosition ? positions.current.get(key) ?? 0 : 0;
    window.scrollTo({ top: target, behavior: 'instant' });
    const remember = () => {
      if (!keepPosition) return;
      const cache = positions.current;
      cache.set(key, window.scrollY);
      if (cache.size > 50) cache.delete(cache.keys().next().value!);
    };
    window.addEventListener('scroll', remember, { passive: true });
    // Capture before route mutation; a shorter detail page can clamp scrollY
    // before an effect cleanup, so cleanup must not overwrite the old position.
    document.addEventListener('click', remember, true);
    return () => {
      window.removeEventListener('scroll', remember);
      document.removeEventListener('click', remember, true);
    };
  }, [key, pathname]);
}
