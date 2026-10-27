import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base:process.env.GITHUB_ACTIONS==='true'?'/ritmo./':'/',
  plugins:[react()],
  build:{rollupOptions:{output:{manualChunks:{react:['react','react-dom','react-dom/client'],supabase:['@supabase/supabase-js']}}}},
});
