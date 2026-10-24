# 食刻 CookMoment（lzyRecipe）

一款简洁优雅的现代美食生活与周膳管理应用（Expo + React Native + expo-router，TypeScript）。

## 仓库结构

本仓库是 **bun workspace**，仓库根只放工程配置与工具脚本，Expo 应用位于 `mobile/`。

```
lzyRecipe/                       ← 仓库根 = workspace 根
├── package.json                 workspace 声明 + 代理脚本（bun run start/lint/...）
├── bunfig.toml                  bun 安装策略（hoisted，避免 isolated 依赖解析问题）
├── bun.lock                     唯一的锁文件
├── scripts/                     封面生成 / 下载脚本（Node ESM）
│   └── covers-common.mjs        路径与读写工具（recipes.ts 读写、封面目录同步）
├── docs/                        补充文档（菜谱导入结构、图片托管、更新说明）
└── mobile/                      ← Expo 应用本体
    ├── app.json                 应用配置（CNG：原生工程由 prebuild 生成，不入库）
    ├── tsconfig.json            TS 配置，@/* → ./src/*
    ├── metro.config.js          Metro 配置（含 Web 端调试用反向代理）
    ├── eslint.config.js         ESLint Flat Config（eslint-config-expo）
    └── assets/
        └── images/              图标与启动图
    └── src/
        ├── app/                 路由（expo-router 文件式路由）
        │   ├── _layout.tsx      根布局（Stack）
        │   ├── (tabs)/          底部标签页（首页/菜谱/便当盒/我的）
        │   ├── +not-found.tsx   未匹配路由兜底页
        │   ├── recipe/[id].tsx  菜谱详情
        │   ├── favorites.tsx / search.tsx / notes.tsx
        ├── components/          UI 组件
        ├── constants/           主题与设计常量
        ├── data/                内置静态数据（recipes.ts / 分类）
        ├── hooks/               自定义 Hook
        ├── lib/                 业务逻辑（云同步、AI、封面、上传…）
        ├── store/               zustand 状态
        └── types/               类型定义（Recipe 等）
```

## 常用命令

统一在仓库根执行（脚本会转发到 `mobile/`）：

```bash
bun install            # 安装依赖（根目录一次性装好，mobile/node_modules 不再单独存在）

bun run start          # 启动 Expo 开发服务
bun run android        # 在 Android 模拟器/真机上运行（expo run:android）
bun run ios            # 在 iOS 模拟器上运行
bun run web            # 浏览器里调试

bun run lint           # ESLint（eslint-config-expo，SDK 58 规则集）
bun run typecheck      # tsc --noEmit
bun run doctor         # expo-doctor 体检

bun run covers         # 生成莫兰迪风格 SVG 占位封面到 public/covers/
bun run covers:photos  # 从百度图片搜索下载真实封面到 public/covers/（需联网）
```

## 封面说明

项目已全面移除随 App 打包的本地封面文件，避免膨胀安装包体积。菜谱封面统一采用在线 HTTP(S) 图片或优雅的莫兰迪色菜品占位图；支持在 App 内在线搜图更换与一键补全封面。

## 文档索引

- [菜谱导入数据结构](docs/recipe-import.md) —— 外部菜谱导入的 JSON 结构与字段规则
- [服务器图片上传与静态托管](docs/server-image-storage.md)
- [应用更新说明](docs/updates.md)
