import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'esnext'
  },
  resolve: {
    alias: [
      {
        find: '@retro-dos/foxpro-ui',
        replacement: '/Users/carledwards/dev/carledwards/retro-dos-framework/packages/retro-foxpro-ui/src'
      }
    ]
  }
});
