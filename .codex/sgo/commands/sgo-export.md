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

将已完成的章节导出为发布级成品文件。

## 前置条件

- `.sgo/STATE.md` 必须存在
- `.sgo/chapters/` 下必须有已完成的章节文件
- 终审已通过（`finalization_status.decision: "PASS"`）或用户明确要求导出草稿

## 执行步骤

### 第一步：读取项目状态

1. 读取 `.sgo/STATE.md` 获取写作类型、终审状态、章节列表
2. 如果终审未通过，警告用户并确认是否继续导出草稿

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

用户可通过参数覆盖：`$sgo-export txt` 或 `$sgo-export latex`

### 第三步：合并章节内容

1. 按 STATE.md 中 `completed_chapters` 的顺序读取所有章节文件
2. 合并为一个完整文件，章节之间插入分隔标记
3. 生成目录（如果章节数 > 3）
4. 添加书名、作者信息（从 STATE.md 读取项目信息）

### 第四步：格式化输出

**TXT 格式：**
- 纯文本，章节标题用全角分隔线标记
- 去除所有 Markdown 格式标记
- 输出到 `.sgo/output/{书名}.txt`

**Markdown 格式：**
- 保留 Markdown 格式
- 章节标题用 `#` / `##` 层级
- 输出到 `.sgo/output/{书名}.md`

**LaTeX 格式（科技论文）：**
- 生成完整 LaTeX 文档结构（`\documentclass`、`\begin{document}` 等）
- 章节对应 `\section` / `\subsection`
- 引用生成 `\bibliography`
- 输出到 `.sgo/output/{书名}.tex`

### 第五步：更新状态并输出摘要

更新 `.sgo/STATE.md`（先 Read 整个文件，修改后 Write，保留已有字段）：
- `finalization_status.output_files: [文件路径列表]`

```
=== 成品导出完成 ===
格式: [TXT / Markdown / LaTeX]
文件: [输出路径]
总字数: [N]字
章节数: [M]章
```

## 强制约束

- 输出文件必须写入 `.sgo/output/` 目录
- 章节合并顺序必须与 `completed_chapters` 顺序一致
- LaTeX 格式必须生成可编译的完整文档
- STATE.md 更新必须先 Read 再 Write，保留已有字段值

## Codex Adapter Notes

- Treat `$ARGUMENTS` / `$1` as the text after the `$sgo-*` skill invocation.
- When this workflow says to spawn an SGO Agent, use Codex `spawn_agent(agent_type="sgo-...")` if subagents are explicitly available in the current environment; otherwise execute the same agent instructions directly.
- Keep all writing artifacts in `.sgo/`; `.codex/sgo/` only stores reusable framework files.
