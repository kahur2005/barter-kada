import { createContext, useContext, type ReactNode } from 'react';
import type { ReviewGateway } from './gateway';

const Context = createContext<ReviewGateway | null | undefined>(undefined);
export function ReviewProvider({ gateway, children }: { gateway: ReviewGateway | null; children: ReactNode }) { return <Context.Provider value={gateway}>{children}</Context.Provider>; }
export function useReviewGateway() { const value = useContext(Context); if (value === undefined) throw new Error('ReviewProvider belum tersedia.'); return value; }
