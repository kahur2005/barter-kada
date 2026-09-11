import { createContext, useContext, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DiscoveryRepository } from '../features/discovery/repository';

const RepositoryContext = createContext<DiscoveryRepository | null>(null);
export function useRepository() {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error('Repository belum tersedia.');
  return repository;
}
export function Providers({ repository, children }: { repository: DiscoveryRepository; children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: true }, mutations: { retry: false } } }));
  return <RepositoryContext.Provider value={repository}><QueryClientProvider client={client}>{children}</QueryClientProvider></RepositoryContext.Provider>;
}
