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
import { NewTradePage } from '../features/trades/NewTradePage';
import { TradeRoomPage } from '../features/trades/TradeRoomPage';
import { TradeEditPage } from '../features/trades/TradeEditPage';
import { OrderQuotePage } from '../features/orders/OrderQuotePage';
import { OrderRoomPage } from '../features/orders/OrderRoomPage';
import { PlusPage } from '../features/stores/PlusPage';
import { MyStoresPage } from '../features/stores/MyStoresPage';
import { ReportPage } from '../features/reports/ReportPage';
import { NotificationsPage } from '../features/notifications/NotificationsPage';
import { ReviewPage } from '../features/reviews/ReviewPage';
import { ReviewListPage } from '../features/reviews/ReviewListPage';
import { AdminReportsPage } from '../features/admin/AdminReportsPage';
import { AdminReportDetailPage } from '../features/admin/AdminReportDetailPage';
import { AdminSettingsLimitsPage } from '../features/admin/AdminSettingsLimitsPage';
import { AdminAnalyticsPage } from '../features/admin/AdminAnalyticsPage';
import { TransactionsPage } from '../features/transactions/TransactionsPage';

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
    <Route path="/barter/new/:listingId" element={<RequireCompletedProfile><NewTradePage /></RequireCompletedProfile>} />
    <Route path="/transactions/:id/edit" element={<RequireCompletedProfile><TradeEditPage /></RequireCompletedProfile>} />
    <Route path="/transactions/:id" element={<RequireCompletedProfile><TradeRoomPage /></RequireCompletedProfile>} />
    <Route path="/orders/new/:conversationId" element={<RequireCompletedProfile><OrderQuotePage /></RequireCompletedProfile>} />
    <Route path="/orders/:id" element={<RequireCompletedProfile><OrderRoomPage /></RequireCompletedProfile>} />
    <Route path="/plus" element={<RequireCompletedProfile><PlusPage /></RequireCompletedProfile>} />
    <Route path="/my/stores" element={<RequireCompletedProfile><MyStoresPage /></RequireCompletedProfile>} />
    <Route path="/transactions" element={<RequireCompletedProfile><TransactionsPage /></RequireCompletedProfile>} />
    <Route path="/reports/new" element={<RequireCompletedProfile><ReportPage /></RequireCompletedProfile>} />
    <Route path="/notifications" element={<RequireCompletedProfile><NotificationsPage /></RequireCompletedProfile>} />
    <Route path="/reviews/new" element={<RequireCompletedProfile><ReviewPage /></RequireCompletedProfile>} />
    <Route path="/reviews" element={<ReviewListPage />} />
    <Route path="/admin/reports" element={<AdminReportsPage />} />
    <Route path="/admin/reports/:id" element={<AdminReportDetailPage />} />
    <Route path="/admin/settings/limits" element={<AdminSettingsLimitsPage />} />
    <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
    <Route path="/admin/*" element={<UnavailablePage />} />
    <Route path="*" element={<UnavailablePage title="Halaman tidak ditemukan" />} />
  </Routes>;
}
