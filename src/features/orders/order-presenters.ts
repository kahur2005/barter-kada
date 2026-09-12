import type { OrderPayment, OrderRoom } from './types';

export const handoverMethodLabels: Record<OrderRoom['terms']['handoverMethod'], string> = {
  pickup: 'Diambil pembeli',
  meetup: 'Bertemu langsung',
  delivery: 'Diantar sesuai kesepakatan',
};

export const paymentKindLabels: Record<OrderPayment['kind'], string> = {
  dp: 'DP',
  balance: 'Pelunasan',
  shipping: 'Ongkos kirim',
};

export const fulfillmentMilestoneLabels = {
  processingAt: 'Mulai diproses',
  readyAt: 'Siap diserahkan',
  handedAt: 'Diserahkan',
  receivedAt: 'Diterima pembeli',
} as const;

export function paymentStateLabel(state: OrderPayment['state']) {
  if (state === 'acknowledged') return 'Dikonfirmasi penjual';
  if (state === 'cancelled') return 'Tidak berlaku';
  return 'Menunggu konfirmasi penjual';
}

export function orderDateTimeLabel(value: string | null) {
  if (!value) return null;
  return `${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value))} WIB`;
}
