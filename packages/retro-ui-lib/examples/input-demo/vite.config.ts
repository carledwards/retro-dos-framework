import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@retro-dos/video-buffer': resolve(__dirname, '../../src/video/index.ts')
    }
  }
});
