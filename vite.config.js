import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative paths so the build works inside a Capacitor/Android WebView
  base: './',
  build: {
    outDir: 'dist',
  },
});
