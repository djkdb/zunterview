import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const API_PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 8787);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": `http://localhost:${API_PORT}`,
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
  test: {
    include: ["src/**/*.test.ts", "shared/**/*.test.ts", "server/**/*.test.ts"],
  },
});
