import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite dev server + preview. `/api` and `/files` are proxied to the
// dedicated backend (server/index.js) so the app in the live preview
// uses the real API without any cross-origin or localhost calls from
// the browser. Set API_TARGET to point elsewhere if you run the API
// on a different host.
const API_TARGET = process.env.API_TARGET || "http://0.0.0.0:8787";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    fs: { allow: ["/home/user"] },
    allowedHosts: true,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
      "/files": { target: API_TARGET, changeOrigin: true },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: true,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
      "/files": { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
  },
});
