import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { CustomerSupportChat } from './CustomerSupportChat';

afterEach(() => vi.unstubAllGlobals());

describe('customer support chat', () => {
  it('opens separately from the peer chat and sends a support question', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Kamu bisa membuka listing lalu pilih Barter.' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<CustomerSupportChat />);
    const launcher = screen.getByRole('button', { name: 'Buka bantuan pelanggan' });
    expect(launcher).not.toHaveTextContent('Bantuan');
    await user.click(launcher);
    expect(screen.getByRole('heading', { name: 'Bantuan Barter' })).toBeVisible();
    expect(screen.getByText('Tanya cara memakai Barter, barter, atau pesanan.')).toBeVisible();

    await user.type(screen.getByLabelText('Pesan ke bantuan pelanggan'), 'Bagaimana cara barter?');
    await user.click(screen.getByRole('button', { name: 'Kirim pertanyaan' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/ai-chat', expect.objectContaining({ method: 'POST' }));
    expect(await screen.findByText('Kamu bisa membuka listing lalu pilih Barter.')).toBeVisible();
  });

  it('keeps the assistant open and explains when the request fails', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'AI_PROVIDER_UNAVAILABLE' }), { status: 502 })));

    render(<CustomerSupportChat />);
    await user.click(screen.getByRole('button', { name: 'Buka bantuan pelanggan' }));
    await user.type(screen.getByLabelText('Pesan ke bantuan pelanggan'), 'Hai');
    await user.click(screen.getByRole('button', { name: 'Kirim pertanyaan' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Bantuan sedang tidak tersedia. Coba lagi sebentar.'));
    expect(screen.getByRole('heading', { name: 'Bantuan Barter' })).toBeVisible();
  });
});
