---
name: sgo-doctor
description: "SGO 系统健康诊断。一键检查所有 Hook、Agent、Command 和制品的完整性。"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
model: haiku
---

# SGO 系统诊断

一键检查 SGO 写作系统的健康状态，验证所有组件是否正常工作。

## 执行步骤

### 第一步：检查基础结构

验证 `.sgo/` 目录体系完整性：

| 目录 | 必须存在 | 说明 |
|------|----------|------|
| `.sgo/` | 是 | 项目根目录 |
| `.sgo/STATE.md` | 是 | 状态文件 |
| `.sgo/.continue-here.md` | 是 | 断点文件 |
| `.sgo/research/` | 是 | 调研目录 |
| `.sgo/constitution/` | 是 | 宪法目录 |
| `.sgo/outline/` | 是 | 大纲目录 |
| `.sgo/drafts/` | 是 | 草稿目录 |
| `.sgo/chapters/` | 是 | 章节目录 |
| `.sgo/validation/` | 是 | 验证目录 |
| `.sgo/tracking/` | 是 | 跟踪目录 |
| `.sgo/output/` | 是 | 输出目录 |

### 第二步：检查 Hooks 完整性

验证 `.claude/sgo/hooks/` 下的所有 Hook 脚本：

| Hook | 检查项 |
|------|--------|
| research-entry.js | 文件存在、可执行 |
| research-exit.js | 文件存在、可执行 |
| constitution-entry.js | 文件存在、可执行 |
| constitution-exit.js | 文件存在、可执行 |
| outline-entry.js | 文件存在、可执行 |
| outline-exit.js | 文件存在、可执行 |
| validation-entry.js | 文件存在、可执行 |
| validation-exit.js | 文件存在、可执行 |
| writing-entry.js | 文件存在、可执行 |
| writing-exit.js | 文件存在、可执行 |
| finalize-entry.js | 文件存在、可执行 |
| finalize-exit.js | 文件存在、可执行 |
| quality-gate.js | 文件存在、可执行 |
| session-start.js | 文件存在、可执行 |

对每个 Hook 执行 `node --check {path}` 验证语法正确性。

### 第三步：检查 Agent 定义

验证 `.claude/agents/` 下的 SGO Agent 文件：

| Agent | 检查项 |
|-------|--------|
| sgo-researcher.md | 文件存在、有 frontmatter、有 tools 字段 |
| sgo-designer.md | 文件存在、有 frontmatter |
| sgo-constitutioner.md | 文件存在、有 frontmatter |
| sgo-outliner.md | 文件存在、有 frontmatter |
| sgo-validator.md | 文件存在、有 frontmatter |
| sgo-writer.md | 文件存在、有 frontmatter |
| sgo-finalizer.md | 文件存在、有 frontmatter |
| sgo-tracker.md | 文件存在、有 frontmatter |

### 第四步：检查 Commands 可发现性

验证 `.claude/commands/` 下的 SGO 命令：

| Command | 检查项 |
|---------|--------|
| sgo-init.md | 符号链接有效、目标文件存在 |
| sgo-start.md | 符号链接有效、目标文件存在 |
| sgo-status.md | 符号链接有效、目标文件存在 |
| sgo-write.md | 符号链接有效、目标文件存在 |
| sgo-continue.md | 符号链接有效、目标文件存在 |
| sgo-validate.md | 符号链接有效、目标文件存在 |
| sgo-review.md | 符号链接有效、目标文件存在 |
| sgo-export.md | 符号链接有效、目标文件存在 |
| sgo-doctor.md | 符号链接有效、目标文件存在 |

### 第五步：检查类型配置

验证 `.claude/sgo/config/` 下的 7 种类型配置：
- web-novel, short-story, detective, romance, philosophical, sci-fi, tech-paper
- 每个配置必须有 `quality_rules`、`template_variants`、`iron_rule_categories`、`writing_flow` 字段

### 第六步：检查 settings.json Hook 注册

读取 `.claude/settings.json` 验证 Hook 事件注册完整。

### 第七步：输出诊断报告

```
=== SGO 系统诊断 ===
总体状态: HEALTHY / DEGRADED / BROKEN

基础结构: [PASS/FAIL] ([N/M] 通过)
Hooks: [PASS/FAIL] ([N/M] 通过, [X] 语法错误)
Agents: [PASS/FAIL] ([N/M] 通过)
Commands: [PASS/FAIL] ([N/M] 通过)
类型配置: [PASS/FAIL] ([7/7] 通过)
Hook 注册: [PASS/FAIL]

[失败项详情]

修复建议:
1. [建议1]
2. [建议2]
```

## 修复建议

- 缺失目录：运行 `/sgo-init` 重新创建
- Hook 语法错误：检查对应 .js 文件
- 符号链接失效：重新创建 `ln -sf ../sgo/commands/sgo-xxx.md .claude/commands/sgo-xxx.md`
- 类型配置缺失：检查 `.claude/sgo/config/` 目录
