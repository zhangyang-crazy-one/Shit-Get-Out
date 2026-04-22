---
name: sgo-start
description: "输入写作主题，自动识别类型并启动全自动化写作流程。系统将解析用户意图、识别写作类型、判定输出规模、执行背景调研、自动生成创作宪法。"
argument-hint: "[主题描述]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Agent
---

# SGO 写作启动

根据用户输入的主题描述，启动全自动化写作流程。

## 执行步骤

### 第一步：输入解析与类型识别

分析用户输入的主题描述：$ARGUMENTS

识别以下信息：
1. **写作类型**（从以下 7 种中选择最匹配的）：
   - `web-novel`（网络小说）：多卷多章长篇，升级/冒险/爽感驱动
   - `short-story`（短篇小说）：单线结构，3000-30000字，意境精巧
   - `romance`（言情小说）：情感驱动，虐甜节奏，角色代入
   - `philosophical`（哲理小说）：思想主题驱动，文学性强
   - `sci-fi`（科幻小说）：科技设定核心，想象力与逻辑性并重
   - `detective`（侦探小说）：推理驱动，线索严密，悬念节奏
   - `tech-paper`（科技论文）：论证严谨，引用完整，学术规范

   **判定优先级**（基于行业调研的类型边界分析）：
   - 主驱动力 > 背景设定 > 篇幅暗示
   - 如果主题同时匹配多个类型，选择"核心驱动力最强的那个"
   - 例如"一个AI觉醒后追查真相的都市故事"——如果推理是主驱动则选 detective，如果科技影响是主驱动则选 sci-fi，如果世界观升级体系是主驱动则选 web-novel
   - 混合类型是正常现象，识别主类型即可，后续阶段的调研报告会涵盖次要类型元素

2. **输出规模**：
   - 短篇：< 5000 字
   - 中篇：5000-50000 字
   - 长篇：> 50000 字
   - 基于类型默认值（从类型配置的 scale_defaults 读取）+ 主题复杂度综合判断
   - 主题复杂度判断因素：世界观规模（单一场景 vs 多个世界）、角色数量、时间跨度、伏笔复杂度

3. **关键设定**：从用户输入中提取的核心世界观、角色、主题等要素

### 第二步：展示解析结果并确认

向用户展示：
- 识别的写作类型及判定理由
- 判定的输出规模及理由（含目标字数范围）
- 提取的关键设定摘要

**重要**：请用户确认或修改。等待用户回复后再继续。用户可以：
- 修正识别的类型
- 调整规模
- 补充额外设定或要求

### 第三步：加载配置并更新状态

用户确认后执行：
1. 读取类型配置文件 `.codex/sgo/config/{type-slug}.md`
2. 从配置中提取 scale_defaults 确认目标字数
3. 执行 `node .codex/sgo/scripts/methodology-profile.js resolve --genre {type-slug} --project-root .` 生成 `.sgo/methodology/profile.resolved.json`
4. 更新 `.sgo/STATE.md`（先 Read 整个文件，修改后 Write，保留已有字段）：
   - 写作类型: {display_name}
   - 输出规模: {scale}
   - 目标字数: {word_count}
   - 当前阶段: research
   - 阶段状态: in_progress
5. 更新 `.sgo/.continue-here.md` 状态为 research 阶段

### 第四步：执行自动调研

使用 sgo-researcher Agent 执行背景调研：
- 在 Codex subagent prompt 中传递：主题描述、识别的类型 slug、判定的规模
- Agent 将读取类型配置的 research_strategy 字段决定调研行为
- Agent 必须读取 `.sgo/methodology/profile.resolved.json` 识别 governance 边界与 minimum viable context 软警告
- 如果 `genre=tech-paper`，Agent 还必须产出 `evidence_map`、`claim_inventory`、`source_conflicts`
- Agent 优先使用本地 SearXNG 实例（127.0.0.1:8080）执行多引擎聚合搜索
- 如果 SearXNG 不可用，Agent 尝试自动安装 SearXNG Docker 容器
- 安装失败或用户拒绝时，降级为纯 Codex 知识模式

### 第五步：调研完成与阶段衔接

调研完成后更新：
- `.sgo/STATE.md`（先 Read 整个文件，修改后 Write，保留已有字段）：
  - 当前阶段: constitution
  - 阶段状态: in_progress

### 第六步：立宪阶段自动派发

调研完成后自动衔接立宪阶段（无需人工确认）：

1. 使用 sgo-constitutioner Agent 生成创作宪法：
   - 在 Codex subagent prompt 中传递：调研报告路径、类型 slug、规模信息
   - Agent 将读取类型配置的 constitution_defaults、`.sgo/methodology/profile.resolved.json` 和调研报告，自动生成铁律/指南/禁忌
   - 宪法写入 `.sgo/constitution/constitution.md`，状态直接锁定（status: locked）
2. 宪法生成完成后更新 `.sgo/STATE.md`（先 Read 整个文件，修改后 Write，保留已有字段）：
   - 阶段状态: completed
3. 更新 `.sgo/.continue-here.md` 状态为 constitution 阶段完成，下一阶段为构架引擎

### 第七步：构架阶段自动派发

宪法完成后自动衔接构架阶段（无需人工确认）：

1. 更新 `.sgo/STATE.md`（先 Read 整个文件，修改后 Write，保留已有字段）：
   - 当前阶段: outline
   - 阶段状态: in_progress

2. 使用 sgo-outliner Agent 生成大纲：
   - Agent 读取宪法（iron_rules）和调研报告
   - Agent 读取类型配置的 scale_defaults 判断结构类型
   - Agent 读取 `.sgo/methodology/profile.resolved.json` 获取 planning_mode
   - 如果 `genre=tech-paper`，Agent 还必须把 `claim_inventory` / `evidence_map` 映射成带 `claim_label`、`evidence_refs` 的 academic atomic blocks
   - Agent 将 `tree_structure` 和 `atomic_block_plan` 写入 `.sgo/outline/outline.md`
   - Agent 输出到 `.sgo/outline/outline.md`，状态设为 draft

3. 大纲生成完成后，outline-exit hook 验证并锁定大纲

### 第八步：验证阶段与3次迭代修订循环

Validation phase implements the revision loop per GSD revision-loop.md and VALD-02:

```
ITERATION_LOOP:
  1. Spawn sgo-validator Agent 验证大纲对照宪法:
     - 检查铁律违规（发现则标记为 blocker）
     - 检查伏笔完整性（plant 有但无 collect 则标记为 blocker）
     - 检查角色设计一致性（有问题则标记为 warning）
     - 检查情感弧线（缺失则标记为 warning）
     - 如果 `genre=tech-paper`，额外检查 claim labels、evidence refs、citation placeholders 和 source conflicts
  
  2. 如果 VALIDATION_PASSED（无 blocker）:
     - 更新 STATE.md: 阶段状态: completed
     - 进入第九步（写作阶段）
  
  3. 如果发现问题（blocker 或 warning）:
     - iteration += 1
     - 如果 iteration > 3:
       - 输出 abort report（含所有失败验证）
       - 更新 STATE.md: 阶段状态: aborted, 当前阶段: validation
       - 停止并输出 VALD-03 abort 消息
     - 携带 validator 反馈重新 spawn sgo-outliner:
       ```
       <checker_issues>
       {YAML 格式的问题列表 — 原样传递}
       </checker_issues>
       
       <revision_instructions>
       修复所有 BLOCKER 问题。可行时修复 WARNING 问题。
       这是修订迭代 {N}，最多 3 次。
       </revision_instructions>
       ```
     - 进入 ITERATION_LOOP

  4. 3 次迭代后仍未通过: abort
```

### 第九步：写作阶段

Validation 通过后进入写作阶段：
- 更新 `.sgo/STATE.md`（先 Read 整个文件，修改后 Write，保留已有字段）：
  - 当前阶段: writing
  - 阶段状态: in_progress
- writing-entry hook 验证大纲已锁定后方可开始写作
- 如果 `genre=tech-paper`，后续写作按 evidence map、claim inventory、claim label 和 citation placeholders 约束落稿
- 继续 Phase 5 写作工作流

## 强制约束

- **用户确认前不得开始调研**（D-07）
- 调研报告必须写入 `.sgo/research/report.md`
- 方法论配置必须先解析到 `.sgo/methodology/profile.resolved.json`，再启动 researcher/constitutioner/validator
- STATE.md 更新必须先 Read 再 Write，保留已有字段值（避免写入竞争，RESEARCH.md 陷阱 5）
- 类型识别结果必须与 `.codex/sgo/config/` 下的配置文件 slug 一致
- **立宪阶段无需人工确认**（D-04）：调研完成后自动进入立宪，用户在第二步的确认覆盖整个流程
- 宪法必须写入 `.sgo/constitution/constitution.md`，状态字段设为 `locked`
- STATE.md 更新必须先 Read 再 Write，保留已有字段值（避免写入竞争）

## Codex Adapter Notes

- Treat `$ARGUMENTS` / `$1` as the text after the `$sgo-*` skill invocation.
- When this workflow says to spawn an SGO Agent, use Codex `spawn_agent(agent_type="sgo-...")` if subagents are explicitly available in the current environment; otherwise execute the same agent instructions directly.
- Keep all writing artifacts in `.sgo/`; `.codex/sgo/` only stores reusable framework files.
