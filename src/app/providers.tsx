import { createContext, useContext, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DiscoveryRepository } from '../features/discovery/repository';
import { AuthProvider } from '../features/auth/AuthProvider';
import type { AuthGateway } from '../features/auth/types';
import { OnboardingProvider } from '../features/onboarding/OnboardingContext';
import type { OnboardingGateway } from '../features/onboarding/types';
import { ListingProvider } from '../features/listings/ListingContext';
import type { ListingGateway } from '../features/listings/gateway';
import { ChatProvider } from '../features/chat/ChatContext';
import type { ChatGateway } from '../features/chat/gateway';
import { TradeProvider } from '../features/trades/TradeContext';
import type { TradeGateway } from '../features/trades/gateway';
import { OrderProvider } from '../features/orders/OrderContext';
import type { OrderGateway } from '../features/orders/gateway';
import { StoreProvider } from '../features/stores/StoreContext';
import type { StoreGateway } from '../features/stores/gateway';
import { ReportProvider } from '../features/reports/ReportContext';
import type { ReportGateway } from '../features/reports/gateway';
import { NotificationProvider } from '../features/notifications/NotificationContext';
import type { NotificationGateway } from '../features/notifications/gateway';
import { ReviewProvider } from '../features/reviews/ReviewContext';
import type { ReviewGateway } from '../features/reviews/gateway';
import { AdminProvider } from '../features/admin/AdminContext';
import type { AdminGateway } from '../features/admin/gateway';
import { TransactionProvider } from '../features/transactions/TransactionContext';
import type { TransactionGateway } from '../features/transactions/gateway';

const RepositoryContext = createContext<DiscoveryRepository | null>(null);
export function useRepository() {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error('Repository belum tersedia.');
  return repository;
}
export function Providers({ repository, authGateway, onboardingGateway, listingGateway, chatGateway, tradeGateway, orderGateway = null, storeGateway = null, reportGateway = null, notificationGateway = null, reviewGateway = null, adminGateway = null, transactionGateway = null, children }: { repository: DiscoveryRepository; authGateway: AuthGateway | null; onboardingGateway: OnboardingGateway | null; listingGateway: ListingGateway | null; chatGateway: ChatGateway | null; tradeGateway: TradeGateway | null; orderGateway?: OrderGateway | null; storeGateway?: StoreGateway | null; reportGateway?: ReportGateway | null; notificationGateway?: NotificationGateway | null; reviewGateway?: ReviewGateway | null; adminGateway?: AdminGateway | null; transactionGateway?: TransactionGateway | null; children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: true }, mutations: { retry: false } } }));
  return <RepositoryContext.Provider value={repository}><QueryClientProvider client={client}><AuthProvider gateway={authGateway}><OnboardingProvider gateway={onboardingGateway}><ListingProvider gateway={listingGateway}><ChatProvider gateway={chatGateway}><TradeProvider gateway={tradeGateway}><OrderProvider gateway={orderGateway}><StoreProvider gateway={storeGateway}><ReportProvider gateway={reportGateway}><NotificationProvider gateway={notificationGateway}><ReviewProvider gateway={reviewGateway}><AdminProvider gateway={adminGateway}><TransactionProvider gateway={transactionGateway}>{children}</TransactionProvider></AdminProvider></ReviewProvider></NotificationProvider></ReportProvider></StoreProvider></OrderProvider></TradeProvider></ChatProvider></ListingProvider></OnboardingProvider></AuthProvider></QueryClientProvider></RepositoryContext.Provider>;
}
