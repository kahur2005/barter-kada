import { createContext, useContext, type ReactNode } from 'react';
import type { TransactionGateway } from './gateway';
const Context = createContext<TransactionGateway | null | undefined>(undefined);
export function TransactionProvider({ gateway, children }: { gateway: TransactionGateway | null; children: ReactNode }) { return <Context.Provider value={gateway}>{children}</Context.Provider>; }
export function useTransactionGateway() { const value = useContext(Context); if (value === undefined) throw new Error('TransactionProvider belum tersedia.'); return value; }
