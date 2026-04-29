---
name: sgo-export
description: "导出发布级成品。根据写作类型自动选择输出格式（TXT/Markdown/LaTeX）。"
argument-hint: "[输出格式: txt|md|latex]（可选，默认根据类型自动选择）"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
model: haiku
---

# SGO 成品导出

将已经进入 final 状态的项目导出为发布级成品文件。

## 前置条件

- `.sgo/STATE.md` 必须存在
- `.sgo/chapters/` 或 `.sgo/drafts/` 下必须有已完成章节
- 默认只允许导出真正 final 状态的项目：
  - `finalization_status.decision: "PASS"`
  - `当前阶段: done`
  - `阶段状态` 为 `completed`、`archived` 或 `final`
  - 若 `.sgo/.continue-here.md` 存在，其当前阶段也应处于 `done` 终结态
- 只有用户明确要求导出草稿时，才允许带 `--allow-draft` 跳过 final gate

## 执行步骤

### 第一步：读取项目状态

1. 读取 `.sgo/STATE.md`、`.sgo/.continue-here.md`、`.sgo/methodology/profile.resolved.json`
2. 用 `.codex/sgo/scripts/export-project.js` 校验 final gate
3. 若 final gate 不成立，则拒绝导出；只有用户明确要求草稿导出时，才允许使用 `--allow-draft`

### 第二步：确定输出格式

根据用户输入 `$ARGUMENTS` 或类型默认值确定格式：

| 写作类型 | 默认格式 | 备选格式 |
|----------|----------|----------|
| web-novel | TXT | Markdown |
| short-story | Markdown | TXT |
| romance | TXT | Markdown |
| philosophical | Markdown | TXT |
| sci-fi | Markdown | TXT |
| detective | Markdown | TXT |
| tech-paper | LaTeX | Markdown |

用户可通过参数覆盖：`$sgo-export txt`、`$sgo-export markdown`、`$sgo-export latex`

### 第三步：合并章节内容

1. 优先读取 `.sgo/chapters/`，若为空再回退到 `.sgo/drafts/`
2. 按章节文件顺序合并成完整发布稿
3. 添加书名、作者信息（优先从 STATE / methodology / 已有输出文件推断）

### 第四步：格式化输出

**TXT 格式：**
- 纯文本，章节标题用全角分隔线标记
- 去除所有 Markdown 格式标记
- 始终输出到 `.sgo/output/{书名}.txt`
- 如果当前项目位于 `.sgo-archive/<slug>/` 中，还要额外发布到归档根目录：`.sgo-archive/<slug>/{书名}.txt`

**Markdown 格式：**
- 保留 Markdown 格式
- 章节标题用 `#` / `##` 层级
- 始终输出到 `.sgo/output/{书名}.md`
- 如果当前项目位于 `.sgo-archive/<slug>/` 中，还要额外发布到归档根目录：`.sgo-archive/<slug>/{书名}.md`

**LaTeX 格式（科技论文）：**
- 生成完整 LaTeX 文档结构（`\documentclass`、`\begin{document}` 等）
- 章节对应 `\section` / `\subsection`
- 引用生成 `\bibliography`
- 始终输出到 `.sgo/output/{书名}.tex`
- 如果当前项目位于 `.sgo-archive/<slug>/` 中，还要额外发布到归档根目录：`.sgo-archive/<slug>/{书名}.tex`

### 第五步：更新状态并输出摘要

运行：

`node .codex/sgo/scripts/export-project.js <projectDir> [format] [--allow-draft]`

脚本会：
- 强制校验 final gate
- 生成 `.sgo/output/` 下的发布稿
- 在归档上下文中额外生成归档根目录副本
- 更新 `.sgo/STATE.md` 的 `finalization_status.output_files`

```
=== 成品导出完成 ===
格式: [TXT / Markdown / LaTeX]
文件: [输出路径]
总字数: [N]字
章节数: [M]章
```

## 强制约束

- `.sgo/output/` 始终保留工作流内部输出
- 归档项目的可直接阅读成品必须额外放在每个归档文件夹根目录
- 没有 `PASS + done + completed|archived|final` 的项目不得导出正式成品
- LaTeX 格式必须生成可编译的完整文档
- STATE.md 更新必须先 Read 再 Write，保留已有字段值

## Codex Adapter Notes

- Treat `$ARGUMENTS` / `$1` as the text after the `$sgo-*` skill invocation.
- When this workflow says to spawn an SGO Agent, use Codex `spawn_agent(agent_type="sgo-...")` if subagents are explicitly available in the current environment; otherwise execute the same agent instructions directly.
- Keep all writing artifacts in `.sgo/`; `.codex/sgo/` only stores reusable framework files.
