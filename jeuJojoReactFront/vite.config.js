import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // En développement, les appels /api sont envoyés au back (npm run dev:back)
    proxy: {
      '/api': 'http://localhost:8800',
    },
  },
});
