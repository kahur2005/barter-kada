import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { StatusPanel } from '../../components/StatusPanel';
import { useReportGateway } from './ReportContext';
import type { ReportInput } from './gateway';

export function ReportPage() {
  const gateway = useReportGateway(); const location = useLocation(); const navigate = useNavigate(); const params = new URLSearchParams(location.search); const targetType = (params.get('targetType') ?? 'listing') as ReportInput['targetType']; const targetId = params.get('targetId') ?? '';
  const [reason, setReason] = useState<ReportInput['reason']>('other'); const [description, setDescription] = useState(''); const [error, setError] = useState<string | null>(null);
  const report = useMutation({ mutationFn: () => gateway!.create({ targetType, targetId, reason, description: description.trim() }), onSuccess: () => navigate(-1) });
  function submit(event: FormEvent) { event.preventDefault(); if (!targetId || description.trim().length < 10) { setError('Jelaskan masalah minimal 10 karakter.'); return; } setError(null); report.mutate(); }
  if (!gateway) return <StatusPanel title="Laporan belum aktif"><p>Hubungkan backend untuk menyimpan laporan secara nyata.</p></StatusPanel>;
  return <section className="report-page"><header><button className="back-link text-button" type="button" onClick={() => navigate(-1)}>Kembali</button><p className="eyebrow">Keamanan komunitas</p><h1>Laporkan masalah</h1><p>Admin dapat melihat konteks transaksi atau percakapan yang terkait laporan ini. Chat lain yang tidak terkait tidak ikut dibuka otomatis.</p></header><form className="stack-form" onSubmit={submit}><label>Alasan<select value={reason} onChange={event => setReason(event.target.value as ReportInput['reason'])}><option value="scam">Penipuan</option><option value="unsafe">Perilaku tidak aman</option><option value="not_as_described">Barang tidak sesuai</option><option value="harassment">Gangguan/pelecehan</option><option value="other">Lainnya</option></select></label><label>Penjelasan<textarea rows={6} maxLength={3000} value={description} onChange={event => setDescription(event.target.value)} placeholder="Jelaskan apa yang terjadi dan kapan." /></label>{(error || report.error) && <p className="form-alert" role="alert">{error ?? 'Laporan belum terkirim. Coba lagi.'}</p>}<button className="button" disabled={report.isPending}>{report.isPending ? 'Mengirim laporan…' : 'Kirim laporan'}</button></form></section>;
}
