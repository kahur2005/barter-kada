import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BackButton } from '../../components/NavigationLinks';
import { StatusPanel } from '../../components/StatusPanel';
import { PageHeading } from '../../components/SurfacePrimitives';
import { useNotificationGateway } from './NotificationContext';
import type { Notification } from './types';

function formatTime(value: string) { return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value)); }
function NotificationRow({ item, onRead, pending }: { item: Notification; onRead: (id: string) => void; pending: boolean }) {
  return <article className={`notification-row ${item.readAt ? 'read' : 'unread'}`}>
    <div><p className="eyebrow">{item.kind === 'message' ? 'Pesan' : item.kind === 'barter' ? 'Barter' : item.kind === 'order' ? 'Pesanan' : item.kind === 'review' ? 'Ulasan' : 'Barter'}</p><h2><Link to={item.href}>{item.title}</Link></h2><p>{item.body}</p><time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time></div>
    {!item.readAt && <button className="text-button" type="button" disabled={pending} onClick={() => onRead(item.id)}>Tandai sudah dibaca</button>}
  </article>;
}

export function NotificationsPage() {
  const gateway = useNotificationGateway(); const client = useQueryClient();
  const query = useQuery({ queryKey: ['notifications', null], queryFn: () => gateway!.list({ cursor: null }), enabled: Boolean(gateway) });
  const read = useMutation({ mutationFn: (id: string) => gateway!.markRead(id), onSuccess: (_, id) => client.setQueryData(['notifications', null], (old: Awaited<ReturnType<NonNullable<typeof gateway>['list']>> | undefined) => old ? { ...old, items: old.items.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item) } : old) });
  if (!gateway) return <StatusPanel title="Notifikasi belum aktif"><p>Hubungkan backend untuk melihat notifikasi dari chat dan transaksi.</p></StatusPanel>;
  if (query.isPending) return <StatusPanel title="Memuat notifikasi…" />;
  if (query.error) return <StatusPanel title="Notifikasi tidak dapat dimuat" error><button className="button" type="button" onClick={() => void query.refetch()}>Coba lagi</button></StatusPanel>;
  const items = query.data?.items ?? [];
  return <section className="notifications-page"><PageHeading leading={<BackButton fallback="/profile" />} kicker="Pusat aktivitas" title="Notifikasi" description="Perubahan chat, barter, dan pesanan muncul di sini. Barter tidak mengirim push notification." />{items.length ? <div className="notification-list">{items.map(item => <NotificationRow key={item.id} item={item} pending={read.isPending} onRead={id => read.mutate(id)} />)}</div> : <StatusPanel title="Belum ada notifikasi"><p>Aktivitas baru akan muncul setelah ada pesan atau transaksi yang berubah.</p></StatusPanel>}{read.error && <p className="form-alert" role="alert">Status baca belum tersimpan. Coba lagi.</p>}</section>;
}
