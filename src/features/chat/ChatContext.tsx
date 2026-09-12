import { createContext, useContext, type ReactNode } from 'react';
import type { ChatGateway } from './gateway';

const Context = createContext<ChatGateway | null | undefined>(undefined);
export function ChatProvider({ gateway, children }: { gateway: ChatGateway | null; children: ReactNode }) { return <Context.Provider value={gateway}>{children}</Context.Provider>; }
export function useChatGateway() { const value = useContext(Context); if (value === undefined) throw new Error('ChatProvider belum tersedia.'); return value; }
