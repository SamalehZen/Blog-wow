import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 4190, host: '127.0.0.1' },
  preview: { port: 4190, host: '127.0.0.1' },
  build: {
    outDir: 'dist',
    // les ilots et les assets d'origine ne doivent pas etre haches
    assetsInlineLimit: 0,
  },
});
