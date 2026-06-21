import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths ('./') work for BOTH:
  //  - GitHub Pages (served from /<repo-name>/)
  //  - Capacitor / Android WebView (served from file://)
  // If you ever switch to a custom domain at the root, you can use '/' instead.
  base: './',
  build: {
    outDir: 'dist',
  },
});
