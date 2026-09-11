import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthGateway, AuthSession } from './types';

type AuthContextValue = {
  available: boolean;
  status: 'loading' | 'guest' | 'authenticated';
  session: AuthSession | null;
  gateway: AuthGateway | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ gateway, children }: { gateway: AuthGateway | null; children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(gateway !== null);

  useEffect(() => {
    if (!gateway) {
      setSession(null);
      setLoading(false);
      return;
    }

    let active = true;
    let authEventRevision = 0;
    const sessionReadRevision = authEventRevision;
    const unsubscribe = gateway.subscribe(next => {
      if (!active) return;
      authEventRevision += 1;
      setSession(next);
      setLoading(false);
    });
    gateway.getSession()
      .then(next => { if (active && authEventRevision === sessionReadRevision) setSession(next); })
      .catch(() => { if (active && authEventRevision === sessionReadRevision) setSession(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, [gateway]);

  const value = useMemo<AuthContextValue>(() => ({
    available: gateway !== null,
    status: loading ? 'loading' : session ? 'authenticated' : 'guest',
    session,
    gateway,
  }), [gateway, loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider belum tersedia.');
  return value;
}
