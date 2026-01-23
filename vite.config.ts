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
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon-180x180.png",
        "pwa-64x64.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "maskable-icon-512x512.png",
      ],
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^\/(v1|docs|auth)\//,
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            urlPattern: /^\/(v1|docs|auth)\//,
            handler: 'NetworkOnly',
            method: 'POST',
          },
          {
            urlPattern: /^\/(v1|docs|auth)\//,
            handler: 'NetworkOnly',
            method: 'PUT',
          },
          {
            urlPattern: /^\/(v1|docs|auth)\//,
            handler: 'NetworkOnly',
            method: 'DELETE',
          },
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/(v1|docs|auth)\//],
      },
      manifest: {
        name: "NEAR AI",
        short_name: "NEAR AI",
        description: "NEAR AI Private Chat",
        theme_color: "#171717",
        background_color: "#171717",
        display: "standalone",
        start_url: "/",
        orientation: "portrait",
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "apple-touch-icon-180x180.png",
            sizes: "180x180",
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
    rollupOptions: {
      external: [
        "@tauri-apps/plugin-notification",
        "@tauri-apps/plugin-updater",
        "@tauri-apps/plugin-process",
      ],
    },
  },
});
