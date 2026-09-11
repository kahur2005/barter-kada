import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';
import type { AuthGateway, AuthSession } from './types';

function Probe() { const auth = useAuth(); return <p>{auth.status}:{auth.session?.userId ?? 'none'}</p>; }

it('does not let an older session read overwrite a newer auth event', async () => {
  let resolveSession!: (session: AuthSession | null) => void;
  let publish!: (session: AuthSession | null) => void;
  const gateway: AuthGateway = {
    getSession: vi.fn(() => new Promise<AuthSession | null>(resolve => { resolveSession = resolve; })),
    subscribe: vi.fn(listener => { publish = listener; return () => undefined; }),
    signInWithPassword: vi.fn(), signUpWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn(),
  };
  render(<AuthProvider gateway={gateway}><Probe /></AuthProvider>);
  act(() => publish({ userId: 'new-session', email: 'rina@example.test' }));
  expect(screen.getByText('authenticated:new-session')).toBeVisible();
  await act(async () => resolveSession(null));
  expect(screen.getByText('authenticated:new-session')).toBeVisible();
});
