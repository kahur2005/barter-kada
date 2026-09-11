import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useOnboardingGateway } from '../onboarding/OnboardingContext';
import type { OnboardingState } from '../onboarding/types';
import { useAuth } from './AuthProvider';

export function RequireCompletedProfile({ children }: { children: ReactNode }) {
  const auth = useAuth(); const onboarding = useOnboardingGateway(); const location = useLocation();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (auth.status !== 'authenticated' || !onboarding) return;
    let active = true; setState(null); setFailed(false);
    onboarding.getState().then(next => { if (active) setState(next); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [auth.status, auth.session?.userId, onboarding]);
  if (!auth.available) return <>{children}</>;
  if (auth.status === 'loading') return <section className="status-panel" role="status"><h1>Memeriksa akses…</h1></section>;
  if (auth.status === 'guest') return <Navigate to={`/auth/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  if (!onboarding || failed) return <section className="status-panel"><h1>Akses belum dapat diperiksa</h1><p role="alert">Muat ulang halaman untuk mencoba lagi.</p></section>;
  if (!state) return <section className="status-panel" role="status"><h1>Memeriksa kelengkapan akun…</h1></section>;
  if (state.nextStep !== 'complete') return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
