---
name: sgo-init
description: 初始化 SGO 写作项目。创建 .sgo/ 目录体系、初始状态文件和制品模板。
argument-hint: "[主题描述]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

# SGO 初始化

初始化 SGO（Shit Get Out）写作项目。

## 执行步骤

1. **检测已有项目**：检查 `.sgo/STATE.md` 是否存在。如果存在，提示用户项目已初始化，显示当前状态，退出。
2. **创建目录体系**：创建 `.sgo/` 下所有子目录（research/、constitution/、outline/、drafts/、chapters/、validation/、tracking/、output/、memory/、authorship/）
3. **生成初始 STATE.md**：基于模板创建 `.sgo/STATE.md`，初始状态为"项目已初始化，等待输入主题"
4. **生成 .continue-here.md**：创建初始断点文件，标记为 not_started
5. **初始化 tracking 文件**：创建 foreshadow-ledger.md、character-index.md、timeline.md
6. **初始化长期记忆与作者控制制品**：创建 `.sgo/memory/long-term-memory.md` 和 `.sgo/authorship/control.md`
7. **复制制品模板**：确保 .codex/sgo/templates/ 下的模板文件可被后续阶段引用
7. **确认成功**：输出初始化结果摘要

## 参数

`$ARGUMENTS` 或 `$1`：可选的主题描述。如果提供，在 STATE.md 中记录主题。

## 前置条件

- 当前目录应为项目根目录（包含 CLAUDE.md）
- `.sgo/` 不应已存在（防止重复初始化）

## 后续动作

初始化完成后，用户可使用 `$sgo-status` 查看项目状态，先用 `$sgo-discuss` 澄清方向，或直接开始写作流程。

## Codex Adapter Notes

- Treat `$ARGUMENTS` / `$1` as the text after the `$sgo-*` skill invocation.
- When this workflow says to spawn an SGO Agent, use Codex `spawn_agent(agent_type="sgo-...")` if subagents are explicitly available in the current environment; otherwise execute the same agent instructions directly.
- Keep all writing artifacts in `.sgo/`; `.codex/sgo/` only stores reusable framework files.
