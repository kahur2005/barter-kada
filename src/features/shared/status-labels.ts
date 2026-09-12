const orderLabels: Record<string, string> = {
  quoted: 'Menunggu konfirmasi',
  confirmed: 'Disepakati',
  awaiting_dp: 'Menunggu DP',
  processing: 'Sedang diproses',
  ready: 'Siap diserahkan',
  awaiting_receipt: 'Menunggu barang diterima',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const tradeLabels: Record<string, string> = {
  negotiating: 'Sedang dinegosiasikan',
  agreed: 'Disepakati',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const reportLabels: Record<string, string> = {
  open: 'Terbuka',
  under_review: 'Sedang ditinjau',
  resolved: 'Selesai',
  rejected: 'Ditolak',
  decided: 'Diputuskan',
  closed: 'Ditutup',
};

const outcomeLabels: Record<string, string> = {
  no_action: 'Tidak ada tindakan',
  return_required: 'Pengembalian barang diperlukan',
  cancel_transaction: 'Transaksi dibatalkan melalui keputusan admin',
  admin_complete: 'Diselesaikan melalui keputusan admin',
  restrict_account: 'Akun dibatasi',
  ban_account: 'Akun diblokir',
};

const refundLabels: Record<string, string> = {
  proposed: 'Menunggu persetujuan',
  accepted: 'Disetujui, menunggu transfer',
  sent_unconfirmed: 'Transfer dikirim, menunggu konfirmasi',
  confirmed: 'Dana diterima',
  rejected: 'Ditolak',
};

const billingLabels: Record<string, string> = {
  pending: 'Menunggu simulasi',
  succeeded: 'Berhasil',
  failed: 'Gagal',
  expired: 'Kedaluwarsa',
};

function labelFor(labels: Record<string, string>, value: string): string {
  return labels[value] ?? 'Status terbaru';
}

export function orderStatusLabel(value: string): string { return labelFor(orderLabels, value); }
export function tradeStatusLabel(value: string): string { return labelFor(tradeLabels, value); }
export function reportStatusLabel(value: string): string { return labelFor(reportLabels, value); }
export function reportOutcomeLabel(value: string): string { return labelFor(outcomeLabels, value); }
export function refundStatusLabel(value: string): string { return labelFor(refundLabels, value); }
export function billingStatusLabel(value: string): string { return labelFor(billingLabels, value); }
export function transactionStatusLabel(kind: 'barter' | 'order', value: string): string {
  return kind === 'barter' ? tradeStatusLabel(value) : orderStatusLabel(value);
}
