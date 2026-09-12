import { describe, expect, it } from 'vitest';
import { orderStatusLabel, reportStatusLabel, tradeStatusLabel, transactionStatusLabel } from './status-labels';

describe('status labels', () => {
  it('translates internal order and barter lifecycles into user-facing Indonesian copy', () => {
    expect(orderStatusLabel('awaiting_dp')).toBe('Menunggu DP');
    expect(tradeStatusLabel('negotiating')).toBe('Sedang dinegosiasikan');
    expect(transactionStatusLabel('order', 'completed')).toBe('Selesai');
  });

  it('translates report status and hides unknown internal values', () => {
    expect(reportStatusLabel('under_review')).toBe('Sedang ditinjau');
    expect(reportStatusLabel('future_internal_state')).toBe('Status terbaru');
  });
});
