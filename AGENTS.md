# 项目开发与 AI 交互规范

## 0. 版本发布与热更约定（每次用户要求"更新/发布"时必须遵守）
- **每次发版必须升级版本号**：先运行 `node scripts/bump-version.mjs auto`（按模块改动自动判断 patch/minor/major），脚本会同步更新 `expo.version` 与 `android.versionCode`。
- **级别判断**：bug 修复/样式/文案/性能 → `patch`；新功能/新模块/交互增强 → `minor`；破坏性改版/架构重做 → `major`。用户说"帮我更新"时未指定级别就按此推断，并在回复中说明判断依据。
- **runtimeVersion（固定 "1.0.0"）**：纯 JS 改动**永远不要动它**——动了已装用户就收不到热更。仅当新增/升级原生依赖时手动 bump 并重新 `eas build`。
- **发版命令顺序**：
  1. bump 脚本 → 2. `git add -A && git commit -m "chore(release): vX.Y.Z"` → 3. push → 4. `bunx eas-cli update --branch production --environment production --message "vX.Y.Z 摘要"`
- **重新打包**（仅原生变更时）：`bunx eas-cli build --platform android --profile production --non-interactive`

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
