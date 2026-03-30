import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@tsparticles")) return "tsparticles";
          if (id.includes("motion")) return "motion";
          if (id.includes("react-router")) return "router";
          if (id.includes("zod")) return "zod";
          if (id.includes("react-dom")) return "react-dom";
          if (id.includes("/react/")) return "react";
        },
      },
    },
  },
});
