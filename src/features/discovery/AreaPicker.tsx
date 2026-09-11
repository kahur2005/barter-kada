import { useId, useState } from 'react';
import { areas, radii } from './filters';
import type { DiscoveryQuery } from './types';

export function AreaPicker({ query, onApply, preview }: { query: DiscoveryQuery; onApply: (query: DiscoveryQuery) => void; preview: boolean }) {
  const id = useId();
  const [area, setArea] = useState(query.areaId);
  const [radius, setRadius] = useState(query.radiusKm);
  return <form className="filter-form" onSubmit={e => { e.preventDefault(); onApply({ ...query, areaId: area, radiusKm: radius, cursor: null }); }}>
    <p>Pilih area pencarian. Alamat rumah tidak ditampilkan kepada pengguna lain.</p>
    <label htmlFor={`${id}-area`}>Area</label><select id={`${id}-area`} value={area} onChange={e => setArea(e.target.value)}>{areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
    <label htmlFor={`${id}-radius`}>Radius perkiraan</label><select id={`${id}-radius`} value={radius} onChange={e => setRadius(Number(e.target.value))}>{radii.map(r => <option key={r} value={r}>{r} km</option>)}</select>
    <p className="metadata">{preview ? 'Area dan jarak data contoh bersifat ilustratif. Lokasi perangkat belum digunakan.' : 'Pencarian tersedia di Jabodetabek, selain Kepulauan Seribu.'}</p>
    <button className="button">Gunakan area ini</button>
  </form>;
}
