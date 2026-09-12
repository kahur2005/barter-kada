import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { transactionSummarySchema, type TransactionSummary } from './types';

export type TransactionKind = 'all' | 'barter' | 'order';
export interface TransactionGateway { list(kind: TransactionKind): Promise<TransactionSummary[]>; }
export function createSupabaseTransactionGateway(client: SupabaseClient): TransactionGateway {
  return { async list(kind) { const { data, error } = await client.rpc('list_my_transactions', { p_kind: kind }); const parsed = z.array(transactionSummarySchema).safeParse(data); if (error || !parsed.success) throw new Error('Daftar transaksi belum dapat dimuat.'); return parsed.data; } };
}
