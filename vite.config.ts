import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  optimizeDeps: {
    entries: ['index.html'],
  },
  server: {
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: false,
    watch: {
      ignored: ['**/android/**', '**/dist/**'],
    },
  },
  preview: {
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
