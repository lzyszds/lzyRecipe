---
description: 项目 Git 提交中文规范与行为准则
globs: "*"
---

# Git 提交与代码规范

1. **Git Commit 必须为中文**：
   - 以后在本项目中执行任何 `git commit` 操作，提交信息（commit message）必须 100% 全部使用中文。
   - 严禁使用英文作为提交主题或描述。
   - 推荐格式：`feat(模块): 中文描述`、`fix(模块): 中文描述`、`style(模块): 中文描述` 等。

2. **UI 规范**：
   - 严禁在代码中出现原生表情包字符（Emoji），统一使用 `lucide-react-native` 图标库。
   - 所有页面顶部栏不可随页面滚动消失，保持固定常驻。
