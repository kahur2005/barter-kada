import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { readPublicConfig } from './lib/env';
import './app/styles.css';

const root = createRoot(document.getElementById('root')!);
async function start() {
  try {
    const config = readPublicConfig(import.meta.env);
    let repository;
    if (config.mode === 'preview') {
      const [{ createPreviewRepository }, { demoListings, demoStores }] = await Promise.all([import('./features/discovery/preview-repository'), import('./features/discovery/fixtures')]);
      repository = createPreviewRepository(demoListings, demoStores);
    } else {
      const [{ createClient }, { createSupabaseRepository }] = await Promise.all([import('@supabase/supabase-js'), import('./features/discovery/supabase-repository')]);
      repository = createSupabaseRepository(createClient(config.url, config.key));
    }
    root.render(<StrictMode><BrowserRouter><App repository={repository} /></BrowserRouter></StrictMode>);
  } catch (error) {
    root.render(<main className="setup-page"><span className="wordmark">barter.</span><h1>Aplikasi belum terhubung</h1><p role="alert">{error instanceof Error ? error.message : 'Konfigurasi belum dapat dimuat.'}</p><p>Pengembang: isi konfigurasi publik sesuai <a href="https://github.com/kahur2005/barter-kada#menjalankan-aplikasi">README repository</a>, lalu jalankan ulang Vite. Jangan memasukkan credential server.</p><p>Untuk memeriksa UI dengan data contoh, jalankan <code>npm run dev:preview</code>.</p></main>);
  }
}
void start();
