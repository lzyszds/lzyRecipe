# 项目开发与 AI 交互规范

## 0. 版本发布与热更约定（每次用户要求"更新/发布"时必须遵守）

### 0.1 发布方式自动判定（动手前必须先做，并向用户说明判定结果与原因）
用户说"更新/发版/发布/上线"时，先检查本次改动，自动选择热更还是整包：

1. **原生变更检查**（满足任一即为原生变更）：
   - `package.json` / `bun.lock` 新增或升级了依赖（纯 JS 包如 zustand 除外）
   - `app.json` 改动了 plugins、permissions、icon、adaptiveIcon、splash、android.*、ios.*、runtimeVersion、versionCode
   - 改动了 metro.config.js 等构建配置，或 `mobile/assets/` 下被原生引用的图标/启动图
2. **判定**：
   - 仅 `mobile/src/**` 的 JS/TS 及其 require 的资源变更、无任何原生变更 → **热更**：`bunx eas-cli update --branch production --environment production --non-interactive --message "..."`；不动 versionCode / runtimeVersion / 版本号
   - 存在任一原生变更 → **整包**：按 0.3 流程 bump + build
   - 无法确定时按**整包**处理（保守策略）
3. 两者都有时：先整包 build，成功后补一条热更覆盖新 runtime 用户。

### 0.2 版本号语义（重要，防误判）
- `expo.version` / `versionCode` 是**编译期嵌入**的：热更**不会**改变用户手机上显示的版本号，这是正常现象，严禁试图用热更"更新版本号"
- 热更的版本语义放在 eas update 的 message 里（如 "v1.2.1 补充：xxx"）
- runtimeVersion 仅在新增/升级原生依赖时手动 bump；纯 JS 改动永远不动（当前值 "1.1.0"）

### 0.3 整包发版命令顺序
1. `node scripts/bump-version.mjs auto`（按提交自动判 patch/minor/major：bug 修复/样式/文案/性能 → patch；新功能/新模块/交互增强 → minor；破坏性改版 → major；用户未指定级别按此推断并说明依据）
2. `git add -A && git commit -m "chore(release): vX.Y.Z"` → 3. push
4. 有原生变更：`bunx eas-cli build --platform android --profile production --non-interactive --no-wait`
5. 可选：构建成功后补一条热更 `bunx eas-cli update --branch production --environment production --message "vX.Y.Z 摘要"`

## 1. Git Commit 提交规范（必须遵守）
- **语言要求**：本项目的所有 Git Commit 提交信息**必须全部使用中文**撰写，严禁生成英文提交信息。
- **提交规范**：遵循语义化前缀 + 清晰中文描述，格式推荐为：
  - `feat(模块)`: 新增功能
  - `fix(模块)`: 修复缺陷
  - `style(模块)`: 界面布局、样式或主题调整
  - `refactor(模块)`: 代码重构（不改变外部功能）
  - `perf(模块)`: 性能提升
  - `chore(模块)`: 构建流程、依赖管理或配置文件改动
- **多项改动建议**：在第一行摘要后空一行，使用列表清晰罗列本次提交的具体改动点。

## 2. 界面与代码设计准则
- **零原生 Emoji**：所有界面图标统一使用 `lucide-react-native` 组件，严禁在页面源码中直接使用系统 Emoji 字符。
- **色彩与主题**：严格使用 `@/constants/theme` 定义的 `Palette` 主题颜色变量。
- **顶部常驻**：各页面顶部导航与搜索栏固定在顶端，不可随页面主体滚动移出视口。
