import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET || 'http://localhost:8000';
  const proxy = {
    '^/api(?:/|$)': {
      target,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api(?=\/|$)/, '') || '/',
    },
    '^/openapi\\.json$': { target, changeOrigin: true },
  };

  return {
    plugins: [react(), tailwind()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { proxy },
    preview: { proxy },
  };
});
