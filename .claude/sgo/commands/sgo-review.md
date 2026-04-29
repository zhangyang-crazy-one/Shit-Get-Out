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

使用 `sgo-finalizer` Agent（model: opus，最强推理能力）执行终审审计，其中 tech-paper 额外包含结果来源检查：
1. Constitution Iron Rules Audit — 铁律合规
2. Character Consistency Audit — 角色一致性
3. Worldview Consistency Audit — 世界观一致性
4. Foreshadow Closure Audit — 伏笔闭环
5. Perspective Consistency Audit — 视角一致性
6. Quality Scoring — 质量评分
7. Result Provenance Audit（tech-paper）— 结果包 / local_result_sources / provenance_status
8. Output Generation — 格式化成品输出
9. Decision — PASS / FAIL / ABORT

### 第三步：处理终审结果

**如果 decision = PASS：**
1. 更新 `.sgo/STATE.md`：
   - `当前阶段: finalize`
   - `阶段状态: completed`
   - `finalization_status.decision: "PASS"`
   - `finalization_status.output_files: [生成的文件路径]`
2. 格式化成品已输出到 `.sgo/output/`
3. 若为 tech-paper，结构化结果包也应保留在 `.sgo/output/`
4. 提示用户使用 `/sgo-export` 导出成品

**如果 decision = FAIL：**
1. 更新 `.sgo/STATE.md`：
   - `finalization_status.decision: "FAIL"`
   - `finalization_status.revision_count: +1`
   - `当前阶段: writing`（回流到写作阶段）
2. 如果 `revision_count >= 3`，decision 改为 `ABORT`，要求人工介入
3. 显示所有 blocker 和修复建议
4. 提示用户使用 `/sgo-write` 修订后重新终审

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

- 终审必须使用 opus 模型（最强推理能力，确保审校质量）
- 终审视角与写作视角必须分离（独立上下文执行）
- 修订回流最多 3 次（FINL-04）
- STATE.md 更新必须先 Read 再 Write，保留已有字段值
- 对 `tech-paper` 而言，外部引用完整并不等于结果 provenance 完整；表格或数值比较必须绑定本地结构化结果包
