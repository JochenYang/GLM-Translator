import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";
import fs from "fs-extra";

// 更新为复制新的 content 目录下的 CSS 文件
function copyContentCSS() {
  return {
    name: "copy-content-css",
    writeBundle() {
      // 确保目标目录存在
      fs.ensureDirSync("dist/src/content");
      // 复制CSS文件
      fs.copyFileSync("src/content/styles.css", "dist/src/content/styles.css");
    },
  };
}

export default defineConfig({
  plugins: [vue(), crx({ manifest }), copyContentCSS()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        options: resolve(__dirname, "src/options/index.html"),
        background: resolve(__dirname, "src/background/index.js"),
        content: resolve(__dirname, "src/content/content.js"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "content/styles.css") {
            // 更新路径
            return "assets/content/styles.css"; // 更新路径
          }
          return "assets/[name][extname]";
        },
      },
    },
  },
});
