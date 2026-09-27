import { describe, expect, it } from 'vitest';
import {
  conditionLabel,
  formatRupiah,
  fulfillmentLabel,
  handoverLabel,
  modeLabel,
  stageForListingField,
} from './listing-presenters';

describe('listing presenters', () => {
  it('maps validation fields to their owning stage', () => {
    expect(stageForListingField('modes')).toBe(0);
    expect(stageForListingField('title')).toBe(1);
    expect(stageForListingField('variants.0.priceRupiah')).toBe(1);
    expect(stageForListingField('preorder.orderClosesAt')).toBe(2);
    expect(stageForListingField('form')).toBe(3);
  });

  it('formats listing facts in Indonesian', () => {
    expect(formatRupiah('120000').replace(/\s/g, ' ')).toBe('Rp 120.000');
    expect(formatRupiah(null)).toBe('Harga belum diisi');
    expect(conditionLabel('good')).toBe('Baik');
    expect(fulfillmentLabel('ready_stock')).toBe('Ready stock');
    expect(handoverLabel(['meetup', 'delivery'])).toBe('Meet up · Diantar');
    expect(modeLabel(['sale', 'barter'])).toBe('Jual · Barter');
  });
});
