# 应用更新

版本与安装包统一放在 **GitHub Releases**（由 `.github/workflows/android-release.yml` 自动发布）。
App 内的「检查更新」读取 `https://api.github.com/repos/lzyszds/lzyRecipe/releases`。

> 国内网络访问 GitHub 不稳定，不开代理时可能提示检查失败或下载很慢。这是现实限制，App 内检查失败会静默忽略、不打扰使用；开着代理时一切正常。

## 用户看到的样子

- **首页**：启动约 2.5 秒后静默检查，有新版本时顶部出现「新版本 v0.3.0」提示条，点击打开弹窗。
- **弹窗**：显示更新内容，并提供两种方式（默认推荐免安装）：
  - **免安装更新**：下载 `web.zip`（前端整包，约几 MB），解压后立即生效，不需要装 APK；
  - **安装包更新**：下载完整 APK，安卓端自动交给系统安装器。涉及原生能力变化时用这个。
- **设置 → 关于**：显示当前版本，可随时点「检查更新」。

## 发布一个新版本的完整流程

1. 升级版本号（会同时改 package.json、tauri.conf.json、Cargo.toml、Android 版本号）：

   ```bash
   npm run android:build -- --bump=patch
   ```

   只想升版本不打包时，也可以手动同步修改上述文件，然后运行：

   ```bash
   node scripts/check-version-sync.mjs
   ```

2. 提交并推送：

   ```bash
   git add -A && git commit -m "chore: 发布 v0.3.0" && git push
   ```

3. 打 tag 并推送（tag 必须是 `萌厨食光-v<版本号>`，与 package.json 完全一致）：

   ```bash
   git tag 萌厨食光-v0.3.0 && git push origin 萌厨食光-v0.3.0
   ```

4. GitHub Actions 会自动构建并发布 Release；App 下次启动就能看到更新。

> 也可以在 GitHub → Actions → Android Release → Run workflow 手动输入 tag 发布。

## 首次配置

### 1. 配置签名（必做，否则装不上）

APK 必须用**同一个签名**覆盖安装，否则安卓会报「应用未安装」。仓库里不保存签名文件，改为放进 GitHub Secrets：

| Secret | 说明 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | 签名文件转成的 Base64 |
| `ANDROID_KEYSTORE_PASSWORD` | 密钥库口令 |
| `ANDROID_KEY_ALIAS` | 别名 |
| `ANDROID_KEY_PASSWORD` | 别名口令 |

生成 Base64（在项目根目录执行）：

```bash
base64 -w0 lzyrecipe.keystore > keystore.b64
```

Windows PowerShell 用：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("lzyrecipe.keystore")) | Set-Content keystore.b64
```

把 `keystore.b64` 的内容粘贴到 `ANDROID_KEYSTORE_BASE64`。本地口令放在**不进仓库**的 `keystore.properties`：

```
storePassword=lzyrecipe123
keyAlias=lzyrecipe
keyPassword=lzyrecipe123
```

（`build.gradle.kts` 读取它；缺失时 GitHub Actions 用 Secrets 替换文件中的占位符。）

### 2. 公开仓库 / Actions 额度

- 公开仓库：Actions 与 Release 资源都免费。
- 私有仓库：Actions 有免费额度，且 Release 附件下载需要登录 —— App 内直接下载会失败。私有仓库必须公开，或改用其它文件托管。

## 实现说明

- 版本号在 `package.json`，构建时注入为 `__APP_VERSION__`；提交短哈希注入为 `__APP_BUILD_ID__`。
- 本地开发时若版本号与线上相同，会用 Release 说明里的 `build-id:` 与当前提交比较，避免「只改了代码就提示更新」。
- 安卓端优先交由系统下载器下载（`window.AndroidInterface.startDownload`，存在时），否则下载到内存后走原生 `install_apk` 命令。
- 安装包命名：`萌厨食光-<版本>-arm64-release.apk`，与本地 `release/android/` 一致。

### 免安装更新（前端整包）原理

1. CI 把 `dist/` 打成 `web.zip`，与 APK 一起发布到同一个 Release。
2. App 下载后由原生命令 `apply_web_bundle` 解压到 `<应用数据目录>/webapp/<版本>/`，校验 `index.html`，并清理旧版本。
3. 桌面端下次启动时，`web_update::activate_on_startup` 在 `127.0.0.1` 随机端口起一个只读静态服务，主窗口导航到它；安卓端代码已具备解压与校验能力，**当前版本仍以安装包更新为准**（WebView 更换资源地址需要额外适配）。
4. 解压失败、缺少 `index.html`、目录穿越请求都会被拒绝；没有可用资源包时自动使用安装包内置的前端。
