import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { readPublicConfig } from './lib/env';
import './app/styles.css';
import './app/app-shell.css';
import './app/focused-journey.css';
import './features/auth/auth-journey.css';
import './features/listings/listing-editor.css';

const root = createRoot(document.getElementById('root')!);
async function start() {
  try {
    const config = readPublicConfig(import.meta.env);
    let repository;
    let authGateway = null;
    let onboardingGateway = null;
    let listingGateway = null;
    let chatGateway = null;
    let tradeGateway = null;
    let orderGateway = null;
    let storeGateway = null;
    let reportGateway = null;
    let notificationGateway = null;
    let reviewGateway = null;
    let adminGateway = null;
    let transactionGateway = null;
    if (config.mode === 'preview') {
      const [{ createPreviewRepository }, { demoListings, demoStores }] = await Promise.all([import('./features/discovery/preview-repository'), import('./features/discovery/fixtures')]);
      repository = createPreviewRepository(demoListings, demoStores);
    } else {
      const [{ createClient }, { createSupabaseRepository }, { createSupabaseAuthGateway }, { createSupabaseOnboardingGateway }, { createSupabaseListingGateway }, { createSupabaseChatGateway }, { createSupabaseTradeGateway }, { createSupabaseOrderGateway }, { createSupabaseStoreGateway }, { createSupabaseReportGateway }, { createSupabaseNotificationGateway }, { createSupabaseReviewGateway }, { createSupabaseAdminGateway }, { createSupabaseTransactionGateway }] = await Promise.all([import('@supabase/supabase-js'), import('./features/discovery/supabase-repository'), import('./features/auth/gateway'), import('./features/onboarding/gateway'), import('./features/listings/gateway'), import('./features/chat/gateway'), import('./features/trades/gateway'), import('./features/orders/gateway'), import('./features/stores/gateway'), import('./features/reports/gateway'), import('./features/notifications/gateway'), import('./features/reviews/gateway'), import('./features/admin/gateway'), import('./features/transactions/gateway')]);
      const client = createClient(config.url, config.key);
      repository = createSupabaseRepository(client);
      authGateway = createSupabaseAuthGateway(client);
      onboardingGateway = createSupabaseOnboardingGateway(client);
      listingGateway = createSupabaseListingGateway(client);
      chatGateway = createSupabaseChatGateway(client);
      tradeGateway = createSupabaseTradeGateway(client);
      orderGateway = createSupabaseOrderGateway(client);
      storeGateway = createSupabaseStoreGateway(client);
      reportGateway = createSupabaseReportGateway(client);
      notificationGateway = createSupabaseNotificationGateway(client);
      reviewGateway = createSupabaseReviewGateway(client);
      adminGateway = createSupabaseAdminGateway(client);
      transactionGateway = createSupabaseTransactionGateway(client);
    }
    root.render(<StrictMode><BrowserRouter><App repository={repository} authGateway={authGateway} onboardingGateway={onboardingGateway} listingGateway={listingGateway} chatGateway={chatGateway} tradeGateway={tradeGateway} orderGateway={orderGateway} storeGateway={storeGateway} reportGateway={reportGateway} notificationGateway={notificationGateway} reviewGateway={reviewGateway} adminGateway={adminGateway} transactionGateway={transactionGateway} /></BrowserRouter></StrictMode>);
  } catch (error) {
    root.render(<main className="setup-page"><span className="wordmark">barter.</span><h1>Aplikasi belum terhubung</h1><p role="alert">{error instanceof Error ? error.message : 'Konfigurasi belum dapat dimuat.'}</p><p>Pengembang: isi konfigurasi publik sesuai <a href="https://github.com/kahur2005/barter-kada#menjalankan-aplikasi">README repository</a>, lalu jalankan ulang Vite. Jangan memasukkan credential server.</p><p>Untuk memeriksa UI dengan data contoh, jalankan <code>npm run dev:preview</code>.</p></main>);
  }
}
void start();
