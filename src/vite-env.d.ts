/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
/** 编译时的 git 提交短哈希，用于本地开发时刷新检查更新（避免每次都下载安装包） */
declare const __APP_BUILD_ID__: string;
