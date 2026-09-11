import { expect, it } from 'vitest';
import { readPublicConfig } from './env';

it('does not silently select preview when Supabase is missing', () => {
  expect(() => readPublicConfig({ MODE: 'production' })).toThrow(/Supabase/);
});
it('uses preview only in explicit preview mode', () => {
  expect(readPublicConfig({ MODE: 'preview' })).toEqual({ mode: 'preview' });
});
it('accepts only public keys on a valid http endpoint', () => {
  expect(readPublicConfig({ MODE: 'production', VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' })).toEqual({ mode: 'supabase', url: 'https://example.supabase.co', key: 'sb_publishable_example' });
});
it.each(['sb_secret_never-print-this', 'not-a-key'])('rejects unsuitable credential without echoing it', key => {
  expect(() => readPublicConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: key })).toThrow(/publik/);
  try { readPublicConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: key }); } catch (e) { expect(String(e)).not.toContain(key); }
});
it.each(['javascript:alert(1)', 'https://user:password@example.com', 'http://example.com'])('rejects unsafe Supabase URL %s', url => {
  expect(() => readPublicConfig({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' })).toThrow(/URL/);
});
