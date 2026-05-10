import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/search": "http://localhost:8000",
      "/upload": "http://localhost:8000",
      "/status": "http://localhost:8000",
      "/text": "http://localhost:8000",
      "/evaluate": "http://localhost:8000",
      "/media": "http://localhost:8000",
    },
  },
});
