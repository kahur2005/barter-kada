import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import type { TransactionFollowUp } from './transaction-follow-up';

const formatJakarta = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value));

export function StuckTransactionPanel({ followUp, counterpartLabel, pending, onRequest }: { followUp?: TransactionFollowUp | null; counterpartLabel: string; pending: boolean; onRequest?: (description: string) => Promise<void> }) {
  const [open, setOpen] = useState(false); const [description, setDescription] = useState(''); const [error, setError] = useState<string | null>(null);
  if (!followUp) return null;
  async function submit() {
    if (description.trim().length < 10 || !onRequest) { setError('Jelaskan masalah minimal 10 karakter.'); return; }
    try { await onRequest(description.trim()); setOpen(false); setDescription(''); setError(null); } catch { setError('Permintaan bantuan belum tersimpan. Coba lagi tanpa membuat laporan baru.'); }
  }
  return <section className="inline-notice stuck-transaction-panel"><h2>Transaksi menggantung</h2><p>{counterpartLabel} belum menyelesaikan konfirmasi setelah tahap penyerahan. Tidak ada penyelesaian otomatis.</p>{followUp.adminHelpRequested ? <p className="success-notice">Permintaan bantuan admin sudah tercatat. Pantau notifikasi dan tetap simpan bukti kesepakatan.</p> : followUp.canRequestAdminHelp && onRequest ? <button className="button secondary" type="button" onClick={() => setOpen(true)}>Minta bantuan admin</button> : <p className="form-help">Bantuan admin tersedia setelah {formatJakarta(followUp.helpAvailableAt)}.</p>}{open && <Dialog title="Minta bantuan admin" onClose={() => { if (!pending) { setOpen(false); setError(null); } }}><p>Admin akan memeriksa konteks transaksi ini saja. Pengajuan bantuan tidak otomatis membatalkan transaksi atau memindahkan uang.</p><label htmlFor="stuck-transaction-description">Keterangan bantuan<textarea id="stuck-transaction-description" rows={5} maxLength={3000} value={description} onChange={event => setDescription(event.target.value)} /></label>{error && <p className="form-alert" role="alert">{error}</p>}<div className="form-actions"><button className="button secondary" type="button" disabled={pending} onClick={() => setOpen(false)}>Kembali</button><button className="button" type="button" disabled={pending || description.trim().length < 10} onClick={() => void submit()}>{pending ? 'Mengirim…' : 'Kirim ke admin'}</button></div></Dialog>}</section>;
}
