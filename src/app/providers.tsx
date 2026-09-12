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

const RepositoryContext = createContext<DiscoveryRepository | null>(null);
export function useRepository() {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error('Repository belum tersedia.');
  return repository;
}
export function Providers({ repository, authGateway, onboardingGateway, listingGateway, chatGateway, tradeGateway, orderGateway = null, storeGateway = null, children }: { repository: DiscoveryRepository; authGateway: AuthGateway | null; onboardingGateway: OnboardingGateway | null; listingGateway: ListingGateway | null; chatGateway: ChatGateway | null; tradeGateway: TradeGateway | null; orderGateway?: OrderGateway | null; storeGateway?: StoreGateway | null; children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: true }, mutations: { retry: false } } }));
  return <RepositoryContext.Provider value={repository}><QueryClientProvider client={client}><AuthProvider gateway={authGateway}><OnboardingProvider gateway={onboardingGateway}><ListingProvider gateway={listingGateway}><ChatProvider gateway={chatGateway}><TradeProvider gateway={tradeGateway}><OrderProvider gateway={orderGateway}><StoreProvider gateway={storeGateway}>{children}</StoreProvider></OrderProvider></TradeProvider></ChatProvider></ListingProvider></OnboardingProvider></AuthProvider></QueryClientProvider></RepositoryContext.Provider>;
}
