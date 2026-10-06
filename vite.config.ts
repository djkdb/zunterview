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
    // Question banks (roles + companies) are fetched on demand from /data; the app chunk holds only the taxonomy index.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    include: ["src/**/*.test.ts", "shared/**/*.test.ts", "server/**/*.test.ts", "scripts/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
