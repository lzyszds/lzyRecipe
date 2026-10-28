# 应用内整包更新（APK 更新）服务端说明

App 内置了「检查更新 → 应用内下载 APK → 自动拉起安装器」的完整链路。
服务端只需提供一个**版本清单 JSON** 和 **APK 文件托管**。

## 1. 版本清单

在同步服务器（默认 `https://sync.lzyszds.cn`）上托管一个 JSON 文件：

```
https://sync.lzyszds.cn/app-version.json
```

内容格式：

```json
{
  "versionCode": 10301,
  "versionName": "1.3.1",
  "apkUrl": "https://sync.lzyszds.cn/apk/shike-v1.3.1.apk",
  "notes": "1. 修复收藏红心不高亮\n2. 优化启动屏",
  "force": false
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `versionCode` | ✅ | 原生包版本号（数字），App 用它与本机 `android.versionCode` 比较 |
| `versionName` | ✅ | 展示用版本名，如 `"1.3.1"` |
| `apkUrl` | ✅ | 新 APK 的直链下载地址（https） |
| `notes` | ❌ | 更新说明，多行用 `\n`，展示在更新弹窗里 |
| `force` | ❌ | 预留：是否强制更新 |

## 2. 发新版 APK 的操作流程

1. 本地发版：`node scripts/bump-version.mjs auto`（自动升 `expo.version` + `android.versionCode`）
2. 构建 APK：`bunx eas-cli build --platform android --profile production`（或 `bun run build:android`）
3. 构建完成后从 EAS 下载 APK，上传到服务器（如 `https://sync.lzyszds.cn/apk/shike-vX.Y.Z.apk`）
4. **更新 `app-version.json`**：把 `versionCode`/`versionName`/`apkUrl` 改成新包的信息
5. 完成 —— 所有已安装用户下次打开 App 时会收到更新提示

## 3. App 侧行为

- **冷启动自动检查**：开屏初始化流程的最后一步会静默请求清单；发现新版本 → 全局更新弹窗
- **手动检查**：「我的 → 检查更新」菜单，随时可查
- **下载安装**：应用内下载 APK（带进度条）→ 自动拉起系统安装器；首次会引导用户开启"允许安装未知应用"
- **版本比较**：只用 `versionCode` 数字比较，热更（EAS Update）不影响此判断——热更由 expo-updates 静默管理，与本机制互不干扰

## 4. Nginx 提示

APK 与清单走静态托管即可（与 `/covers/` 同理）：

```nginx
location /apk/ {
    alias /srv/shike/apk/;
    types { application/vnd.android.package-archive apk; }
}
location = /app-version.json {
    alias /srv/shike/app-version.json;
    add_header Cache-Control "no-cache";  # 清单不要缓存，保证即时生效
}
```
