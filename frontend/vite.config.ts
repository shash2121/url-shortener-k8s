import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: 'http://localhost:3001', changeOrigin: true },
      '/shorten': { target: 'http://localhost:3002', changeOrigin: true },
      '/urls': { target: 'http://localhost:3002', changeOrigin: true },
      '/analytics': { target: 'http://localhost:3003', changeOrigin: true },
      '/admin/': { target: 'http://localhost:3004', changeOrigin: true },
      '/s/': { target: 'http://localhost:3002', changeOrigin: true },
    },
  },
});
