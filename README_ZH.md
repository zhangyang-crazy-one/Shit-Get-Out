# Shit Get Out

SGO 是一个面向 AI Agent 的结构化写作工作流。

它把一个模糊的故事想法，转换成一份可交付的成稿，依靠的是分阶段流水线、共享项目状态，以及同时面向 Claude Code 和 Codex 的运行时适配器。

这个项目明确借鉴了 `Get Shit Done` 的代码工作流思想，但 SGO 的目标不是通用软件交付，而是把同样的流程纪律应用到小说与长文本写作。

## 为什么做这个

大多数 AI 写作会话都会漂移。

SGO 强制把创作过程落成显式制品与检查点：

- `research`
- `design`
- `constitution`
- `outline`
- `validation`
- `writing`
- `finalize`

每个阶段的输出都会写入 `.sgo/`，这样项目就能在不同会话之间、不同运行时之间干净恢复。

## 运行时

- Claude Code: `/sgo-*`
- Codex: `$sgo-*`

两个运行时共享同一套 `.sgo/` 项目数据模型。

## 安装

在当前项目里同时安装两套适配器：

```bash
bash scripts/bootstrap.sh
```

只安装单一运行时：

```bash
bash scripts/bootstrap.sh --runtime claude
bash scripts/bootstrap.sh --runtime codex
```

先预览变更：

```bash
bash scripts/bootstrap.sh --dry-run
```

卸载适配器：

```bash
bash scripts/bootstrap.sh --uninstall
```

## 会安装什么

Claude 侧：

- `.claude/sgo/`
- `/sgo-*` 命令入口
- `.claude/settings.json` 里的 hook wiring

Codex 侧：

- `.codex/sgo/`
- `.codex/skills/sgo-*`
- `.codex/agents/sgo-*.toml`
- 仓库本地 `.codex/hooks.json`
- `$CODEX_HOME` 的 skill 与 agent 注册

## 工作流模型

SGO 会读写以下共享制品：

- `.sgo/research/`
- `.sgo/constitution/`
- `.sgo/outline/`
- `.sgo/drafts/`
- `.sgo/chapters/`
- `.sgo/validation/`
- `.sgo/tracking/`
- `.sgo/memory/`
- `.sgo/authorship/`
- `.sgo/output/`
- `.sgo/STATE.md`

这意味着你可以在 Claude 里启动，在 Codex 里继续，并保持同一份项目状态。

## 方法论层

SGO 现在引入了一层一等公民级别的 `methodology_profile`，用于工作流治理。

这一层故意和 `research_strategy`、`writing_flow`、`quality_rules` 这类题材字段分离。
这些字段描述的是题材行为；`methodology_profile` 描述的是流程行为：

- 人类监督边界：`always_do / ask_first / never_do`
- 最小可用上下文检查
- 学术写作的证据姿态
- 修订纪律与工作流纪律

全局默认值位于：

- `.claude/sgo/config/methodology-defaults.json`
- `.codex/sgo/config/methodology-defaults.json`

题材级 override 可以在这个基线之上扩展。
项目级解析结果会写入 `.sgo/methodology/profile.resolved.json`，由 Claude 与 Codex 两个运行时共同消费。

当前阶段把这部分范围控制在治理与读取链路整合上。
树规划、claim-label 证据校验、以及更丰富的 memory/runtime 行为，刻意留给后续阶段。

## 树规划

SGO 支持通过解析后的 `methodology_profile.planning_mode` 进行树状文档规划。

规范化大纲仍然是 `.sgo/outline/outline.md`，但它现在可以承载：

- `tree_structure`
  - 父子文档节点结构
- `atomic_block_plan`
  - 场景或章节局部写作块
- `block_dependencies`
  - 块级顺序依赖

Atomic block 是规划与上下文选择单元。
它帮助写作者在起草前只加载局部上下文，但最终输出仍然是普通散文，除非某个类型模板明确要求别的形式。

## 学术证据工作流

对于 `tech-paper`，SGO 使用解析后的 `academic_evidence_policy` 来跟踪：

- evidence map
- claim inventory
- claim labels
- evidence references
- source conflicts

不被支持的事实性 claim 会被视为 blocker；
部分支持与未解决冲突会保留为 warning 或讨论项。

## 记忆与作者性运行时

Phase 13 为 SGO 的写作运行时增加了显式的长期记忆面与作者性控制面。
共享 `.sgo/` 项目模型现在可以承载：

- 事实性长期记忆
  - 角色状态
  - 时间线
  - 伏笔状态
  - 未解问题
  - 世界观约束
- 写作偏好记忆
  - 禁用表达
  - 风格漂移警告
  - 重复失败模式
- 专用 authorship-control 制品
  - 与 `constitution.md` 和 `STATE.md` 分离

对抗式节奏控制应主要作用于起草阶段；
而严重风格漂移或节奏坍塌，则保留给明确升级路径处理。

## Codex 说明

Codex 的 hooks 并不与 Claude 的 hooks 完全等价。

Codex 适配器的设计重点是：

- `.sgo/` 里的共享制品模型
- 在 Codex 支持范围内的仓库本地 hook guardrails
- 写在 skills 与 agents 里的显式工作流逻辑

安装器会启用：

```toml
[features]
codex_hooks = true
```

## 仓库结构

- `.claude/sgo/`
  - 面向 Claude 的源工作流
- `.codex/sgo/`
  - 面向 Codex 的生成适配层
- `.codex/skills/sgo-*`
  - Codex skill 入口
- `.codex/agents/sgo-*.toml`
  - Codex agent 定义
- `scripts/`
  - 安装器与生成器

## 开发方式

Claude 适配器是 source of truth。

当你修改 `.claude/sgo/` 后，需要重新生成 Codex 适配器：

```bash
python3 scripts/generate-codex-sgo.py
```

基础校验：

```bash
python3 -m py_compile scripts/generate-codex-sgo.py
bash -n scripts/bootstrap.sh scripts/install-claude.sh scripts/install-codex.sh
```

## 参与贡献

详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

MIT。见 [LICENSE](LICENSE)。
