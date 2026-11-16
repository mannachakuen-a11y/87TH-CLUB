import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  // `npm run build:static` makes a relative-path build that can be hosted from any folder
  base: process.env.VITE_STATIC ? "./" : "/",
  server: { host: "0.0.0.0", port: 5180, allowedHosts: true },
  preview: { host: "0.0.0.0", port: 4180, allowedHosts: true },
});
