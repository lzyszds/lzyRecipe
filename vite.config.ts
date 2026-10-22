import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const appVersion = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
).version;

// 当前源码对应的提交哈希：本地 dev 用它和最新 Release 比较，避免只改了代码就以为有更新
const appBuildId = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "dev";
  }
})();

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_BUILD_ID__: JSON.stringify(appBuildId),
  },
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
})
