import type { DiscoveryRepository } from '../features/discovery/repository';
import { Providers } from './providers';
import { AppShell } from '../components/AppShell';
import { AppRoutes } from './router';
import type { AuthGateway } from '../features/auth/types';
import type { OnboardingGateway } from '../features/onboarding/types';
import type { ListingGateway } from '../features/listings/gateway';
import type { ChatGateway } from '../features/chat/gateway';

export function App({ repository, authGateway = null, onboardingGateway = null, listingGateway = null, chatGateway = null }: { repository: DiscoveryRepository; authGateway?: AuthGateway | null; onboardingGateway?: OnboardingGateway | null; listingGateway?: ListingGateway | null; chatGateway?: ChatGateway | null }) {
  return <Providers repository={repository} authGateway={authGateway} onboardingGateway={onboardingGateway} listingGateway={listingGateway} chatGateway={chatGateway}><AppShell><AppRoutes /></AppShell></Providers>;
}
