import { createContext, useContext, type ReactNode } from 'react';
import type { ReportGateway } from './gateway';
const Context = createContext<ReportGateway | null | undefined>(undefined);
export function ReportProvider({ gateway, children }: { gateway: ReportGateway | null; children: ReactNode }) { return <Context.Provider value={gateway}>{children}</Context.Provider>; }
export function useReportGateway() { const value = useContext(Context); if (value === undefined) throw new Error('ReportProvider belum tersedia.'); return value; }
