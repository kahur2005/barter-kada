import { createContext, useContext, type ReactNode } from 'react';
import type { OrderGateway } from './gateway';
const Context = createContext<OrderGateway | null | undefined>(undefined);
export function OrderProvider({ gateway, children }: { gateway: OrderGateway | null; children: ReactNode }) { return <Context.Provider value={gateway}>{children}</Context.Provider>; }
export function useOrderGateway() { const value = useContext(Context); if (value === undefined) throw new Error('OrderProvider belum tersedia.'); return value; }
