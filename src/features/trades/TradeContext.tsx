import { createContext, useContext, type ReactNode } from 'react';
import type { TradeGateway } from './gateway';

const Context = createContext<TradeGateway | null | undefined>(undefined);
export function TradeProvider({ gateway, children }: { gateway: TradeGateway | null; children: ReactNode }) { return <Context.Provider value={gateway}>{children}</Context.Provider>; }
export function useTradeGateway() { const gateway = useContext(Context); if (gateway === undefined) throw new Error('TradeProvider belum tersedia.'); return gateway; }
