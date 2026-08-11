import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pagesRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: pagesRoot,
  base: "./",
  publicDir: fileURLToPath(new URL("../public", import.meta.url)),
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL("../dist-pages", import.meta.url)),
    emptyOutDir: true,
  },
});
