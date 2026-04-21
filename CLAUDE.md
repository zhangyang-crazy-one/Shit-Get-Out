# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指引。

## 项目：SGO（Shit Get Out）写作框架

一个结构化的、基于 Agent 的创意写作框架，用于 AI 辅助小说/虚构作品写作。融合 GSD 的编排模式与 Writing_Program 的写作领域逻辑。

### 参考来源（仅供参考 — 请勿修改）

- **GSD 工作流** 位于 `~/.claude/get-shit-done/` — 编排模式：制品驱动状态、关卡分类、波次执行、会话延续、技能即路由层
- **Writing_Program** 位于 `~/my_programes/Writing_Program/` — 写作领域逻辑：7阶段工作流、25个写作技能、`.writer/` 每项目结构、钩子系统

## 架构

### 7阶段写作工作流

| 阶段 | 名称 | 目的 |
|------|------|------|
| 1 | 调研（Research） | 内容与世界构建研究 |
| 2 | 风格设计（Design） | 风格定义与锚定 |
| 3 | 立宪（Constitution） | 设定不可变更的创作规则与禁忌 |
| 4 | 构架（Outline） | 三幕结构、章节大纲、伏笔规划 |
| 5 | 验证（Validation） | 写作前合规性检查（对照立宪） |
| 6 | 编写（Draft） | 场景构建、角色弧线、冲突写作 |
| 7 | 终审（Finalize） | 最终审校与全面合规审计 |

### 核心模式（来自 GSD）

- **制品驱动状态**：所有状态存储在文件中（STATE.md 作为通用会话恢复机制），跨会话不依赖内存状态
- **编排者-委派者**：主会话将工作路由给专业 Agent，编排者保持精简
- **三层规划**：项目（PROJECT.md）→ 阶段（ROADMAP.md + CONTEXT.md）→ 计划（带 frontmatter 的 PLAN.md）
- **关卡式质量门控**：预检、修订循环（最多3次）、升级至人工、中止机制
- **会话延续**：`.continue-here.md` 文件和 HANDOFF.json 实现跨上下文重置的暂停/恢复
- **富 frontmatter 制品**：YAML frontmatter 包含 wave、depends_on、requirements、metrics 等元数据，便于自动化处理
- **技能即路由**：每个 `/sgo-*` 技能是薄路由层，委托给工作流文件处理

### 计划目录结构

```
writing_frame/
  CLAUDE.md                    # 本文件
  .claude/
    settings.json              # 钩子定义
    settings.local.json        # 本地 MCP 配置
    agents/                    # Agent 定义（写手、跟踪器、验证器等）
    commands/                  # 斜杠命令（/sgo-init、/sgo-write 等）
    hooks/                     # 生命周期钩子（session-start、pre-write、post-chapter 等）
    skills/                    # 写作技能模块（25个技能，P0/P1/P2 优先级）
    config/                    # 框架配置
    templates/                 # 制品模板
  .sgo/                        # 每项目写作数据（类比 GSD 的 .planning/）
    PROJECT.md                 # 活跃项目上下文
    ROADMAP.md                 # 阶段式路线图
    STATE.md                   # 会话延续（<100行）
    constitution/              # 不可变更的创作规则（第3阶段后锁定）
    outline/                   # 按卷的故事大纲
    drafts/                    # 章节草稿
    chapters/                  # 定稿章节
    design/                    # 风格与设计文档
    research/                  # 项目专项调研
    validation/                # 验证报告
    tracking/                  # 进度跟踪
    phases/                    # 阶段目录（含计划和摘要）
```

### 写作技能优先级体系

| 优先级 | 类型 | 示例 |
|--------|------|------|
| P0（阻断性） | 必须通过才能继续 | three-step-check、constitution-check、outline-alignment |
| P1（强制性） | 每次必须执行 | consistency-check、character-consistency、foreshadow-check、narrative-conflict |
| P2（可选性） | 适时增强 | symbol-metaphor、implicit-writing、emotional-arc |

## 开发

本项目完全运行在 Claude Code CLI 生态中，无传统构建/测试/运行流水线。

- **语言**：基于 Markdown 的技能/Agent/命令定义 + Node.js 钩子 + Python 分析工具
- **技能**：`.claude/skills/*/SKILL.md` 文件，含 frontmatter（name、description、allowed-tools）
- **Agent**：`.claude/agents/*.md` 文件，含角色定义
- **钩子**：`.claude/hooks/*.js` Node.js 脚本，在生命周期事件触发
- **命令**：`.claude/commands/*.md` 文件，定义斜杠命令行为

### 首先需要理解的关键文件

1. `.claude/CLAUDE.md` — 核心写作方法论与立宪体系
2. `.claude/settings.json` — 钩子绑定与生命周期事件
3. `.claude/commands/index.md` — 命令注册与路由
4. `.claude/agents/` — Agent 能力定义
5. `.sgo/STATE.md` — 当前项目状态（任何工作流开始时必须首先读取）

### 参考：Writing_Program 关键模式

位于 `~/my_programes/Writing_Program/` 的 Writing_Program 实现了我们适配的写作领域逻辑：

- 25个写作技能位于 `.claude/skills/`，每个含 SKILL.md 定义
- 6个生命周期钩子（session-start、skill-eval、pre-write、post-chapter、stop）
- 3个 Agent（chapter-writer、project-tracker、validator）
- 每项目 `.writer/` 目录，含 constitution/、outline/、drafts/、chapters/ 等
- Python 工具 `audit_utils.py` 用于文本分析（字数统计、文言文占比、视角验证）

<!-- GSD:project-start source:PROJECT.md -->
## Project

**SGO（Shit Get Out）全自动化 AI 写作系统**

一个完全自动化的 AI 写作系统，运行在 Claude Code CLI 生态中。用户只需提供主题或题材，系统自动完成调研、立宪、构架、编写、终审全流程，输出发布级成品。支持网络小说、短篇小说、言情、哲理、科幻、侦探、科技论文等多种写作类型，输出规模自适应。

**Core Value:** 从主题到发布级成品的一键全自动化——用户给主题，系统出成品，人只做终审。

### Constraints

- **平台**：Claude Code CLI 生态 — 所有组件以 skills/agents/commands/hooks 形式实现
- **语言**：Markdown（技能/命令定义）+ Node.js（hooks）+ Python（分析工具）
- **无传统构建**：不做编译/打包，所有文件即代码
- **上下文限制**：长篇写作必须考虑 Claude 上下文窗口限制，需要分段策略
- **全自动约束**：人的介入仅在终审阶段，其余阶段零人工干预
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## 总体原则
## 推荐技术栈
### 一、Claude Code CLI 扩展点（核心平台）
| 扩展点 | 文件位置 | 用途 | 为什么用这个 |
|--------|----------|------|-------------|
| **Commands（斜杠命令）** | `.claude/commands/*.md` | 用户入口和工作流路由 | Markdown 定义，支持 frontmatter（allowed-tools、model、argument-hint），支持 `$ARGUMENTS` 和 `$1/$2` 参数替换，支持 `!`bash 预执行和 `@file` 文件引用。是系统与用户的交互界面。**置信度：HIGH**（官方文档验证） |
| **Agents（子代理）** | `.claude/agents/*.md` | 专业化写作代理（写手、验证器、跟踪器） | 独立上下文窗口，自定义 system prompt，可限定工具集，支持 model 选择（sonnet/opus/haiku/inherit）。天然适合写作流水线中的各个角色。**置信度：HIGH**（官方文档验证） |
| **Hooks（生命周期钩子）** | `.claude/settings.json` 的 `hooks` 字段 | 质量门控、状态跟踪、自动触发 | 8 种生命周期事件（PreToolUse/PostToolUse/UserPromptSubmit/Stop/SubagentStop/SessionStart/SessionEnd/PreCompact），JSON stdin/stdout 通信，exit code 2 阻断机制。用于写作流程中的自动检查和状态流转。**置信度：HIGH**（官方文档验证） |
| **Memory（记忆系统）** | `CLAUDE.md` + `@path/to/import` 导入 | 项目级指令、写作规则、会话延续 | 四层记忆（Enterprise > Project > User > Local），递归目录查找，支持 `@` 导入（最大5层深度），`/memory` 编辑命令。用于存储写作规则、风格指南、立宪法则等持久化信息。**置信度：HIGH**（官方文档验证） |
### 二、运行时语言
| 语言 | 版本 | 用途 | 为什么 |
|------|------|------|--------|
| **Node.js** | v24.13.0 (Active LTS "Krypton") | Hooks 脚本 | Claude Code CLI 本身基于 Node.js，hooks 原生运行在 Node 环境中。v24 是当前 Active LTS（截至2026年3月），支持到2027年末。已安装在系统上。**置信度：HIGH**（系统验证 + Node.js 官方发布表） |
| **Python** | 3.11.10 | 文本分析工具 | 用于字数统计、文体分析、一致性检查等计算密集型文本处理任务。3.11 性能比3.10快约25%，且 pyenv 管理方便。已安装在系统上。**置信度：HIGH**（系统验证） |
| **Markdown** | — | 所有定义文件 | Commands、Agents、Memory、Skill 定义全部以 Markdown + YAML frontmatter 编写。这是 Claude Code CLI 生态的"源代码格式"。**置信度：HIGH** |
### 三、Node.js 库（Hooks 使用）
| 库 | 版本 | 用途 | 何时使用 | 置信度 |
|-----|------|------|----------|--------|
| **fs / path**（内置） | — | 文件读写、路径操作 | 每个 hook 都需要读取或验证文件 | HIGH |
| **child_process**（内置） | — | 调用 Python 分析脚本 | hook 需要执行 Python 做文本分析时 | HIGH |
| **stream**（内置） | — | 处理 JSON stdin | hooks 通过 stdin 接收 Claude Code 传入的 JSON 数据 | HIGH |
### 四、Python 库（文本分析工具）
| 库 | 用途 | 为什么选它 | 安装时机 | 置信度 |
|-----|------|-----------|----------|--------|
| **jieba** 0.42.1 | 中文分词 | 中文写作系统的事实标准分词库，无替代品可用。用于字数统计（按词计）、关键词提取、词频分析 | Phase 2（构架引擎需要统计词频时） | HIGH |
| **regex** | 高级正则表达式 | 比 re 模块支持 Unicode 属性类（\p{Han} 等中文字符匹配）、模糊匹配、可变长度后行断言。用于中文文本模式识别 | Phase 2 | HIGH |
| **PyYAML** 6.x | YAML frontmatter 解析 | 解析所有 `.md` 文件中的 YAML frontmatter（wave、depends_on、metrics 等元数据） | Phase 1（基础设施） | HIGH |
| **opencc-python-reimplemented** | 简繁转换 | 部分写作类型（如民国背景）需要繁体支持，或用户输入繁体需要转为简体 | Phase 3（可选） | MEDIUM |
| 不使用 | 原因 |
|--------|------|
| **NLTK** | 过重，面向英文 NLP，中文支持弱。jieba 足够 |
| **spaCy** | 工业级 NLP 管道，对写作系统过度设计。安装复杂，模型文件大 |
| **textstat** | 面向英文可读性评分（Flesch-Kincaid 等），对中文无意义 |
| **transformers / torch** | 重度依赖，启动慢。写作质量评估由 Claude 本身完成，不需要本地模型 |
### 五、数据存储格式
| 格式 | 用途 | 为什么 | 置信度 |
|------|------|--------|--------|
| **Markdown + YAML frontmatter** | 所有制品（大纲、草稿、验证报告、状态文件） | Claude Code CLI 原生理解的格式，可读性极高，支持 `Read` 工具直接查看，frontmatter 便于自动化解析 | HIGH |
| **JSON** | Hooks 通信（stdin/stdout）、配置文件（settings.json）、会话延续（HANDOFF.json） | Claude Code Hooks 协议要求 JSON，`settings.json` 是 JSON 格式 | HIGH |
| **纯文本** | 最终输出（发布级成品） | 写作的最终输出应该是干净的文本文件，不包含元数据 | HIGH |
| 不使用 | 原因 |
|--------|------|
| **SQLite / 数据库** | 写作系统的数据量不需要数据库。所有状态用文件管理，符合 Claude Code 的"文件即状态"哲学 |
| **TOML** | Claude Code 生态不用 TOML，增加认知负担 |
| **XML** | 人类可读性差，Claude Code 生态不使用 |
### 六、项目结构映射到 Claude Code CLI 扩展点
### 七、Claude Code CLI 版本特性（决定技术选型的关键能力）
| 特性 | 版本要求 | 本系统是否需要 | 备注 |
|------|----------|---------------|------|
| **Custom Subagents** | >= 2.0 | 是 | 核心架构依赖。独立上下文窗口，自定义 system prompt 和工具集 |
| **Hooks (8种事件)** | >= 1.0.50 | 是 | 质量门控核心。PreToolUse/PostToolUse 用于写作前后自动检查 |
| **Custom Commands** | >= 1.0 | 是 | 用户入口。支持 frontmatter、参数、bash 预执行 |
| **Memory imports (@path)** | >= 1.0 | 是 | 模块化记忆管理，按需加载规则文件 |
| **Stop hook 阻断** | >= 1.0.50 | 是 | 防止写作流程意外中断，确保关键步骤完成 |
| **SubagentStop** | >= 2.0 | 是 | 监控子代理完成情况，触发后续流程 |
| **SessionStart/SessionEnd** | >= 2.0 | 是 | 会话延续机制的关键事件 |
| **PreCompact** | >= 2.0 | 是 | 长篇写作时上下文压缩前保存关键状态 |
## 替代方案考虑
| 类别 | 推荐方案 | 被排除的替代方案 | 排除原因 |
|------|----------|----------------|----------|
| Hooks 语言 | Node.js (内置模块) | Python hooks | Claude Code Hooks 原生执行 bash 命令，但 Node.js 与 Claude Code 同生态，GSD 工具链已验证可行。Python 作为被调用的分析工具更合适 |
| Hooks 语言 | Node.js (内置模块) | Shell (bash) | bash 不擅长 JSON 解析和复杂逻辑控制。GSD 的 bash hooks（gsd-phase-boundary.sh、gsd-session-state.sh）只做简单文件操作，复杂逻辑都用 .js |
| 文本分析 | jieba | pkuseg | pkuseg 虽然精度略高但停止维护，安装复杂，jieba 是事实标准且持续维护 |
| 文本分析 | jieba | LAC (Baidu) | 依赖 PaddlePaddle，安装重，对写作系统过度 |
| 数据格式 | Markdown + YAML frontmatter | JSON 文档 | JSON 不适合人类阅读和编辑写作内容。Claude Code 的 Read 工具对 Markdown 有更好的显示效果 |
| 代理编排 | Claude Code Agents | LangChain / CrewAI | 不在 Claude Code 生态内运行，增加复杂度，且无法利用 CLI 的内置工具链 |
| 子代理模型 | inherit / sonnet | 总是使用 opus | opus 慢且贵。写作代理用 inherit（跟随主会话），简单检查用 sonnet，只有终审需要深度推理时才用 opus |
## 不使用的技术（及原因）
| 技术 | 不使用的原因 |
|------|-------------|
| **Web 框架（Express/FastAPI）** | 系统完全在 CLI 内运行，不需要 HTTP 服务 |
| **数据库（SQLite/PostgreSQL）** | 写作状态用文件管理，符合 Claude Code 的文件即状态哲学 |
| **Docker** | 不需要容器化，直接在本地 Claude Code 环境运行 |
| **TypeScript** | Hooks 脚本足够简单，不需要类型系统。纯 JavaScript 减少构建步骤 |
| **npm 包管理** | 只使用 Node.js 内置模块，不需要 package.json |
| **LangChain / LlamaIndex** | 不需要 LLM 编排框架，Claude Code CLI 本身就是编排层 |
| **Electron / Tauri** | 明确 Out of Scope：不做 GUI |
| **CI/CD（GitHub Actions）** | 不存在构建步骤，不需要持续集成 |
| **Git 分支策略** | 项目配置 `branching_strategy: "none"`，不需要分支管理 |
## 安装步骤
# Phase 1 安装（基础）
# Phase 2 安装（文本分析）
# Phase 3 可选安装
# Node.js 依赖：无
# 无需 npm install，所有 hooks 使用 Node.js 内置模块
## 与 GSD 工具链的兼容性
| GSD 组件 | SGO 对应组件 | 复用方式 |
|----------|-------------|----------|
| GSD Agents (24个) | SGO Agents (4-6个) | 新建，不修改 GSD |
| GSD Hooks (8个) | SGO Hooks (4-6个) | 新建，不与 GSD hooks 冲突 |
| GSD Commands | SGO Commands | 新建，`sgo-` 前缀避免冲突 |
| GSD `.planning/` | SGO `.sgo/` | 独立目录，互不干扰 |
## 环境信息（已验证）
| 项目 | 值 | 状态 |
|------|-----|------|
| Claude Code CLI | 2.1.100 | 已安装，所有特性可用 |
| Node.js | v24.13.0 (Active LTS) | 已安装 |
| npm | 11.6.2 | 已安装（但不需要） |
| Python | 3.11.10 | 已安装（通过 pyenv） |
| pip | 24.0 | 已安装 |
| 操作系统 | Linux 6.19.8 (Fedora 43) | 已验证 |
| GSD 工具链 | 已安装 | `~/.claude/get-shit-done/` 存在 |
## 技术风险
| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Claude 上下文窗口限制（长篇写作） | 高 — 10万字以上作品可能超出单会话容量 | 使用 STATE.md 会话延续机制，按章节分段处理，SubagentStop hook 触发自动保存 |
| jieba 分词精度对文言文/古风文本不够 | 中 — 文言文占比高的作品分析不准 | 作为 MEDIUM 置信度标记，Phase 3 可考虑自定义词典或专用规则 |
| Hooks 60秒超时限制 | 低 — 复杂一致性检查可能超时 | 将耗时分析放在 Python 脚本中异步执行，hook 只负责触发和读取结果 |
| Node.js 内置模块功能有限 | 低 — 复杂 JSON 操作不便 | 保持 hooks 逻辑简单，复杂逻辑放在 Python 工具中 |
## 来源
- Claude Code Hooks 参考文档: https://docs.anthropic.com/en/docs/claude-code/hooks （置信度：HIGH）
- Claude Code 斜杠命令文档: https://docs.anthropic.com/en/docs/claude-code/slash-commands （置信度：HIGH）
- Claude Code 子代理文档: https://docs.anthropic.com/en/docs/claude-code/sub-agents （置信度：HIGH）
- Claude Code 记忆管理文档: https://docs.anthropic.com/en/docs/claude-code/memory （置信度：HIGH）
- Claude Code 设置文档: https://docs.anthropic.com/en/docs/claude-code/settings （置信度：HIGH）
- Claude Code 教程文档: https://docs.anthropic.com/en/docs/claude-code/tutorials （置信度：HIGH）
- Node.js 发布版本表: https://nodejs.org/en/about/previous-releases （置信度：HIGH）
- 本地系统环境验证（node --version, python3 --version, claude --version）（置信度：HIGH）
- GSD 工具链结构分析（~/.claude/get-shit-done/ 目录）（置信度：HIGH）
- jieba 中文分词：训练数据知识，中文 NLP 事实标准（置信度：MEDIUM，未通过在线源验证当前版本）
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
