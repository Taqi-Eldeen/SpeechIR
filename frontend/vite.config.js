import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/search":   { target: "http://localhost:8000", changeOrigin: true },
      "/upload":   { target: "http://localhost:8000", changeOrigin: true },
      "/status":   { target: "http://localhost:8000", changeOrigin: true },
      "/text":     { target: "http://localhost:8000", changeOrigin: true },
      "/evaluate": { target: "http://localhost:8000", changeOrigin: true },
      "/reindex":  { target: "http://localhost:8000", changeOrigin: true },
      // Audio streaming — forward Range header so byte-range seeking works
      "/media": {
        target: "http://localhost:8000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.headers["range"]) {
              proxyReq.setHeader("Range", req.headers["range"]);
            }
          });
        },
      },
    },
  },
});
