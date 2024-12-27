import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    open: true
  },
  build: {
    target: 'esnext'
  },
  resolve: {
    alias: {
      '@retro-dos/retro-ui-lib': resolve(__dirname, '../../src')
    }
  },
  optimizeDeps: {
    include: ['@retro-dos/retro-ui-lib']
  }
});
