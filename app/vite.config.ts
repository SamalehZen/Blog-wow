import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// L'application est servie sous https://photo.hypeer.cloud/v2/
// Les assets partages (/_next, /sky, /art, /posts) restent a la racine :
// ils sont deja servis par le clone, donc pas de duplication.
export default defineConfig({
  base: '/v2/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 4190, host: '127.0.0.1' },
  preview: { port: 4190, host: '127.0.0.1' },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
