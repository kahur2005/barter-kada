import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { BackLink } from '../../components/NavigationLinks';
import { Icon } from '../../components/Icon';
import { useAuth } from './AuthProvider';
import { useToast } from '../../components/Toast';

const credentials = z.object({
  email: z.string().trim().email('Masukkan alamat email yang valid.'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.'),
});

function translateAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Email atau kata sandi tidak cocok. Silakan periksa kembali ketikan Anda.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Alamat email belum dikonfirmasi. Periksa kotak masuk email Anda.';
  }
  if (msg.includes('rate limit') || msg.includes('Too many requests')) {
    return 'Terlalu banyak percobaan masuk. Tunggu beberapa saat sebelum mencoba kembali.';
  }
  return msg || 'Autentikasi gagal. Coba lagi.';
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const returnTo = new URLSearchParams(location.search).get('returnTo');

  if (!auth.available) {
    return (
      <section className="auth-card">
        <BackLink to="/">Kembali ke beranda</BackLink>
        <h1>Masuk ke Barter</h1>
        <p className="inline-notice">
          Login dinonaktifkan pada mode data contoh. Hubungkan proyek Supabase untuk memakai akun nyata.
        </p>
      </section>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const emailVal = form.get('email');
    const passVal = form.get('password');
    const parsed = credentials.safeParse({ email: emailVal, password: passVal });

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
      await auth.gateway!.signInWithPassword(parsed.data.email, parsed.data.password);
      toast.success('Berhasil masuk ke Barter.');
      navigate(returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/onboarding');
    } catch (cause) {
      setError(translateAuthError(cause));
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
    <section className="auth-card" aria-labelledby="login-title">
      <BackLink to="/">Kembali ke beranda</BackLink>
      <p className="eyebrow">Akun warga</p>
      <h1 id="login-title">Masuk ke Barter</h1>
      <p>Temukan barang dan usaha tetangga. Data lokasi persis tidak ditampilkan ke publik.</p>

      {error && <p className="form-alert" role="alert">{error}</p>}

      <form className="stack-form" onSubmit={submit} noValidate>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          onChange={() => setFieldErrors(prev => ({ ...prev, email: undefined }))}
        />
        {fieldErrors.email && (
          <span id="email-error" className="input-error-msg">
            <Icon name="warning" size={16} /> {fieldErrors.email}
          </span>
        )}

        <label htmlFor="login-password">Kata sandi</label>
        <div className="password-input-wrap">
          <input
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            minLength={8}
            required
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
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
          <span id="password-error" className="input-error-msg">
            <Icon name="warning" size={16} /> {fieldErrors.password}
          </span>
        )}

        <button className="button full-button" disabled={pending}>
          {pending ? 'Memproses…' : 'Masuk'}
        </button>
      </form>

      <div className="auth-divider"><span>atau</span></div>
      <button className="button secondary full-button" type="button" onClick={google} disabled={pending}>
        Lanjutkan dengan Google
      </button>
      <p>Belum punya akun? <Link to="/auth/register">Daftar sekarang</Link></p>
    </section>
  );
}
