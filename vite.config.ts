import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { createFaceApi } from './server/faceApi.ts';

const faceDir = fileURLToPath(new URL('./face', import.meta.url));
const ansOrderPath = fileURLToPath(new URL('./ans_order.md', import.meta.url));

export default defineConfig({
  plugins: [
    {
      name: 'face-api',
      configureServer(server) {
        server.middlewares.use(createFaceApi(faceDir, ansOrderPath));
      },
    },
  ],
  build: {
    rollupOptions: {
      input: { main: 'index.html', manage: 'manage.html', rules: 'rules.html' },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
});
