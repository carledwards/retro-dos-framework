import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3000
  },
  publicDir: resolve(__dirname, 'public'),
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    },
    emptyOutDir: true
  },
  base: './'
});
