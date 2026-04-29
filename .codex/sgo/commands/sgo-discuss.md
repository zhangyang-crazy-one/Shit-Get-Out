---
name: sgo-discuss
description: "在正式执行 `$sgo-start`、`$sgo-write` 或重构既有制品前，先做一次结构化讨论与澄清。"
argument-hint: "[主题、疑问或想讨论的改动方向]"
allowed-tools:
  - Read
  - Glob
  - Grep
model: inherit
---

# SGO 讨论模式

在真正启动或推进写作前，先把类型、规模、主冲突、结构选择、锁定项与可变项讲清楚。

## 适用场景

- 用户还不想直接进入 `$sgo-start`
- 用户要重定稿、改方向、改世界观、改结构
- 用户想先讨论当前 `.sgo` 产物再决定是否改写
- 用户只给了模糊题材，需要先做问题澄清

## 执行步骤

### 第一步：判断项目状态

1. 若 `.sgo/STATE.md` 不存在：
   - 视为启动前讨论
   - 基于用户输入识别候选类型、规模、核心冲突与风险
2. 若 `.sgo/STATE.md` 存在：
   - 读取 `.sgo/STATE.md`、`.sgo/.continue-here.md`
   - 按需读取 `.sgo/research/report.md`、`.sgo/constitution/constitution.md`、`.sgo/outline/outline.md`
   - 区分当前哪些决策已锁定，哪些仍可讨论

### 第二步：产出讨论结论

围绕用户输入，给出：

- 当前理解的用户目标
- 已锁定约束
- 仍有歧义或风险的点
- 推荐方案与备选方案
- 若继续执行，最合适的下一条命令

### 第三步：交互方式

- 默认不直接改文件
- 默认不自动推进到 research / writing / review
- 若项目尚未初始化，讨论完成后建议用户执行 `$sgo-start`
- 若项目已在进行中，讨论完成后建议用户执行最贴切的下一步命令，如：
  - `$sgo-start ...`
  - `$sgo-continue`
  - `$sgo-write 下一章`
  - `$sgo-review`

## 输出格式

```
=== SGO 讨论结论 ===
当前目标: ...
已锁定: ...
待决定: ...
推荐方向: ...
下一步命令: $sgo-...
```

## 强制约束

- 讨论阶段不自动改写 locked 宪法或 locked 大纲
- 若用户要推翻 locked 决策，必须先明确指出影响范围
- 讨论结论应明确区分“已存在于 `.sgo` 的事实”和“本轮建议”

## Codex Adapter Notes

- Treat `$ARGUMENTS` / `$1` as the text after the `$sgo-*` skill invocation.
- When this workflow says to spawn an SGO Agent, use Codex `spawn_agent(agent_type="sgo-...")` if subagents are explicitly available in the current environment; otherwise execute the same agent instructions directly.
- Keep all writing artifacts in `.sgo/`; `.codex/sgo/` only stores reusable framework files.
