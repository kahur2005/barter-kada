import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from './AuthProvider';

const registration = z.object({
  email: z.email('Masukkan alamat email yang valid.'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.'),
});

export function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!auth.available) return <section className="auth-card"><h1>Buat akun Barter</h1><p className="inline-notice">Pendaftaran dinonaktifkan pada mode data contoh. Hubungkan proyek Supabase untuk membuat akun nyata.</p><Link className="button secondary" to="/">Kembali ke beranda</Link></section>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setMessage(null);
    const form = new FormData(event.currentTarget);
    const parsed = registration.safeParse({ email: form.get('email'), password: form.get('password') });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Periksa kembali data pendaftaran.'); return; }
    setPending(true);
    try {
      const result = await auth.gateway!.signUpWithPassword(parsed.data.email, parsed.data.password, `${window.location.origin}/auth/callback`);
      if (result === 'confirmation_required') setMessage('Periksa emailmu untuk mengonfirmasi akun, lalu kembali masuk.');
      else navigate('/onboarding');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pendaftaran gagal. Coba lagi.');
    } finally { setPending(false); }
  }

  async function google() {
    setError(null); setPending(true);
    try { await auth.gateway!.signInWithGoogle(`${window.location.origin}/auth/callback`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Autentikasi Google gagal.'); setPending(false); }
  }

  return <section className="auth-card" aria-labelledby="register-title">
    <p className="eyebrow">Mulai dari sekitar</p><h1 id="register-title">Buat akun Barter</h1>
    <p>Setelah mendaftar, lengkapi nama, area, dan verifikasi WhatsApp. Pengguna Google tidak perlu membuat kata sandi Barter.</p>
    {error && <p className="form-alert" role="alert">{error}</p>}
    {message && <p className="success-notice" role="status">{message}</p>}
    <form className="stack-form" onSubmit={submit} noValidate>
      <label htmlFor="register-email">Email</label><input id="register-email" name="email" type="email" autoComplete="email" inputMode="email" required />
      <label htmlFor="register-password">Kata sandi</label><input id="register-password" name="password" type="password" autoComplete="new-password" minLength={8} aria-describedby="password-help" required />
      <p id="password-help" className="form-help">Minimal 8 karakter.</p>
      <button className="button" disabled={pending}>{pending ? 'Mendaftarkan…' : 'Daftar'}</button>
    </form>
    <div className="auth-divider"><span>atau</span></div>
    <button className="button secondary full-button" type="button" onClick={google} disabled={pending}>Daftar dengan Google</button>
    <p>Sudah punya akun? <Link to="/auth/login">Masuk</Link></p>
  </section>;
}
