import { createContext, useContext, type ReactNode } from 'react';
import type { ListingGateway } from './gateway';

const Context = createContext<ListingGateway | null | undefined>(undefined);
export function ListingProvider({ gateway, children }: { gateway: ListingGateway | null; children: ReactNode }) { return <Context.Provider value={gateway}>{children}</Context.Provider>; }
export function useListingGateway() { const gateway = useContext(Context); if (gateway === undefined) throw new Error('ListingProvider belum tersedia.'); return gateway; }
