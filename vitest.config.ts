import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/game': path.resolve(__dirname, './src/game'),
      '@/renderers': path.resolve(__dirname, './src/renderers'),
      '@/shared': path.resolve(__dirname, './src/shared'),
    },
  },
});
