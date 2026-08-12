import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pagesRoot = fileURLToPath(new URL(".", import.meta.url));
const sharedPublicAsset = (name: string) => readFileSync(fileURLToPath(new URL(`../public/${name}`, import.meta.url)));

export default defineConfig({
  root: pagesRoot,
  base: "./",
  publicDir: false,
  plugins: [
    react(),
    {
      name: "pages-public-assets",
      buildStart() {
        this.emitFile({ type: "asset", fileName: "favicon.svg", source: sharedPublicAsset("favicon.svg") });
        this.emitFile({ type: "asset", fileName: "og-china-cosmetics-phytochemistry.png", source: sharedPublicAsset("og-china-cosmetics-phytochemistry.png") });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(new URL("../dist-pages", import.meta.url)),
    emptyOutDir: true,
  },
});
