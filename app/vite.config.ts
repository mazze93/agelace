/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In dev the API runs beside Vite (scripts/dev.sh up); in production the
// server serves app/dist itself, so these proxies only matter for dev.
const api = process.env["AGELACE_API"] ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": api, "/fonts": api },
  },
  test: { environment: "jsdom" },
});
