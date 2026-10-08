import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";
import fs from "fs-extra";

// 复制额外静态资源（样式与最新图标）
function copyStaticAssets() {
  return {
    name: "copy-static-assets",
    writeBundle() {
      // 确保目标目录存在
      fs.ensureDirSync("dist/src/content");
      // 复制CSS文件
      fs.copyFileSync("src/content/styles.css", "dist/src/content/styles.css");

      // 确保 public/icons 完整同步到 dist/icons 和 dist/public/icons
      if (fs.existsSync("public/icons")) {
        fs.ensureDirSync("dist/icons");
        fs.copySync("public/icons", "dist/icons", { overwrite: true });
        fs.ensureDirSync("dist/public/icons");
        fs.copySync("public/icons", "dist/public/icons", { overwrite: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [vue(), crx({ manifest }), copyStaticAssets()],
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
