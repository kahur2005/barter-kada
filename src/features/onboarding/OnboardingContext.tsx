import { createContext, useContext, type ReactNode } from 'react';
import type { OnboardingGateway } from './types';

const Context = createContext<OnboardingGateway | null | undefined>(undefined);
export function OnboardingProvider({ gateway, children }: { gateway: OnboardingGateway | null; children: ReactNode }) {
  return <Context.Provider value={gateway}>{children}</Context.Provider>;
}
export function useOnboardingGateway() {
  const value = useContext(Context);
  if (value === undefined) throw new Error('OnboardingProvider belum tersedia.');
  return value;
}
