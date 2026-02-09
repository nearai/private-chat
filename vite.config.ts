import path from "node:path";
import { execSync } from "node:child_process";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, type PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";

import svgr from "vite-plugin-svgr";

// Get git commit hash at build time
function getGitCommitHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

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
        "icons/favicon.svg",
      ],
      workbox: {
        disableDevLogs: false,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        navigateFallback: "/",
        navigateFallbackDenylist: [
          /^\/v1\//,
          /^\/docs/,
          /^\/health$/,
          /^\/api-docs(\/|$)/,
        ],
        globPatterns: ["**/*.{html,js,css,ico,png,jpg,svg,woff2,woff,ttf,webp}"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin, request }) => {
              const isApi =
                url.pathname.startsWith("/v1/") ||
                url.pathname.startsWith("/docs") ||
                url.pathname.startsWith("/health") ||
                url.pathname.startsWith("/api-docs");
              return sameOrigin && !isApi && request.mode === "navigate";
            },
            handler: "NetworkFirst",
            options: {
              cacheName: "html-pages",
              expiration: {
                maxAgeSeconds: 600, // 10 minutes
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) => {
              const isApi =
                url.pathname.startsWith("/v1/") ||
                url.pathname.startsWith("/docs") ||
                url.pathname.startsWith("/health") ||
                url.pathname.startsWith("/api-docs");
              return (
                sameOrigin &&
                !isApi &&
                (url.pathname.endsWith(".js") ||
                  url.pathname.endsWith(".css") ||
                  url.pathname.endsWith(".png") ||
                  url.pathname.endsWith(".svg") ||
                  url.pathname.endsWith(".jpg") ||
                  url.pathname.endsWith(".webp") ||
                  url.pathname.endsWith(".woff") ||
                  url.pathname.endsWith(".woff2"))
              );
            },
            handler: "CacheFirst",
            options: {
              cacheName: "static-resources",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 604800, // 7 days
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
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
  define: {
    "import.meta.env.VITE_GIT_COMMIT_HASH": JSON.stringify(getGitCommitHash()),
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
