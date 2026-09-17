import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { BackLink } from '../../components/NavigationLinks';
import { Icon } from '../../components/Icon';
import { useAuth } from './AuthProvider';
import { useToast } from '../../components/Toast';

const registration = z.object({
  email: z.string().trim().email('Masukkan alamat email yang valid.'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.'),
});

function translateRegisterError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('User already registered') || msg.includes('already registered')) {
    return 'Alamat email ini sudah terdaftar. Silakan masuk atau gunakan email lain.';
  }
  if (msg.includes('Password should be at least')) {
    return 'Kata sandi terlalu pendek. Gunakan minimal 8 karakter.';
  }
  return msg || 'Pendaftaran gagal. Coba lagi.';
}

export function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!auth.available) {
    return (
      <section className="auth-card">
        <BackLink to="/">Kembali ke beranda</BackLink>
        <h1>Buat akun Barter</h1>
        <p className="inline-notice">
          Pendaftaran dinonaktifkan pada mode data contoh. Hubungkan proyek Supabase untuk membuat akun nyata.
        </p>
      </section>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const emailVal = form.get('email');
    const passVal = form.get('password');
    const parsed = registration.safeParse({ email: emailVal, password: passVal });

    if (!parsed.success) {
      const errMap: { email?: string; password?: string } = {};
      parsed.error.issues.forEach(issue => {
        const path = issue.path[0] as 'email' | 'password';
        if (!errMap[path]) errMap[path] = issue.message;
      });
      setFieldErrors(errMap);
      setError(parsed.error.issues[0]?.message ?? 'Masukkan alamat email yang valid.');
      return;
    }

    setPending(true);
    try {
      const result = await auth.gateway!.signUpWithPassword(
        parsed.data.email,
        parsed.data.password,
        `${window.location.origin}/auth/callback`
      );
      if (result === 'confirmation_required') {
        setMessage('Periksa emailmu untuk mengonfirmasi akun, lalu kembali masuk.');
        toast.info('Tautan konfirmasi telah dikirim ke email.');
      } else {
        toast.success('Pendaftaran berhasil! Silakan lengkapi profil.');
        navigate('/onboarding');
      }
    } catch (cause) {
      setError(translateRegisterError(cause));
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

  return (
    <section className="auth-card" aria-labelledby="register-title">
      <BackLink to="/">Kembali ke beranda</BackLink>
      <p className="eyebrow">Mulai dari sekitar</p>
      <h1 id="register-title">Buat akun Barter</h1>
      <p>Setelah mendaftar, lengkapi nama dan area. Pengguna Google tidak perlu membuat kata sandi Barter.</p>

      {error && <p className="form-alert" role="alert">{error}</p>}
      {message && <p className="success-notice" role="status">{message}</p>}

      <form className="stack-form" onSubmit={submit} noValidate>
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'reg-email-error' : undefined}
          onChange={() => setFieldErrors(prev => ({ ...prev, email: undefined }))}
        />
        {fieldErrors.email && (
          <span id="reg-email-error" className="input-error-msg">
            <Icon name="warning" size={16} /> {fieldErrors.email}
          </span>
        )}

        <label htmlFor="register-password">Kata sandi</label>
        <div className="password-input-wrap">
          <input
            id="register-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={8}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby="password-help"
            required
            onChange={() => setFieldErrors(prev => ({ ...prev, password: undefined }))}
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            tabIndex={0}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" x2="22" y1="2" y2="22" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {fieldErrors.password && (
          <span id="reg-pass-error" className="input-error-msg">
            <Icon name="warning" size={16} /> {fieldErrors.password}
          </span>
        )}
        <p id="password-help" className="form-help">Minimal 8 karakter.</p>

        <button className="button full-button" disabled={pending}>
          {pending ? 'Mendaftarkan…' : 'Daftar'}
        </button>
      </form>

      <div className="auth-divider"><span>atau</span></div>
      <button className="button secondary full-button" type="button" onClick={google} disabled={pending}>
        Daftar dengan Google
      </button>
      <p>Sudah punya akun? <Link to="/auth/login">Masuk</Link></p>
    </section>
  );
}
