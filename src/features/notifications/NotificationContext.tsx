import { createContext, useContext, type ReactNode } from 'react';
import type { NotificationGateway } from './gateway';

const Context = createContext<NotificationGateway | null | undefined>(undefined);
export function NotificationProvider({ gateway, children }: { gateway: NotificationGateway | null; children: ReactNode }) { return <Context.Provider value={gateway}>{children}</Context.Provider>; }
export function useNotificationGateway() { const value = useContext(Context); if (value === undefined) throw new Error('NotificationProvider belum tersedia.'); return value; }
