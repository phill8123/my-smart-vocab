import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Vercel의 System Environment Variable(process.env.API_KEY)을 우선적으로 사용하고,
      // 로컬 개발 환경에서는 .env 파일의 값(env.API_KEY)을 사용합니다.
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY)
    }
  };
});