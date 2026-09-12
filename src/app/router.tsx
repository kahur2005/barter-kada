import { Route, Routes } from 'react-router-dom';
import { DiscoveryPage } from '../features/discovery/DiscoveryPage';
import { ListingDetailPage } from '../features/discovery/ListingDetailPage';
import { StoreDetailPage } from '../features/discovery/StoreDetailPage';
import { UnavailablePage } from '../features/shared/UnavailablePage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { AuthCallbackPage } from '../features/auth/AuthCallbackPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { RequireCompletedProfile } from '../features/auth/RequireCompletedProfile';
import { AccountPage } from '../features/auth/AccountPage';
import { ListingEditorPage } from '../features/listings/ListingEditorPage';
import { MyListingsPage } from '../features/listings/MyListingsPage';
import { ChatInboxPage, ChatRoomPage, OpenConversationPage } from '../features/chat/ChatPages';

export function AppRoutes() {
  return <Routes>
    {['/', '/search', '/stores'].map(path => <Route key={path} path={path} element={<DiscoveryPage />} />)}
    <Route path="/listings/new" element={<RequireCompletedProfile><ListingEditorPage /></RequireCompletedProfile>} />
    <Route path="/my/listings/:id/edit" element={<RequireCompletedProfile><ListingEditorPage /></RequireCompletedProfile>} />
    <Route path="/listings/:id" element={<ListingDetailPage />} /><Route path="/stores/:slug" element={<StoreDetailPage />} />
    <Route path="/unavailable" element={<UnavailablePage />} />
    <Route path="/auth/login" element={<LoginPage />} />
    <Route path="/auth/register" element={<RegisterPage />} />
    <Route path="/auth/callback" element={<AuthCallbackPage />} />
    <Route path="/onboarding" element={<OnboardingPage />} />
    <Route path="/profile" element={<AccountPage />} />
    <Route path="/my/listings" element={<RequireCompletedProfile><MyListingsPage /></RequireCompletedProfile>} />
    <Route path="/chat" element={<RequireCompletedProfile><ChatInboxPage /></RequireCompletedProfile>} />
    <Route path="/chat/open/:listingId" element={<RequireCompletedProfile><OpenConversationPage /></RequireCompletedProfile>} />
    <Route path="/chat/:id" element={<RequireCompletedProfile><ChatRoomPage /></RequireCompletedProfile>} />
    {['/plus', '/my/stores', '/transactions/*', '/notifications'].map(path => <Route key={path} path={path} element={<RequireCompletedProfile><UnavailablePage /></RequireCompletedProfile>} />)}
    <Route path="/admin/*" element={<UnavailablePage />} />
    <Route path="*" element={<UnavailablePage title="Halaman tidak ditemukan" />} />
  </Routes>;
}
