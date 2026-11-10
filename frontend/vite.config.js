import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During local development the SPA calls `/api/...`, and Vite proxies those
// requests to the FastAPI server on port 8000. In production the frontend uses
// VITE_API_URL (e.g. https://stockflow-api.onrender.com) instead.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 3002,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 3002,
  },
});
