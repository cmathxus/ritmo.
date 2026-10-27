import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pwa from './pwa-plugin.mjs';
export default defineConfig({
  base:process.env.GITHUB_ACTIONS==='true'?'/ritmo./':'/',
  plugins:[react(),pwa()],
  build:{rollupOptions:{output:{manualChunks:{react:['react','react-dom','react-dom/client'],supabase:['@supabase/supabase-js']}}}},
});
