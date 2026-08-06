import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
<<<<<<< HEAD
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
=======

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
>>>>>>> f2cb66afc0104e3aa7bcb566d256b5fa9e791769
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
