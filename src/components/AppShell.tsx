import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from './Icon';
import { useRepository } from '../app/providers';
import { useScrollRestoration } from '../app/useScrollRestoration';
import { useAuth } from '../features/auth/AuthProvider';
import { useNotificationGateway } from '../features/notifications/NotificationContext';
import { CustomerSupportChat } from './CustomerSupportChat';

const navigation = [
  { path: '/', text: 'Beranda', icon: 'home' },
  { path: '/search', text: 'Cari', icon: 'search' },
  { path: '/listings/new', text: 'Pasang', icon: 'plus' },
  { path: '/chat', text: 'Pesan', icon: 'chat' },
  { path: '/profile', text: 'Akun', icon: 'user' },
] as const;

function Navigation({ className }: { className: string }) {
  const auth = useAuth();
  const avatarUrl = auth.available && auth.status === 'authenticated' ? auth.session?.avatarUrl : null;
  return (
    <nav aria-label="Navigasi utama" className={className}>
      {navigation.map(item => (
        <NavLink key={item.path} to={item.path} end={item.path === '/'}>
          {item.icon === 'user' && avatarUrl ? (
            <img src={avatarUrl} alt="" className="nav-avatar-img" />
          ) : (
            <Icon name={item.icon} />
          )}
          <span>{item.text}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  useScrollRestoration();
  const { pathname } = useLocation();
  const { source } = useRepository();
  const notifGateway = useNotificationGateway();

  // Show bottom navigation across all standard browsing and hub screens
  const showBottomNav = ['/', '/search', '/stores', '/chat', '/profile', '/my/listings', '/transactions', '/notifications'].includes(pathname);
  const isImmersive = ['/listings/new'].some(p => pathname.startsWith(p)) || pathname.includes('/edit') || (pathname.startsWith('/chat/') && pathname !== '/chat');
  const focusedJourney =
    pathname === '/auth/login' ||
    pathname === '/listings/new' ||
    /^\/my\/listings\/[^/]+\/edit$/.test(pathname);

  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const notifQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      if (!notifGateway) return 0;
      const res = await notifGateway.list({ cursor: null });
      return res.items.filter(i => !i.readAt).length;
    },
    enabled: Boolean(notifGateway),
    staleTime: 30000,
  });
  const unreadCount = notifQuery.data ?? 0;

  return (
    <>
      <a className="skip-link" href="#main">Lewati ke isi</a>
      <header className={`site-header${focusedJourney ? ' focused-header' : ''}`}>
        <div className="header-inner">
          <Link className="wordmark" to="/" aria-label="Barter beranda">
            barter<span aria-hidden="true">.</span>
          </Link>
          {!focusedJourney && (
            <>
              <span className="header-description">Dari sekitar, untuk sekitar.</span>
              <Navigation className="desktop-nav" />
              <Link
                to="/notifications"
                className="icon-button notification-link"
                aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ''}`}
              >
                <Icon name="bell" />
                {unreadCount > 0 && (
                  <span className="notification-badge-dot" aria-hidden="true">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </>
          )}
        </div>
      </header>
      {source === 'preview' && (
        <div className="preview-notice">Data contoh — belum terhubung ke transaksi nyata</div>
      )}
      {!online && (
        <div role="status" className="offline-notice">
          Kamu sedang offline. Data yang ditampilkan mungkin belum terbaru.
        </div>
      )}
      <main
        id="main"
        className={`page-shell ${focusedJourney ? 'focused-journey' : showBottomNav ? 'with-navigation' : isImmersive ? 'with-actions' : ''}`}
      >
        {children}
      </main>
      {!focusedJourney && showBottomNav && <Navigation className="bottom-nav" />}
      {!focusedJourney && <CustomerSupportChat />}
    </>
  );
}
