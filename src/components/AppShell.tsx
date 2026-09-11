import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { useRepository } from '../app/providers';
import { useScrollRestoration } from '../app/useScrollRestoration';

const navigation = [
  { path: '/', text: 'Beranda', icon: 'home' }, { path: '/search', text: 'Cari', icon: 'search' },
  { path: '/listings/new', text: 'Pasang', icon: 'plus' }, { path: '/chat', text: 'Pesan', icon: 'chat' }, { path: '/profile', text: 'Akun', icon: 'user' },
] as const;
function Navigation({ className }: { className: string }) {
  return <nav aria-label="Navigasi utama" className={className}>{navigation.map(item => <NavLink key={item.path} to={item.path} end={item.path === '/'}><Icon name={item.icon} /><span>{item.text}</span></NavLink>)}</nav>;
}
export function AppShell({ children }: { children: ReactNode }) {
  useScrollRestoration();
  const { pathname } = useLocation();
  const { source } = useRepository();
  const isDiscovery = ['/', '/search', '/stores'].includes(pathname);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return <>
    <a className="skip-link" href="#main">Lewati ke isi</a>
    <header className="site-header"><div className="header-inner">
      <Link className="wordmark" to="/" aria-label="Barter beranda">barter<span aria-hidden="true">.</span></Link>
      <span className="header-description">Dari sekitar, untuk sekitar.</span>
      <Navigation className="desktop-nav" />
      <Link to="/notifications" className="icon-button notification-link" aria-label="Notifikasi"><Icon name="bell" /></Link>
    </div></header>
    {source === 'preview' && <div className="preview-notice">Data contoh — belum terhubung ke transaksi nyata</div>}
    {!online && <div role="status" className="offline-notice">Kamu sedang offline. Data yang ditampilkan mungkin belum terbaru.</div>}
    <main id="main" className={`page-shell ${isDiscovery ? 'with-navigation' : 'with-actions'}`}>{children}</main>
    {isDiscovery && <Navigation className="bottom-nav" />}
  </>;
}
