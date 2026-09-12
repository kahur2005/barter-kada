import { createContext, useContext, type ReactNode } from 'react';
import type { AdminGateway } from './gateway';
const Context = createContext<AdminGateway | null | undefined>(undefined);
export function AdminProvider({ gateway, children }: { gateway: AdminGateway | null; children: ReactNode }) { return <Context.Provider value={gateway}>{children}</Context.Provider>; }
export function useAdminGateway() { const value = useContext(Context); if (value === undefined) throw new Error('AdminProvider belum tersedia.'); return value; }
