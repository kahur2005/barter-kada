import { useState, useRef, type ChangeEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { BackButton, ActionLink } from '../../components/NavigationLinks';
import { Icon, type IconName } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { useAuth } from './AuthProvider';

interface MenuItem {
  to: string;
  icon: IconName;
  title: string;
  description: string;
}

const menuItems: MenuItem[] = [
  { to: '/onboarding', icon: 'user', title: 'Profil & verifikasi', description: 'Nama, bio, wilayah, dan status WhatsApp' },
  { to: '/my/listings', icon: 'plus', title: 'Listing saya', description: 'Kelola penawaran aktif, draft, dan arsip' },
  { to: '/my/stores', icon: 'shop', title: 'Toko saya', description: 'Kelola toko UMKM di sekitar' },
  { to: '/plus', icon: 'shop', title: 'Akun Plus', description: 'Pelajari paket dan simulasi toko Plus' },
  { to: '/transactions', icon: 'arrow', title: 'Transaksi saya', description: 'Riwayat negosiasi barter dan pesanan' },
  { to: '/notifications', icon: 'bell', title: 'Notifikasi', description: 'Aktivitas terbaru chat dan transaksi' },
];

export function AccountPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  if (!auth.available) {
    return (
      <section className="account-page">
        <BackButton fallback="/" />
        <h1>Akun</h1>
        <p>Mode data contoh tidak membuat sesi atau profil palsu.</p>
        <ActionLink to="/auth/login">Lihat cara masuk</ActionLink>
      </section>
    );
  }

  if (auth.status === 'loading') {
    return (
      <section className="status-panel" role="status">
        <h1>Memuat akun…</h1>
      </section>
    );
  }

  if (auth.status === 'guest') {
    return <Navigate to="/auth/login?returnTo=%2Fprofile" replace />;
  }

  const currentAvatar = previewAvatar ?? auth.session?.avatarUrl ?? null;
  const initial = auth.session?.email ? auth.session.email.charAt(0).toUpperCase() : 'W';

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format foto harus JPEG, PNG, atau WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran foto maksimal 5 MB.');
      return;
    }

    if (!auth.gateway?.uploadAvatar) {
      setError('Fitur upload avatar belum tersedia pada sesi ini.');
      return;
    }

    setAvatarLoading(true);
    setError(null);

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setPreviewAvatar(localUrl);

    try {
      const remoteUrl = await auth.gateway.uploadAvatar(file);
      setPreviewAvatar(remoteUrl);
      toast.success('Foto profil berhasil diperbarui.');
    } catch (err) {
      setPreviewAvatar(null);
      const errMsg = err instanceof Error ? err.message : 'Gagal mengunggah foto profil. Coba lagi.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleDeleteAvatar() {
    if (!auth.gateway?.deleteAvatar) return;
    setAvatarLoading(true);
    setError(null);
    try {
      await auth.gateway.deleteAvatar();
      setPreviewAvatar(null);
      toast.success('Foto profil berhasil dihapus.');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Gagal menghapus foto profil.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setAvatarLoading(false);
    }
  }

  async function signOut() {
    setPending(true);
    setError(null);
    try {
      await auth.gateway!.signOut();
      toast.info('Kamu telah keluar dari akun.');
      navigate('/auth/login', { replace: true });
    } catch {
      setError('Akun belum dapat dikeluarkan. Coba lagi.');
      setPending(false);
    }
  }

  return (
    <section className="account-page">
      <BackButton fallback="/" />
      <p className="eyebrow">Akun warga</p>
      <h1>Akun</h1>

      <div className="account-profile-card">
        <div className="account-avatar-wrapper">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Foto profil"
              className="account-avatar-img"
            />
          ) : (
            <div className="account-avatar-placeholder" aria-label="Avatar inisial">
              <span>{initial}</span>
            </div>
          )}

          {avatarLoading && (
            <div className="account-avatar-spinner" role="status" aria-label="Memproses foto…">
              <span className="sr-only">Memproses foto…</span>
            </div>
          )}
        </div>

        <div className="account-profile-details">
          <strong className="account-profile-title">{auth.session?.email ?? 'Warga Barter'}</strong>
          <span className="account-profile-sub">Foto profil terlihat saat bertransaksi dan chat</span>

          <input
            ref={fileInputRef}
            type="file"
            aria-label="Foto profil"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            id="avatar-file-input"
            onChange={handleAvatarUpload}
            disabled={avatarLoading}
          />

          <div className="account-avatar-actions">
            <button
              type="button"
              className="button secondary button-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
            >
              {avatarLoading ? 'Mengunggah…' : currentAvatar ? 'Ganti foto' : 'Unggah foto profil'}
            </button>

            {currentAvatar && (
              <button
                type="button"
                className="text-button account-avatar-delete"
                onClick={handleDeleteAvatar}
                disabled={avatarLoading}
              >
                Hapus foto
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="form-alert" role="alert">{error}</p>}

      <dl>
        <dt>Email</dt>
        <dd>{auth.session?.email ?? 'Tidak tersedia'}</dd>
        <dt>Status profil</dt>
        <dd><ActionLink to="/onboarding">Lihat kelengkapan akun</ActionLink></dd>
      </dl>

      <nav className="settings-menu-list" aria-label="Menu akun">
        {menuItems.map(item => (
          <Link key={item.to} to={item.to} className="settings-menu-item" aria-label={item.title}>
            <div className="settings-menu-item-left">
              <Icon name={item.icon} />
              <div>
                <span className="settings-menu-title">{item.title}</span>
                <span className="settings-menu-desc">{item.description}</span>
              </div>
            </div>
            <span className="settings-menu-chevron" aria-hidden="true">›</span>
          </Link>
        ))}
      </nav>

      <button
        type="button"
        className="button secondary"
        onClick={signOut}
        disabled={pending || avatarLoading}
      >
        Keluar dari akun
      </button>
    </section>
  );
}
