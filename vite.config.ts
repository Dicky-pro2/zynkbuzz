import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/proxy/cocobase": {
        target: "https://api.cocobase.cc",
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        proxyTimeout: 60000,
        rewrite: (path) => path.replace(/^\/proxy\/cocobase/, ""),
      },
    },
  },
  preview: {
    port: 5173,
    proxy: {
      "/proxy/cocobase": {
        target: "https://api.cocobase.cc",
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        proxyTimeout: 60000,
        rewrite: (path) => path.replace(/^\/proxy\/cocobase/, ""),
      },
    },
  },
});
