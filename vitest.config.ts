import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { testTimeout: 15000, environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: true, include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts', 'supabase/functions/_shared/**/*.test.ts'] },
});
