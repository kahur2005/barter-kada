import { createContext, useContext, type ReactNode } from 'react';
import type { StoreGateway } from './gateway';
const Context = createContext<StoreGateway | null | undefined>(undefined);
export function StoreProvider({ gateway, children }: { gateway: StoreGateway | null; children: ReactNode }) { return <Context.Provider value={gateway}>{children}</Context.Provider>; }
export function useStoreGateway() { const value = useContext(Context); if (value === undefined) throw new Error('StoreProvider belum tersedia.'); return value; }
