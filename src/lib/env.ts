export type PublicConfig = { mode: 'preview' } | { mode: 'supabase'; url: string; key: string };

export function readPublicConfig(env: Record<string, string | undefined>): PublicConfig {
  if (env.MODE === 'preview') return { mode: 'preview' };
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new Error('Konfigurasi Supabase belum tersedia. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY.');
  let endpoint: URL;
  try { endpoint = new URL(url); } catch { throw new Error('URL Supabase tidak valid.'); }
  const localHttp = endpoint.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname);
  if ((!localHttp && endpoint.protocol !== 'https:') || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error('URL Supabase harus HTTPS, atau HTTP localhost untuk pengembangan.');
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw new Error('Gunakan kunci publik Supabase (publishable key), bukan credential server.');
  return { mode: 'supabase', url, key };
}
