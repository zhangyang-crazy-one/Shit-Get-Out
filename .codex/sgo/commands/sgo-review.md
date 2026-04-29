---
name: sgo-review
description: "运行终审。对所有已完成章节进行全面合规审计，输出终审报告。"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Agent
model: inherit
---

# SGO 终审

对所有已完成章节进行最终审校，执行全面合规审计，输出发布级成品。

## 特殊模式：Review → Fix 回流

如果 `$ARGUMENTS` 以 `fix`、`修复`、`revise` 开头，则本命令不直接进入终审，而是改走修订回流：

1. 读取 `.sgo/review/report.md`
2. 读取 `.codex/sgo/commands/sgo-fix.md`
3. 直接路由到 `sgo-fix` 流程，沿用其范围解析（`all` / `high` / `R-003` / `ch-5` 等）
4. 修订完成后返回 fix 摘要，并明确建议重新运行 `$sgo-review`

这使得 `$sgo-review fix ...` 成为 review 之后的标准闭环入口，而不是要求用户手动切换命令。

## 前置条件

- `.sgo/STATE.md` 必须存在且 `当前阶段` 为 `writing`、`review` 或 `finalize`
- `.sgo/drafts/` 或 `.sgo/chapters/` 下必须有已完成的章节文件
- `.sgo/constitution/constitution.md` 必须存在且状态为 `locked`

## 执行步骤

### 第一步：读取项目状态和所有制品

1. 读取 `.sgo/STATE.md` — 当前状态、章节列表、终审状态
2. 读取 `.sgo/constitution/constitution.md` — 创作宪法
3. 读取 `.sgo/outline/outline.md` — 故事大纲
4. 优先扫描 `.sgo/drafts/` 获取当前项目正文；若为空再回退到 `.sgo/chapters/`
5. 读取 `.sgo/tracking/foreshadow-ledger.md` — 伏笔追踪
6. 读取 `.sgo/methodology/profile.resolved.json` 与 `constitution.genre_config_ref` 获取输出格式要求
7. 如果 `genre=tech-paper` 且结果章节含表格/数值比较，检查 `.sgo/output/` 下是否存在结构化结果包

### 第二步：Spawn sgo-finalizer Agent 执行终审

使用 `sgo-finalizer` Agent 执行终审审计，其中 tech-paper 额外包含结果来源检查：
1. Constitution Iron Rules Audit — 铁律合规
2. Character Consistency Audit — 角色一致性
3. Worldview Consistency Audit — 世界观一致性
4. Foreshadow Closure Audit — 伏笔闭环
5. Perspective Consistency Audit — 视角一致性
6. Quality Scoring — 质量评分
7. Result Provenance Audit（tech-paper）— 结果包 / local_result_sources / provenance_status
8. Output Generation — 格式化成品输出
9. Decision — PASS / FAIL / ABORT

主代理职责：
- 组装 review 上下文
- `spawn_agent(agent_type="sgo-finalizer")`
- 等待并接收终审结果
- 仅在拿到 agent 结果后回写 `.sgo/STATE.md` 或输出摘要

只有当前环境无法使用子代理时，才允许本地执行等价终审逻辑。

### 第三步：处理终审结果

**如果 decision = PASS：**
1. 更新 `.sgo/STATE.md`：
   - `当前阶段: finalize`
   - `阶段状态: completed`
   - `finalization_status.decision: "PASS"`
   - `finalization_status.output_files: [生成的文件路径]`
2. 格式化成品先作为内部 staging 输出到 `.sgo/output/`
3. 若为 tech-paper，结构化结果包也应保留在 `.sgo/output/`
4. 仅当项目进入 `当前阶段: done` 且 `阶段状态: completed|archived|final` 后，才提示用户使用 `$sgo-export` 发布正式成品

**如果 decision = FAIL：**
1. 更新 `.sgo/STATE.md`：
   - `finalization_status.decision: "FAIL"`
   - `finalization_status.revision_count: +1`
   - `当前阶段: writing`（回流到写作阶段）
2. 如果 `revision_count >= 3`，decision 改为 `ABORT`，要求人工介入
3. 显示所有 blocker 和修复建议
4. 优先提示用户使用 `$sgo-review fix ...` 进入修订回流；仅在需要直接写新章时使用 `$sgo-write`

### 第四步：输出终审摘要

```
=== 终审报告 ===
结果: PASS / FAIL / ABORT
修订次数: [N/3]
审计维度:
  - 宪法合规: PASS/FAIL ([N]个问题)
  - 角色一致性: PASS/FAIL
  - 世界观一致性: PASS/FAIL
  - 伏笔闭环: PASS/FAIL
  - 视角一致性: PASS/FAIL
  - 质量评分: [X/100]
成品文件: [输出路径]
下一步: [导出成品 / 修订重审 / 人工介入]
```

## 强制约束

- 终审默认必须通过 `sgo-finalizer` 子代理执行，保持审校视角与写作视角分离
- 终审视角与写作视角必须分离（独立上下文执行）
- 修订回流最多 3 次（FINL-04）
- STATE.md 更新必须先 Read 再 Write，保留已有字段值
- 对 `tech-paper` 而言，外部引用完整并不等于结果 provenance 完整；表格或数值比较必须绑定本地结构化结果包

## Codex Adapter Notes

- Treat `$ARGUMENTS` / `$1` as the text after the `$sgo-*` skill invocation.
- When `$ARGUMENTS` starts with `fix` / `修复` / `revise`, do not run review locally first; route into the `sgo-fix` workflow immediately.
- When this workflow says to spawn an SGO Agent, use Codex `spawn_agent(agent_type="sgo-...")` if subagents are explicitly available in the current environment; otherwise execute the same agent instructions directly.
- Keep all writing artifacts in `.sgo/`; `.codex/sgo/` only stores reusable framework files.
