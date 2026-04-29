---
name: sgo-fix
description: "根据 review 报告回流修订。将问题单转成具体改稿动作，修订章节并重新打分。"
argument-hint: "[all | ch-2 | high | R-003 等，可为空]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Agent
model: inherit
---

# SGO 修订回流

把 `$sgo-review` 产出的 findings 转成实际改稿动作，并在修订后重新评分。

## 前置条件

- `.sgo/review/report.md` 必须存在
- `.sgo/STATE.md` 必须存在且当前阶段为 `writing`、`review` 或 `finalize`
- `.sgo/constitution/constitution.md` 与 `.sgo/outline/outline.md` 必须存在

## 执行步骤

### 第一步：读取修订上下文

1. 读取 `.sgo/review/report.md`
2. 读取 `.sgo/STATE.md`
3. 读取 `.sgo/constitution/constitution.md`
4. 读取 `.sgo/outline/outline.md`
5. 读取目标章节全文：
   - 默认读取 report 中被点名的章节
   - 若 `$ARGUMENTS` 指定章节或 finding id，则只读取对应范围

### 第二步：确定修订范围

解析 `$ARGUMENTS`：

- `all` / 为空：按 review 报告中的 blocker -> high -> medium 顺序修
- `high` / `medium`：只处理对应优先级
- `ch-2` / `chapter-2`：只修指定章节
- `R-003`：只修指定 finding

若 report 中存在 blocker，则默认先处理 blocker，不跳过。

### 第三步：执行修订

优先使用“写作修订模式”，而不是另起炉灶重写：

1. 保留 locked constitution 与 locked outline
2. 将 review finding 映射为具体改稿目标：
   - 外部压力不足 -> 增加承压动作、代价、追压余震
   - 内部冲突过软 -> 让分歧带来可见后果
   - 说理过重 -> 把总结压回动作、景物、物件和身体反应
   - 风格漂移 -> 回到 style anchor 与已完成章节的文风
3. 章节修订统一先落到 `.sgo/drafts/chapter-N.md`
4. 修订后运行质量门：
   - `node .codex/sgo/hooks/quality-gate.js .sgo/drafts/chapter-N.md`
5. 若评分改善且无 blocker，则允许覆盖 `.sgo/chapters/chapter-N.md`

默认 agent 策略：

- 文稿/章节修订：优先 `spawn_agent(agent_type="sgo-writer")`，以 revision mode 执行
- 非文稿工件同步（如 `foreshadow-ledger.md`、`outline.md`、review 记录）：由主代理本地执行；必要时可交给通用 worker
- 不要求存在单独的 `sgo-fixer` 平台 agent type

## 修订策略

- 默认最小必要改动：只修 findings 涉及的段落和相邻承接段
- 若发现局部改动无法成立，可扩大到整章重修，但必须保留：
  - 已锁定伏笔
  - 关键人物路数
  - 已确认的长路骨架
- 不得为了提分而引入新宪法冲突
- 若 review finding 明确指出“成品污染”或“元标记泄露”，允许同步移除正文中的模板尾段、`FS-*` 直呼和系统说明，这属于 finding 本身，不算 unrelated edit

执行顺序：

1. 先处理 blocker
2. 再处理 high
3. medium 仅在前两类清零后再考虑
4. fix 完成后优先建议重新运行 `$sgo-review`

## 第四步：回写修订结果

修订完成后：

1. 在 `.sgo/review/report.md` 末尾追加修订记录：
   - 修了哪些 finding
   - 涉及哪些章节
   - 新旧分数对比
   - 仍未解决的问题
2. 更新 `.sgo/STATE.md` 的：
   - `上次活动`
   - `写作阶段 -> 输出文件`（若最新修改章节发生变化）
   - 必要时更新 `最近章节评分`

### 第五步：输出结果摘要

```
=== 修订回流完成 ===
处理范围: [findings / chapters]
已修章节: [列表]
评分变化: [ch-x old -> new]
未解决问题: [N]
下一步: $sgo-review / $sgo-write / 继续修订
```

## 强制约束

- 修订必须优先依据 `.sgo/review/report.md`，不能跳过 findings 直接凭空改稿
- 修订前必须读取原章全文，避免只按摘要动刀
- 章节修改一律先写入 `.sgo/drafts/`
- 若当前会话没有 `sgo-fix` 作为可发现技能，`$sgo-review fix ...` 必须能直接路由到本流程

## Codex Adapter Notes

- Treat `$ARGUMENTS` / `$1` as the text after the `$sgo-*` skill invocation.
- Reuse `sgo-writer` in revision mode for chapter prose fixes by default; do not assume a dedicated `sgo-fixer` agent exists.
- Keep all writing artifacts in `.sgo/`; `.codex/sgo/` only stores reusable framework files.
