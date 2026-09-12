import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { StatusPanel } from '../../components/StatusPanel';
import { useChatGateway } from './ChatContext';
import { useRepository } from '../../app/providers';

const time = (value: string) => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(value));

export function ChatInboxPage() {
  const gateway = useChatGateway();
  const query = useQuery({ queryKey: ['chat', 'inbox'], queryFn: () => gateway!.listConversations(), enabled: Boolean(gateway) });
  if (!gateway) return <StatusPanel title="Pesan belum aktif"><p>Hubungkan backend untuk memakai percakapan nyata.</p></StatusPanel>;
  if (query.isPending) return <StatusPanel title="Memuat pesan…" />;
  if (query.error) return <StatusPanel title="Pesan belum dapat dimuat" error><button className="button" onClick={() => void query.refetch()}>Coba lagi</button></StatusPanel>;
  return <section className="chat-inbox"><header><p className="eyebrow">Percakapan privat</p><h1>Pesan</h1><p>Negosiasi tetap terpisah untuk setiap listing.</p></header>{query.data?.length ? <div className="conversation-list">{query.data.map(item => <Link key={item.id} to={`/chat/${item.id}`} aria-label={`${item.counterpart.name}, ${item.listing.title}`}><div><strong>{item.counterpart.name}</strong><span>{item.listing.title}</span><p>{item.lastMessage?.text ?? 'Belum ada pesan'}</p></div><div className="conversation-meta">{item.lastMessage && <time>{time(item.lastMessage.sentAt)}</time>}{item.unreadCount > 0 && <span>{item.unreadCount} belum dibaca</span>}</div></Link>)}</div> : <StatusPanel title="Belum ada percakapan"><p>Buka sebuah listing lalu hubungi pemiliknya.</p><Link to="/">Jelajahi listing</Link></StatusPanel>}</section>;
}

export function ChatRoomPage() {
  const { id = '' } = useParams(); const gateway = useChatGateway(); const auth = useAuth(); const repository = useRepository(); const client = useQueryClient();
  const [text, setText] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageProgress, setImageProgress] = useState(0);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const inbox = useQuery({ queryKey: ['chat', 'inbox'], queryFn: () => gateway!.listConversations(), enabled: Boolean(gateway) });
  const messages = useInfiniteQuery({
    queryKey: ['chat', id, 'messages'],
    queryFn: ({ pageParam }) => gateway!.listMessages(id, pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: page => page.hasMore ? page.items.at(0)?.seq : undefined,
    enabled: Boolean(gateway && id),
  });
  const conversation = useMemo(() => inbox.data?.find(item => item.id === id), [id, inbox.data]);
  const listing = useQuery({ queryKey: [repository.source, 'listing', conversation?.listing.id], queryFn: ({ signal }) => repository.getListing(conversation!.listing.id, signal), enabled: Boolean(conversation) });
  const visibleMessages = useMemo(() => messages.data ? [...messages.data.pages].reverse().flatMap(page => page.items) : [], [messages.data]);
  const counterpartLastRead = messages.data?.pages.at(0)?.counterpartLastRead ?? 0;
  useEffect(() => gateway?.subscribe(id, () => { void client.invalidateQueries({ queryKey: ['chat', id, 'messages'] }); void client.invalidateQueries({ queryKey: ['chat', 'inbox'] }); }), [client, gateway, id]);
  useEffect(() => {
    const last = visibleMessages.at(-1)?.seq;
    if (gateway && last) void gateway.markRead(id, last).then(() => client.invalidateQueries({ queryKey: ['chat', 'inbox'] }));
  }, [client, gateway, id, visibleMessages]);
  const send = useMutation({ mutationFn: (body: string) => gateway!.sendText(id, body, crypto.randomUUID()), onSuccess: () => { setText(''); void client.invalidateQueries({ queryKey: ['chat', id, 'messages'] }); void client.invalidateQueries({ queryKey: ['chat', 'inbox'] }); } });
  const sendImages = useMutation({ mutationFn: (files: File[]) => gateway!.sendImages(id, files, crypto.randomUUID(), setImageProgress), onSuccess: () => { setImages([]); setImageProgress(0); void client.invalidateQueries({ queryKey: ['chat', id, 'messages'] }); void client.invalidateQueries({ queryKey: ['chat', 'inbox'] }); } });
  const block = useMutation({ mutationFn: () => gateway!.blockUser(conversation!.counterpart.id), onSuccess: () => { setConfirmBlock(false); setBlocked(true); } });
  const unblock = useMutation({ mutationFn: () => gateway!.unblockUser(conversation!.counterpart.id), onSuccess: () => setBlocked(false) });
  function submit(event: FormEvent) { event.preventDefault(); const body = text.trim(); if (body && body.length <= 2_000 && !send.isPending) send.mutate(body); }
  function chooseImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []); event.target.value = '';
    if (selected.length > 4) { setImages([]); setImageError('Maksimal 4 foto dalam satu pesan.'); return; }
    if (selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size < 1)) { setImages([]); setImageError('Gunakan JPG, PNG, atau WebP dengan ukuran maksimal 5 MB per foto.'); return; }
    setImageError(null); setImages(selected); setImageProgress(0);
  }
  if (!gateway) return <StatusPanel title="Chat belum aktif"><p>Hubungkan backend untuk memakai percakapan nyata.</p></StatusPanel>;
  if (messages.isPending || inbox.isPending) return <StatusPanel title="Memuat percakapan…" />;
  if (messages.error || inbox.error || !conversation) return <StatusPanel title="Percakapan tidak tersedia" error><Link to="/chat">Kembali ke pesan</Link></StatusPanel>;
  return <section className="chat-room"><header className="chat-header"><Link className="back-link" to="/chat">Kembali</Link><div><h1>{conversation.counterpart.name}</h1><Link to={`/listings/${conversation.listing.id}`}>{conversation.listing.title}</Link></div><div className="chat-header-actions">{listing.data?.publisher.id === auth.session?.userId && <Link className="text-button" to={`/orders/new/${id}`}>Buat ringkasan pesanan</Link>}<Link className="text-button" to={`/reports/new?targetType=conversation&targetId=${id}`}>Laporkan</Link>{!blocked && !confirmBlock && <button className="text-button" type="button" onClick={() => setConfirmBlock(true)}>Blokir</button>}{confirmBlock && <div className="block-confirm" role="group" aria-label="Konfirmasi blokir"><button className="text-button danger" type="button" disabled={block.isPending} onClick={() => block.mutate()}>Ya, blokir</button><button className="text-button" type="button" onClick={() => setConfirmBlock(false)}>Batal</button></div>}</div></header>
    {(block.error || unblock.error) && <p className="form-alert" role="alert">Pengaturan blokir belum tersimpan. Coba lagi.</p>}
    <div className="message-list" aria-live="polite">{messages.hasNextPage && <button className="text-button" type="button" disabled={messages.isFetchingNextPage} onClick={() => void messages.fetchNextPage()}>{messages.isFetchingNextPage ? 'Memuat…' : 'Muat pesan lama'}</button>}{visibleMessages.map(message => <article key={message.id} className={message.senderId === auth.session?.userId ? 'message own' : 'message'}>{message.body.imageUrls?.length ? <div className="message-images">{message.body.imageUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Foto ${index + 1} dari ${message.senderId === auth.session?.userId ? 'Anda' : conversation.counterpart.name}`} /></a>)}</div> : <p>{message.body.text ?? (message.type === 'system' ? 'Status transaksi diperbarui.' : 'Foto sedang dimuat.')}</p>}<footer><time>{time(message.sentAt)}</time>{message.senderId === auth.session?.userId && <span>{message.seq <= counterpartLastRead ? 'Dibaca' : 'Terkirim'}</span>}</footer></article>)}</div>
    {send.error && <p className="form-alert" role="alert">Pesan belum terkirim. Teks tetap ada; coba lagi.</p>}
    {(imageError || sendImages.error) && <p className="form-alert chat-media-error" role="alert">{imageError ?? 'Foto belum terkirim. Pilihan tetap tersimpan; coba lagi.'}</p>}
    {blocked ? <div className="blocked-notice" role="status"><p>Pengguna diblokir. Pesan baru dihentikan.</p><button className="text-button" type="button" disabled={unblock.isPending} onClick={() => unblock.mutate()}>{unblock.isPending ? 'Membuka…' : 'Buka blokir'}</button></div> : <form className="chat-composer" onSubmit={submit}><div className="chat-media-controls"><label className="text-button" htmlFor="chat-images">Tambahkan foto</label><input className="sr-only" id="chat-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseImages} />{images.length > 0 && <><span>{images.length} foto dipilih</span><button className="text-button" type="button" disabled={sendImages.isPending} onClick={() => sendImages.mutate(images)}>{sendImages.isPending ? `Mengunggah ${imageProgress}%` : `Kirim ${images.length} foto`}</button></>}</div><label htmlFor="chat-message">Pesan</label><textarea id="chat-message" rows={2} maxLength={2000} value={text} onChange={event => setText(event.target.value)} /><button className="button" disabled={!text.trim() || send.isPending}>{send.isPending ? 'Mengirim…' : 'Kirim'}</button></form>}
  </section>;
}

export function OpenConversationPage() {
  const { listingId = '' } = useParams(); const gateway = useChatGateway(); const navigate = useNavigate(); const [error, setError] = useState(false);
  useEffect(() => { if (!gateway) return; let active = true; gateway.openConversation(listingId).then(id => { if (active) navigate(`/chat/${id}`, { replace: true }); }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, [gateway, listingId, navigate]);
  if (!gateway) return <StatusPanel title="Chat belum aktif"><p>Hubungkan backend untuk memakai percakapan nyata.</p></StatusPanel>;
  return error ? <StatusPanel title="Percakapan tidak dapat dibuka" error><Link to={`/listings/${listingId}`}>Kembali ke listing</Link></StatusPanel> : <StatusPanel title="Membuka percakapan…" />;
}
