import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3000
  },
  resolve: {
    alias: {
      '@retro-dos/retro-ui-lib': '../../src/index.ts'
    }
  },
  build: {
    target: 'esnext',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  base: './'
});
