import type { DiscoveryRepository } from '../features/discovery/repository';
import { Providers } from './providers';
import { AppShell } from '../components/AppShell';
import { AppRoutes } from './router';

export function App({ repository }: { repository: DiscoveryRepository }) {
  return <Providers repository={repository}><AppShell><AppRoutes /></AppShell></Providers>;
}
