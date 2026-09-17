import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthGateway, AuthSession } from './types';

function toSession(session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null): AuthSession | null {
  if (!session) return null;
  const meta = session.user.user_metadata;
  const avatarUrl = (typeof meta?.avatar_url === 'string' ? meta.avatar_url : null) ?? (typeof meta?.picture === 'string' ? meta.picture : null);
  return {
    userId: session.user.id,
    email: session.user.email ?? null,
    avatarUrl,
  };
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
    async uploadAvatar(file: File): Promise<string> {
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sesi masuk dibutuhkan untuk mengunggah foto.');

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Gagal membaca berkas foto.'));
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/profile-avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: dataUrl }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { details?: string })?.details ?? 'Gagal mengunggah foto profil.');
      }

      const result = (await response.json()) as { avatarUrl: string };
      await client.auth.refreshSession();
      return result.avatarUrl;
    },
    async deleteAvatar(): Promise<void> {
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sesi masuk dibutuhkan.');

      const response = await fetch('/api/profile-avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Gagal menghapus foto profil.');
      }

      await client.auth.refreshSession();
    },
  };
}
