---
name: sgo-validate
description: "运行写作前验证。对照创作宪法检查大纲合规性，支持3次迭代修订循环。"
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Agent
model: inherit
---

# SGO 验证

对照创作宪法验证大纲/章节的合规性，确保铁律被遵守。

## 前置条件

- `.sgo/STATE.md` 必须存在
- `.sgo/constitution/constitution.md` 必须存在且状态为 `locked`
- 至少有一份待验证的制品（大纲或章节）

## 执行步骤

### 第一步：确定验证目标

读取 `.sgo/STATE.md` 判断当前阶段：
- 如果 `当前阶段` 为 `outline` 或 `validation`：验证大纲合规性
- 如果 `当前阶段` 为 `writing`：验证最新章节质量
- 如果 `当前阶段` 为其他：提示用户当前阶段无需验证

### 第二步：读取验证所需制品

1. 读取 `.sgo/constitution/constitution.md` — 创作宪法（铁律层 + 禁忌清单）
2. 读取 `.sgo/outline/outline.md` — 故事大纲（如验证大纲）
3. 读取 `.sgo/chapters/` 下的最新章节（如验证章节）
4. 读取类型配置 `.codex/sgo/config/{genre}.md` 获取 `quality_rules`
5. 读取 `.sgo/methodology/profile.resolved.json` 获取 minimum viable context 与 academic_evidence_policy

### 第三步：执行验证

Spawn `sgo-validator` Agent，传递：
- 验证目标（大纲 or 章节列表）
- 类型 slug
- 迭代计数（从 STATE.md 的 `迭代计数` 读取，首次为 0）

Agent 将自动检查：
- 宪法铁律合规 (VALD-01)
- 三幕结构完整性 (OUTL-01)
- 伏笔完整性 (OUTL-02)
- 角色设计一致性 (OUTL-03)
- 情感弧线 (OUTL-05)
- 角色一致性 (QUAL-01)
- 世界观一致性 (QUAL-02)
- 伏笔闭环 (QUAL-03)
- 视角一致性 (QUAL-04)
- 质量评分 (QUAL-05)

### 第四步：处理验证结果

**如果 PASSED（无 blocker）：**
1. 更新 `.sgo/STATE.md`：`阶段状态: completed`
2. 显示通过摘要
3. 提示下一步：`$sgo-write` 开始写作，或 `$sgo-continue` 自动衔接

**如果有 BLOCKER：**
1. 读取 STATE.md 中的 `迭代计数`
2. 如果 `迭代计数 >= 3`：输出 abort 报告，标记 `阶段状态: aborted`，要求人工介入
3. 如果 `迭代计数 < 3`：
   - 递增迭代计数
   - Spawn `sgo-outliner` Agent 携带验证反馈修订大纲
   - 修订后重新执行验证（回到第三步）

### 第五步：输出验证报告

```
=== 验证报告 ===
目标: [大纲 / 章节N]
结果: PASS / FAIL
迭代: [N/3]
Blocker: [N]个
Warning: [N]个
质量评分: [X/100]
下一步: [继续写作 / 修订大纲 / 人工介入]
```

验证报告写入 `.sgo/validation/report.md`。

## 强制约束

- 验证必须基于类型配置的 `quality_rules.consistency_checks` 动态组装检查项（声明式模式，不硬编码类型分支）
- 验证必须显式区分 blocker 与 methodology governance warning
- 3 次迭代上限不可突破（VALD-03）
- STATE.md 更新必须先 Read 再 Write，保留已有字段值

## Codex Adapter Notes

- Treat `$ARGUMENTS` / `$1` as the text after the `$sgo-*` skill invocation.
- When this workflow says to spawn an SGO Agent, use Codex `spawn_agent(agent_type="sgo-...")` if subagents are explicitly available in the current environment; otherwise execute the same agent instructions directly.
- Keep all writing artifacts in `.sgo/`; `.codex/sgo/` only stores reusable framework files.
