import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { returnPath } from '../discovery/ListingDetailPage';
import { Icon } from '../../components/Icon';
import { PageHeading } from '../../components/SurfacePrimitives';

export function UnavailablePage({ title }: { title?: string }) {
  const [params] = useSearchParams(); const location = useLocation();
  const labels: Record<string, string> = { chat: 'Chat', barter: 'Barter', report: 'Pelaporan' };
  const feature = labels[params.get('feature') ?? ''] ?? 'Fitur ini';
  return <section className="unavailable-page"><PageHeading leading={<Link className="back-link" to={returnPath(location.state)}><Icon name="back" />Kembali</Link>} title={title ?? `${feature} belum tersedia`} description="Bagian ini sedang dibangun. Belum ada pesan, tawaran, pembayaran, atau data akun yang dikirim." /><p>Kamu masih dapat menelusuri penawaran dan katalog. Data contoh bukan barang yang bisa ditransaksikan.</p><Link className="button secondary" to="/">Jelajahi penawaran</Link></section>;
}
