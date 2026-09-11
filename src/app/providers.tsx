import { createContext, useContext, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DiscoveryRepository } from '../features/discovery/repository';
import { AuthProvider } from '../features/auth/AuthProvider';
import type { AuthGateway } from '../features/auth/types';
import { OnboardingProvider } from '../features/onboarding/OnboardingContext';
import type { OnboardingGateway } from '../features/onboarding/types';

const RepositoryContext = createContext<DiscoveryRepository | null>(null);
export function useRepository() {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error('Repository belum tersedia.');
  return repository;
}
export function Providers({ repository, authGateway, onboardingGateway, children }: { repository: DiscoveryRepository; authGateway: AuthGateway | null; onboardingGateway: OnboardingGateway | null; children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: true }, mutations: { retry: false } } }));
  return <RepositoryContext.Provider value={repository}><QueryClientProvider client={client}><AuthProvider gateway={authGateway}><OnboardingProvider gateway={onboardingGateway}>{children}</OnboardingProvider></AuthProvider></QueryClientProvider></RepositoryContext.Provider>;
}
