import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, type PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";

import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon.ico", "icons/apple-touch-icon.png"],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
      manifest: {
        name: "NEAR AI Private Chat",
        short_name: "Private Chat",
        description: "NEAR AI Private Chat",
        theme_color: "#171717",
        background_color: "#171717",
        display: "standalone",
        start_url: "/",
        orientation: "portrait",
        icons: [
          {
            src: "icons/favicon-96x96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "icons/favicon.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/favicon.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }) as PluginOption,
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    sourcemap: true,
  },
});
