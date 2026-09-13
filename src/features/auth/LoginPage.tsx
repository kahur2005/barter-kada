import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { BackLink } from '../../components/NavigationLinks';
import { useAuth } from './AuthProvider';

const credentials = z.object({
  email: z.email('Masukkan alamat email yang valid.'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.'),
});

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const returnTo = new URLSearchParams(location.search).get('returnTo');

  if (!auth.available) return <section className="auth-card"><BackLink to="/">Kembali ke beranda</BackLink><h1>Masuk ke Barter</h1><p className="inline-notice">Login dinonaktifkan pada mode data contoh. Hubungkan proyek Supabase untuk memakai akun nyata.</p></section>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const parsed = credentials.safeParse({ email: form.get('email'), password: form.get('password') });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Periksa kembali data masuk.');
      return;
    }
    setPending(true);
    try {
      await auth.gateway!.signInWithPassword(parsed.data.email, parsed.data.password);
      navigate(returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/onboarding');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Autentikasi gagal. Coba lagi.');
    } finally {
      setPending(false);
    }
  }

  async function google() {
    setError(null);
    setPending(true);
    try {
      await auth.gateway!.signInWithGoogle(`${window.location.origin}/auth/callback`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Autentikasi Google gagal.');
      setPending(false);
    }
  }

  return <section className="auth-card" aria-labelledby="login-title">
    <BackLink to="/">Kembali ke beranda</BackLink>
    <p className="eyebrow">Akun warga</p><h1 id="login-title">Masuk ke Barter</h1>
    <p>Temukan barang dan usaha tetangga. Data lokasi persis tidak ditampilkan ke publik.</p>
    {error && <p className="form-alert" role="alert">{error}</p>}
    <form className="stack-form" onSubmit={submit} noValidate>
      <label htmlFor="login-email">Email</label><input id="login-email" name="email" type="email" autoComplete="email" inputMode="email" required />
      <label htmlFor="login-password">Kata sandi</label><input id="login-password" name="password" type="password" autoComplete="current-password" minLength={8} required />
      <button className="button" disabled={pending}>{pending ? 'Memproses…' : 'Masuk'}</button>
    </form>
    <div className="auth-divider"><span>atau</span></div>
    <button className="button secondary full-button" type="button" onClick={google} disabled={pending}>Lanjutkan dengan Google</button>
    <p>Belum punya akun? <Link to="/auth/register">Daftar</Link></p>
  </section>;
}
