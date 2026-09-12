import type { DiscoveryRepository } from '../features/discovery/repository';
import { Providers } from './providers';
import { AppShell } from '../components/AppShell';
import { AppRoutes } from './router';
import type { AuthGateway } from '../features/auth/types';
import type { OnboardingGateway } from '../features/onboarding/types';
import type { ListingGateway } from '../features/listings/gateway';
import type { ChatGateway } from '../features/chat/gateway';
import type { TradeGateway } from '../features/trades/gateway';
import type { OrderGateway } from '../features/orders/gateway';
import type { StoreGateway } from '../features/stores/gateway';
import type { ReportGateway } from '../features/reports/gateway';
import type { NotificationGateway } from '../features/notifications/gateway';
import type { ReviewGateway } from '../features/reviews/gateway';
import type { AdminGateway } from '../features/admin/gateway';
import type { TransactionGateway } from '../features/transactions/gateway';

export function App({ repository, authGateway = null, onboardingGateway = null, listingGateway = null, chatGateway = null, tradeGateway = null, orderGateway = null, storeGateway = null, reportGateway = null, notificationGateway = null, reviewGateway = null, adminGateway = null, transactionGateway = null }: { repository: DiscoveryRepository; authGateway?: AuthGateway | null; onboardingGateway?: OnboardingGateway | null; listingGateway?: ListingGateway | null; chatGateway?: ChatGateway | null; tradeGateway?: TradeGateway | null; orderGateway?: OrderGateway | null; storeGateway?: StoreGateway | null; reportGateway?: ReportGateway | null; notificationGateway?: NotificationGateway | null; reviewGateway?: ReviewGateway | null; adminGateway?: AdminGateway | null; transactionGateway?: TransactionGateway | null }) {
  return <Providers repository={repository} authGateway={authGateway} onboardingGateway={onboardingGateway} listingGateway={listingGateway} chatGateway={chatGateway} tradeGateway={tradeGateway} orderGateway={orderGateway} storeGateway={storeGateway} reportGateway={reportGateway} notificationGateway={notificationGateway} reviewGateway={reviewGateway} adminGateway={adminGateway} transactionGateway={transactionGateway}><AppShell><AppRoutes /></AppShell></Providers>;
}
