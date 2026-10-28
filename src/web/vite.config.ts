import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const SERVER_URL = process.env.LUMOS_SERVER_URL ?? 'http://localhost:3030';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: SERVER_URL,
        changeOrigin: true,
        // Keep the bridge CORS whitelist intact while proxying from any dev host
        // (including a phone opening the Vite server over the local network).
        headers: { origin: 'http://localhost:5173' },
      },
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
});
