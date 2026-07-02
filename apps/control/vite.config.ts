import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  appType: "spa",
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: "./src/frontend/routes",
      generatedRouteTree: "./src/frontend/routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src/frontend") },
  },
  server: {
    proxy: { "/api": "http://localhost:8787" },
  },
});
