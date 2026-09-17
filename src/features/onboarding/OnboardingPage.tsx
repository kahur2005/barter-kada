import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../auth/AuthProvider';
import { useOnboardingGateway } from './OnboardingContext';
import type { OnboardingState, ServiceArea } from './types';

const profileInput = z.object({
  displayName: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(80, 'Nama maksimal 80 karakter.'),
  bio: z.string().trim().max(500, 'Bio maksimal 500 karakter.'),
});

function Steps({ active }: { active: OnboardingState['nextStep'] }) {
  const steps = [['profile', 'Data diri'], ['location', 'Lokasi']] as const;
  const activeIndex = active === 'complete' ? steps.length : steps.findIndex(([key]) => key === active);
  return <ol className="onboarding-steps" aria-label="Tahap kelengkapan akun">{steps.map(([key, label], index) => <li key={key} className={index <= activeIndex ? 'reached' : ''} aria-current={key === active ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>;
}

function ProfileStep({ state, save, editing = false }: { state: OnboardingState; save: (next: OnboardingState) => void; editing?: boolean }) {
  const gateway = useOnboardingGateway()!;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    const form = new FormData(event.currentTarget);
    const parsed = profileInput.safeParse({ displayName: form.get('displayName'), bio: form.get('bio') });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Periksa data diri.'); return; }
    setPending(true);
    try { save(await gateway.completeProfile({ displayName: parsed.data.displayName, bio: parsed.data.bio || null })); }
    catch { setError('Data diri belum dapat disimpan. Coba lagi.'); }
    finally { setPending(false); }
  }
  return <section aria-labelledby="profile-title"><h2 id="profile-title">{editing ? 'Perbarui data diri' : 'Perkenalkan dirimu'}</h2><p>{editing ? 'Perubahan nama dan bio langsung tersimpan sebagai identitas publikmu.' : 'Nama ini terlihat oleh warga lain. Nomor telepon dan alamat lengkap tetap privat.'}</p>
    {error && <p className="form-alert" role="alert">{error}</p>}
    <form className="stack-form" onSubmit={submit} noValidate>
      <label htmlFor="display-name">Nama yang ditampilkan</label><input id="display-name" name="displayName" defaultValue={state.displayName} autoComplete="name" maxLength={80} required />
      <label htmlFor="bio">Bio singkat <span className="optional">(opsional)</span></label><textarea id="bio" name="bio" defaultValue={state.bio ?? ''} rows={4} maxLength={500} />
      <button className="button" disabled={pending}>{pending ? 'Menyimpan…' : editing ? 'Simpan data diri' : 'Simpan dan lanjut'}</button>
    </form>
  </section>;
}

function LocationStep({ state, areas, save, editing = false }: { state: OnboardingState; areas: ServiceArea[]; save: (next: OnboardingState) => void; editing?: boolean }) {
  const gateway = useOnboardingGateway()!;
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  function locate() {
    setError(null);
    if (!navigator.geolocation) { setError('Perangkat ini tidak menyediakan lokasi.'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setPosition({ latitude: coords.latitude, longitude: coords.longitude }),
      () => setError('Lokasi tidak diperoleh. Izinkan akses atau coba lagi.'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    const form = new FormData(event.currentTarget); const areaId = String(form.get('areaId') ?? '');
    if (!areaId) { setError('Pilih wilayah tempat tinggalmu.'); return; }
    if (!position) { setError('Ambil lokasi perangkat setelah kamu siap.'); return; }
    setPending(true);
    try { save(await gateway.setLocation({ areaId, ...position, address: String(form.get('address') ?? '').trim() || null })); }
    catch { setError('Lokasi belum dapat disimpan. Pastikan berada di wilayah layanan yang dipilih.'); }
    finally { setPending(false); }
  }
  return <section aria-labelledby="location-title"><h2 id="location-title">{editing ? 'Perbarui lokasi privat' : 'Atur lokasi privat'}</h2><p>Koordinat dipakai untuk menghitung jarak maksimum 5 km. Pengguna lain hanya melihat area perkiraan.</p>
    {error && <p className="form-alert" role="alert">{error}</p>}
    <form className="stack-form" onSubmit={submit}>
      <label htmlFor="area">Wilayah</label><select id="area" name="areaId" defaultValue={state.areaId ?? ''} required><option value="" disabled>Pilih wilayah</option>{areas.map(area => <option key={area.areaId} value={area.areaId}>{area.name}</option>)}</select>
      <label htmlFor="address">Alamat/patokan <span className="optional">(opsional, privat)</span></label><textarea id="address" name="address" rows={3} maxLength={300} autoComplete="street-address" defaultValue={state.address ?? ''} />
      <button className="button secondary" type="button" onClick={locate}>{position ? 'Lokasi perangkat tersimpan' : 'Gunakan lokasi perangkat'}</button>
      <p className="form-help">Akses lokasi hanya diminta ketika tombol di atas ditekan.</p>
      <button className="button" disabled={pending || !position}>{pending ? 'Menyimpan…' : 'Simpan lokasi dan lanjut'}</button>
    </form>
  </section>;
}

export function OnboardingPage() {
  const auth = useAuth(); const gateway = useOnboardingGateway();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    if (auth.status !== 'authenticated' || !gateway) return;
    let active = true; setLoadError(false);
    Promise.all([gateway.getState(), gateway.listAreas()]).then(([next, list]) => { if (active) { setState(next); setAreas(list); } }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [auth.status, gateway]);
  if (!auth.available) return <section className="status-panel"><h1>Onboarding tidak aktif di mode contoh</h1><p>Hubungkan Supabase untuk menyimpan profil dan lokasi privat.</p><Link className="button secondary" to="/">Kembali ke beranda</Link></section>;
  if (auth.status === 'loading') return <section className="status-panel" role="status"><h1>Memeriksa akun…</h1></section>;
  if (auth.status === 'guest') return <Navigate to="/auth/login?returnTo=%2Fonboarding" replace />;
  if (!gateway || loadError) return <section className="status-panel"><h1>Onboarding belum dapat dimuat</h1><p role="alert">Layanan profil tidak tersedia. Muat ulang halaman untuk mencoba lagi.</p></section>;
  if (!state) return <section className="status-panel" role="status"><h1>Memuat data akun…</h1></section>;
  return <div className="onboarding-page"><header><p className="eyebrow">Satu akun, dua cara berjualan</p><h1>{state.nextStep === 'complete' ? 'Kelola akun' : 'Lengkapi akun'}</h1><p>{state.nextStep === 'complete' ? 'Perbarui identitas publik atau lokasi privat tanpa mengubah transaksi yang sudah berjalan.' : 'Selesaikan dua tahap ini sebelum memasang barang, membuka toko Plus, mengobrol, atau bertransaksi.'}</p></header><Steps active={state.nextStep} />
    <div className={`onboarding-panel${state.nextStep === 'complete' ? ' account-settings' : ''}`}>{state.nextStep === 'profile' && <ProfileStep state={state} save={setState} />}{state.nextStep === 'location' && <LocationStep state={state} areas={areas} save={setState} />}{state.nextStep === 'complete' && <><ProfileStep state={state} save={setState} editing /><LocationStep state={state} areas={areas} save={setState} editing /><section className="completion-panel"><h2>Akun siap digunakan</h2><p>Profil dan lokasi privat telah lengkap. Nomor telepon tidak diperlukan untuk menggunakan Barter.</p><Link className="button" to="/">Lihat penawaran sekitar</Link></section></>}</div>
  </div>;
}
