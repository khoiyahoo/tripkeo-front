import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    // Chỉ dùng tsconfig của web, không quét mobile/tsconfig.json (extends gói expo)
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    VitePWA({
      // Tự cập nhật service worker khi deploy bản mới
      registerType: "autoUpdate",
      includeAssets: ["favicon.webp", "logo.webp", "apple-touch-icon.png"],
      manifest: {
        name: "Tripkeo - Your Travel Companion",
        short_name: "Tripkeo",
        description: "Lên kế hoạch và quản lý chuyến đi cùng bạn bè",
        lang: "vi",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#1f1d2b",
        background_color: "#1f1d2b",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Không cache font TTF/WOFF lớn (chỉ dùng cho xuất PDF trên web)
        globPatterns: ["**/*.{js,css,html,svg,png,webp,ico}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Các route API (Vercel functions) phải đi thẳng ra mạng, không trả về index.html
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
