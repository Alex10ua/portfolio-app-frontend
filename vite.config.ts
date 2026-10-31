import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/login': {
        target: 'http://localhost:8080',
        // Spring handles form POSTs; a direct GET must load the SPA login route.
        bypass: request => request.method === 'GET' ? '/' : undefined,
      },
      '/logout': 'http://localhost:8080',
    },
  },
});
