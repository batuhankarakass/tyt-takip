import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build`: kurulabilir PWA (dist/).
// `npm run build:tek`: tek HTML dosyası (önizleme/paylaşım için, çevrimdışı önbellek yok).
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [
    react(),
    mode === "tek"
      ? viteSingleFile()
      : VitePWA({
          registerType: "autoUpdate",
          includeAssets: ["favicon.svg", "apple-touch-icon.png"],
          manifest: {
            name: "TYT Takip",
            short_name: "TYT Takip",
            description: "Konu konu soru çöz, kontrol testiyle kapat, bir sonrakine geç.",
            lang: "tr",
            start_url: "./",
            scope: "./",
            display: "standalone",
            background_color: "#f6f5f2",
            theme_color: "#1b1a18",
            icons: [
              { src: "icon-192.png", sizes: "192x192", type: "image/png" },
              { src: "icon-512.png", sizes: "512x512", type: "image/png" },
              { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
          },
        }),
  ],
  build: mode === "tek" ? { outDir: "dist-tek" } : undefined,
}));
