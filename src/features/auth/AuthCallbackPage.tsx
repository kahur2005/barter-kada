import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function AuthCallbackPage() {
  const auth = useAuth();
  if (auth.status === 'loading') return <section className="status-panel" role="status"><h1>Menyelesaikan proses masuk…</h1><p>Tunggu sebentar.</p></section>;
  if (auth.status === 'authenticated') return <Navigate to="/onboarding" replace />;
  return <section className="status-panel"><h1>Tautan masuk tidak dapat diselesaikan</h1><p role="alert">Sesi tidak ditemukan. Coba masuk kembali.</p><a className="button" href="/auth/login">Kembali ke halaman masuk</a></section>;
}
