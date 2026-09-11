import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthGateway, AuthSession } from './types';

function toSession(session: { user: { id: string; email?: string } } | null): AuthSession | null {
  return session ? { userId: session.user.id, email: session.user.email ?? null } : null;
}

function authFailure(): Error {
  return new Error('Autentikasi gagal. Periksa data lalu coba lagi.');
}

export function createSupabaseAuthGateway(client: SupabaseClient): AuthGateway {
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw authFailure();
      return toSession(data.session);
    },
    subscribe(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => listener(toSession(session)));
      return () => data.subscription.unsubscribe();
    },
    async signInWithPassword(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw authFailure();
    },
    async signUpWithPassword(email, password, redirectTo) {
      const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
      if (error) throw authFailure();
      return data.session ? 'signed_in' : 'confirmation_required';
    },
    async signInWithGoogle(redirectTo) {
      const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) throw authFailure();
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw authFailure();
    },
  };
}
