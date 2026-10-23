import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const envFrontend = loadEnv(mode, process.cwd(), '');
  const envRoot = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const googleClientId =
    envFrontend.VITE_GOOGLE_CLIENT_ID ||
    envRoot.VITE_GOOGLE_CLIENT_ID ||
    envRoot.GOOGLE_CLIENT_ID ||
    '344652884815-hm0a26h46md5ci83q0d3k7aa92m8mo35.apps.googleusercontent.com';

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleClientId)
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
