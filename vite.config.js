import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const BACKEND_URL = process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000';

export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
});
