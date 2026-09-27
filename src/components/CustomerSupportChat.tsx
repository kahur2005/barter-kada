import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Icon } from './Icon';

type SupportMessage = { role: 'user' | 'assistant'; content: string };

const welcomeMessage: SupportMessage = {
  role: 'assistant',
  content: 'Halo! Saya bantuan Barter. Ceritakan apa yang ingin kamu lakukan dan saya bantu menemukan langkahnya.',
};

export function CustomerSupportChat() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<SupportMessage[]>([welcomeMessage]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const content = text.trim();
    if (!content || pending) return;
    const nextMessages = [...messages, { role: 'user' as const, content }];
    setMessages(nextMessages);
    setText('');
    setError(false);
    setPending(true);
    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await response.json() as { message?: unknown };
      const assistantMessage = typeof data.message === 'string' ? data.message.trim() : '';
      if (!response.ok || !assistantMessage) throw new Error('SUPPORT_UNAVAILABLE');
      setMessages(current => [...current, { role: 'assistant', content: assistantMessage }]);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <aside className={`support-chat ${open ? 'support-chat-open' : ''}`} aria-label="Bantuan pelanggan">
      {open && (
        <section className="support-panel" aria-labelledby="support-title">
          <header className="support-panel-header">
            <div className="support-title-mark"><Icon name="lightbulb" size={18} /></div>
            <div>
              <h2 id="support-title">Bantuan Barter</h2>
              <p>Tanya cara memakai Barter, barter, atau pesanan.</p>
            </div>
            <button className="support-close" type="button" aria-label="Tutup bantuan pelanggan" onClick={() => setOpen(false)}>
              <Icon name="close" size={20} />
            </button>
          </header>
          <div className="support-messages" aria-live="polite" aria-label="Percakapan bantuan">
            {messages.map((message, index) => (
              <p key={`${message.role}-${index}`} className={`support-message ${message.role}`}>{message.content}</p>
            ))}
            {pending && <p className="support-message assistant support-thinking" role="status">Sedang mencari jawaban…</p>}
          </div>
          {error && <p className="support-error" role="alert">Bantuan sedang tidak tersedia. Coba lagi sebentar.</p>}
          <form className="support-composer" onSubmit={submit}>
            <label className="sr-only" htmlFor="support-message">Pesan ke bantuan pelanggan</label>
            <textarea
              id="support-message"
              rows={2}
              maxLength={2000}
              value={text}
              onChange={event => setText(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Tulis pertanyaan…"
            />
            <button className="button" type="submit" aria-label="Kirim pertanyaan" disabled={!text.trim() || pending}>
              {pending ? 'Mencari…' : 'Kirim'}
            </button>
          </form>
        </section>
      )}
      <button className="support-launcher" type="button" aria-label={open ? 'Tutup bantuan pelanggan' : 'Buka bantuan pelanggan'} title={open ? 'Tutup bantuan pelanggan' : 'Buka bantuan pelanggan'} onClick={() => setOpen(value => !value)}>
        <Icon name={open ? 'close' : 'lightbulb'} size={20} />
      </button>
    </aside>
  );
}
