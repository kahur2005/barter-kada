import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function AccountPage() {
  const auth = useAuth(); const navigate = useNavigate();
  const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null);
  if (!auth.available) return <section className="account-page"><h1>Akun</h1><p>Mode data contoh tidak membuat sesi atau profil palsu.</p><Link className="button" to="/auth/login">Lihat cara masuk</Link></section>;
  if (auth.status === 'loading') return <section className="status-panel" role="status"><h1>Memuat akun…</h1></section>;
  if (auth.status === 'guest') return <Navigate to="/auth/login?returnTo=%2Fprofile" replace />;
  async function signOut() {
    setPending(true); setError(null);
    try { await auth.gateway!.signOut(); navigate('/auth/login', { replace: true }); }
    catch { setError('Akun belum dapat dikeluarkan. Coba lagi.'); setPending(false); }
  }
  return <section className="account-page"><p className="eyebrow">Akun warga</p><h1>Akun</h1><dl><dt>Email</dt><dd>{auth.session?.email ?? 'Tidak tersedia'}</dd><dt>Status profil</dt><dd><Link to="/onboarding">Lihat kelengkapan akun</Link></dd></dl><div className="account-links"><Link className="button secondary" to="/transactions">Transaksi saya</Link><Link className="button secondary" to="/notifications">Notifikasi</Link></div>{error && <p className="form-alert" role="alert">{error}</p>}<button className="button secondary" onClick={signOut} disabled={pending}>{pending ? 'Mengeluarkan…' : 'Keluar dari akun'}</button></section>;
}
