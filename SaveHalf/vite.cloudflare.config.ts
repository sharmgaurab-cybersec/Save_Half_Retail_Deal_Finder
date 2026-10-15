import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(process.cwd(), 'static'),
  plugins: [react()],
  // Existing Next/Tailwind config is not used by this static build.
  css: { postcss: { plugins: [] } },
  build: { outDir: resolve(process.cwd(), 'dist-cloudflare'), emptyOutDir: true },
});
