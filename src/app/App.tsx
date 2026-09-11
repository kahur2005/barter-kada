import type { DiscoveryRepository } from '../features/discovery/repository';
import { Providers } from './providers';
import { AppShell } from '../components/AppShell';
import { AppRoutes } from './router';
import type { AuthGateway } from '../features/auth/types';
import type { OnboardingGateway } from '../features/onboarding/types';

export function App({ repository, authGateway = null, onboardingGateway = null }: { repository: DiscoveryRepository; authGateway?: AuthGateway | null; onboardingGateway?: OnboardingGateway | null }) {
  return <Providers repository={repository} authGateway={authGateway} onboardingGateway={onboardingGateway}><AppShell><AppRoutes /></AppShell></Providers>;
}
