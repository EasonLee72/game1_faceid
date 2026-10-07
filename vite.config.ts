import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { createFaceApi } from './server/faceApi.ts';

const faceDir = fileURLToPath(new URL('./face', import.meta.url));

export default defineConfig({
  plugins: [
    {
      name: 'face-api',
      configureServer(server) {
        server.middlewares.use(createFaceApi(faceDir));
      },
    },
  ],
  build: {
    rollupOptions: {
      input: { main: 'index.html', manage: 'manage.html' },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
});
