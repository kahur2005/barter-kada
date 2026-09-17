import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import type { AuthGateway } from '../auth/types';
import { createPreviewRepository } from '../discovery/preview-repository';
import type { OnboardingGateway } from '../onboarding/types';
import type { ChatGateway } from './gateway';

const me = '81000000-0000-4000-8000-000000000001';
const conversationId = '82000000-0000-4000-8000-000000000002';
const auth: AuthGateway = { getSession: vi.fn().mockResolvedValue({ userId: me, email: null }), subscribe: vi.fn(() => () => undefined), signInWithPassword: vi.fn(), signUpWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn() };
const onboarding: OnboardingGateway = { getState: vi.fn().mockResolvedValue({ nextStep: 'complete', displayName: 'Rina', bio: null, areaId: 'depok', address: null, maskedPhone: null, phoneVerified: false }), listAreas: vi.fn(), completeProfile: vi.fn(), setLocation: vi.fn() };
function chat(): ChatGateway { return {
  openConversation: vi.fn(), listConversations: vi.fn().mockResolvedValue([{ id: conversationId, listing: { id: '83000000-0000-4000-8000-000000000003', title: 'Kursi kayu', imagePath: null }, counterpart: { id: '84000000-0000-4000-8000-000000000004', name: 'Dita', storeName: null }, lastMessage: { text: 'Masih tersedia', sentAt: '2026-09-12T01:00:00.000Z', senderId: '84000000-0000-4000-8000-000000000004' }, unreadCount: 2 }]),
  listMessages: vi.fn().mockResolvedValue({ items: [{ id: '85000000-0000-4000-8000-000000000005', seq: 1, senderId: '84000000-0000-4000-8000-000000000004', type: 'text', transactionId: null, body: { text: 'Masih tersedia?' }, sentAt: '2026-09-12T01:00:00.000Z' }], hasMore: false, counterpartLastRead: 0 }),
  sendText: vi.fn().mockResolvedValue({ id: '86000000-0000-4000-8000-000000000006', seq: 2, senderId: me, type: 'text', transactionId: null, body: { text: 'Masih, silakan.' }, sentAt: '2026-09-12T01:01:00.000Z' }), sendImages: vi.fn(), markRead: vi.fn().mockResolvedValue(undefined), blockUser: vi.fn().mockResolvedValue(undefined), unblockUser: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(() => () => undefined),
}; }
function show(path: string, gateway = chat()) { render(<MemoryRouter initialEntries={[path]}><App repository={createPreviewRepository([], [])} authGateway={auth} onboardingGateway={onboarding} chatGateway={gateway} /></MemoryRouter>); return gateway; }

describe('private chat pages', () => {
  it('shows listing-scoped inbox entries and unread count', async () => {
    show('/chat');
    expect(await screen.findByRole('heading', { name: 'Pesan' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Dita/ })).toHaveAttribute('href', `/chat/${conversationId}`);
    expect(screen.getByText('2 belum dibaca')).toBeVisible();
  });

  it('fetches committed messages, marks the cursor, and sends text with a client id', async () => {
    const user = userEvent.setup(); const gateway = show(`/chat/${conversationId}`);
    expect(await screen.findByText('Masih tersedia?')).toBeVisible();
    expect(gateway.markRead).toHaveBeenCalledWith(conversationId, 1);
    await user.type(screen.getByLabelText('Pesan'), 'Masih, silakan.');
    await user.click(screen.getByRole('button', { name: 'Kirim' }));
    expect(gateway.sendText).toHaveBeenCalledWith(conversationId, 'Masih, silakan.', expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  it('loads older messages before the earliest visible sequence', async () => {
    const gateway = chat();
    vi.mocked(gateway.listMessages)
      .mockResolvedValueOnce({ items: [{ id: '85000000-0000-4000-8000-000000000005', seq: 51, senderId: '84000000-0000-4000-8000-000000000004', type: 'text', transactionId: null, body: { text: 'Pesan terbaru' }, sentAt: '2026-09-12T01:00:00.000Z' }], hasMore: true, counterpartLastRead: 0 })
      .mockResolvedValueOnce({ items: [{ id: '87000000-0000-4000-8000-000000000007', seq: 50, senderId: me, type: 'text', transactionId: null, body: { text: 'Pesan sebelumnya' }, sentAt: '2026-09-12T00:59:00.000Z' }], hasMore: false, counterpartLastRead: 0 });
    const user = userEvent.setup(); show(`/chat/${conversationId}`, gateway);
    await user.click(await screen.findByRole('button', { name: 'Muat pesan lama' }));
    expect(gateway.listMessages).toHaveBeenLastCalledWith(conversationId, 51);
    expect(await screen.findByText('Pesan sebelumnya')).toBeVisible();
  });

  it('requires confirmation before blocking and allows the user to undo it', async () => {
    const gateway = chat(); const user = userEvent.setup(); show(`/chat/${conversationId}`, gateway);
    await screen.findByText('Masih tersedia?');
    await user.click(screen.getByRole('button', { name: 'Blokir' }));
    expect(gateway.blockUser).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Ya, blokir' }));
    expect(gateway.blockUser).toHaveBeenCalledWith('84000000-0000-4000-8000-000000000004');
    expect(await screen.findByText('Pengguna diblokir. Pesan baru dihentikan.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Buka blokir' }));
    expect(gateway.unblockUser).toHaveBeenCalledWith('84000000-0000-4000-8000-000000000004');
  });

  it('validates the four-photo limit and sends selected images as one message', async () => {
    const gateway = chat(); const user = userEvent.setup(); show(`/chat/${conversationId}`, gateway);
    await screen.findByText('Masih tersedia?');
    const input = screen.getByLabelText('Tambahkan foto');
    await user.upload(input, Array.from({ length: 5 }, (_, index) => new File(['image'], `${index}.png`, { type: 'image/png' })));
    expect(screen.getByRole('alert')).toHaveTextContent('Maksimal 4 foto');
    expect(gateway.sendImages).not.toHaveBeenCalled();
    await user.upload(input, [new File(['a'], 'a.png', { type: 'image/png' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })]);
    await user.click(screen.getByRole('button', { name: 'Kirim 2 foto' }));
    expect(gateway.sendImages).toHaveBeenCalledWith(conversationId, expect.arrayContaining([expect.objectContaining({ name: 'a.png' }), expect.objectContaining({ name: 'b.jpg' })]), expect.stringMatching(/^[0-9a-f-]{36}$/), expect.any(Function));
  });
});
