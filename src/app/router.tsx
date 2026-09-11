import { Route, Routes } from 'react-router-dom';
import { DiscoveryPage } from '../features/discovery/DiscoveryPage';
import { ListingDetailPage } from '../features/discovery/ListingDetailPage';
import { StoreDetailPage } from '../features/discovery/StoreDetailPage';
import { UnavailablePage } from '../features/shared/UnavailablePage';

export function AppRoutes() {
  return <Routes>
    {['/', '/search', '/stores'].map(path => <Route key={path} path={path} element={<DiscoveryPage />} />)}
    <Route path="/listings/new" element={<UnavailablePage title="Pasang penawaran belum tersedia" />} />
    <Route path="/listings/:id" element={<ListingDetailPage />} /><Route path="/stores/:slug" element={<StoreDetailPage />} />
    <Route path="/unavailable" element={<UnavailablePage />} />
    {['/chat/*', '/profile', '/onboarding', '/auth/*', '/plus', '/my/*', '/transactions/*', '/notifications', '/admin/*'].map(path => <Route key={path} path={path} element={<UnavailablePage />} />)}
    <Route path="*" element={<UnavailablePage title="Halaman tidak ditemukan" />} />
  </Routes>;
}
