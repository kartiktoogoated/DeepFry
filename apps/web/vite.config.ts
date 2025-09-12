import { defineConfig, loadEnv } from 'vite';
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');

  // Provide a default if VITE_API_BASE_URL is not set
  process.env.VITE_API_BASE_URL = env.VITE_API_BASE_URL || 'https://api.deepfry.tech';

  return {
  plugins: [react()],

  resolve: {
    alias: {
      // your existing workspace-ui alias
      "@repo/ui": path.resolve(__dirname, "../../packages/ui/src"),
      // add this so "@/foo" → apps/web/src/foo
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    hmr: { clientPort: 443 },
    cors: true,

    proxy: {
      "/api": {
          target: process.env.VITE_API_BASE_URL,
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
  };
});

// If you see 'undefined' for VITE_API_BASE_URL in your app, create a .env file in apps/web with:
// VITE_API_BASE_URL=https://api.deepfry.tech
