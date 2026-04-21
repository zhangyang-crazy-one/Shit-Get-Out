---
name: sgo-write
description: "编写指定章节。根据大纲和创作宪法逐章生成高质量文本。"
argument-hint: "[章节编号或描述，如 'ch-3' 或 '下一章']"
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - Agent
model: inherit
---

# SGO 章节写作

根据大纲和创作宪法，逐章生成高质量文本。

## 前置条件

- `.sgo/STATE.md` 必须存在且当前阶段为 `writing` 或 `outline`（已通过验证）
- `.sgo/constitution/constitution.md` 必须存在且状态为 `locked`
- `.sgo/outline/outline.md` 必须存在

## 执行步骤

### 第一步：读取项目状态

1. 读取 `.sgo/STATE.md` 获取当前阶段、已完成章节列表、写作类型
2. 如果当前阶段不是 `writing`，提示用户需要先完成前序阶段

### 第二步：确定目标章节

解析用户输入 `$ARGUMENTS`：
- 如果是章节编号（如 `ch-3`、`3`）：定位到该章节的大纲段落
- 如果是 `下一章` 或为空：定位到 STATE.md 中 `当前章节` 指示的下一个未完成章节
- 如果是大纲描述（如 "主角觉醒"）：在 outline.md 中搜索匹配的章节

### 第三步：使用 sgo-writer Agent 执行写作

Spawn `sgo-writer` Agent，传递以下上下文：
- 目标章节编号和大纲段落
- 类型 slug（从 STATE.md 读取）
- 写作模式（新章节 / 续写）

Agent 将自动执行：
- 上下文组装（宪法 + 大纲 + 已完成章节 + 类型配置）
- 风格锚定（参考已完成章节的文风）
- 情感弧线落地
- 叙事冲突生成
- 章节写作
- 质量自检

### 第四步：更新项目状态

写作完成后更新 `.sgo/STATE.md`（先 Read 整个文件，修改后 Write，保留已有字段）：
- 将新章节添加到 `completed_chapters` 摘要链
- 更新 `当前章节` 为下一个未完成章节
- 更新 `整体进度` 百分比
- 更新 `上次活动` 时间
- 如果是第一章，设置 `style_locked_chapter` 和 `style_anchor_snippet`

### 第五步：输出结果摘要

```
=== 章节写作完成 ===
章节: [章节编号] [章节标题]
字数: [N]字
伏笔铺设: [N]个
伏笔回收: [N]个
整体进度: [M/N] = [P%]
下一步: $sgo-write [下一章节] 或 $sgo-review (终审)
```

## 强制约束

- 章节必须写入 `.sgo/drafts/chapter-N.md`（草稿），质量门通过后移至 `.sgo/chapters/chapter-N.md`
- 写作前必须完成强制前置（读宪法、读大纲、读类型配置）
- STATE.md 更新必须先 Read 再 Write，保留已有字段值

## Codex Adapter Notes

- Treat `$ARGUMENTS` / `$1` as the text after the `$sgo-*` skill invocation.
- When this workflow says to spawn an SGO Agent, use Codex `spawn_agent(agent_type="sgo-...")` if subagents are explicitly available in the current environment; otherwise execute the same agent instructions directly.
- Keep all writing artifacts in `.sgo/`; `.codex/sgo/` only stores reusable framework files.
