---
name: detective
display_name: 侦探小说
slug: detective
description: "以逻辑推理为核心驱动力的小说，注重线索严密性、公平游戏原则和悬念节奏"

scale_defaults:
  default_scale: 中篇
  target_word_count_range:
    min: 100000
    max: 500000
  chapter_structure:
    typical_chapter_words: "2000-4000"
    volumes_enabled: false

research_strategy:
  focus_areas:
    - "法医学/刑侦知识：案件类型相关的专业背景知识"
    - "逻辑推理模式：经典推理框架和诡计设计参考（密室、不在场证明、叙述诡计等）"
    - "参考作品：推理小说大师作品的线索布局和悬念技巧分析"
  web_search_enabled: true
  max_searches: 5
  claude_knowledge_weight: 0.35
  degradation_note: "当 Web 搜索不可用时，完全依赖 Claude 自身知识完成调研，在报告中标注'基于 Claude 知识，未进行 Web 验证'"

constitution_defaults:
  iron_rule_categories: [logic, plot, pacing, fairness]
  key_prohibitions: ["关键线索最后才出现（违反公平游戏原则）", "侦探靠运气或巧合破案"]

writing_flow:
  pov_default: "第三人称（可使用第一人称作为叙述者/助手视角）"
  pacing_pattern: "线索递进式（线索逐步揭示，悬念层层加码）"
  chapter_hook: true

quality_rules:
  consistency_checks: [logic, clue, timeline, character]
  scoring_weights:
    narrative: 0.2
    character: 0.2
    pacing: 0.25
    style: 0.15
    logic: 0.2

template_variants:
  detective: |
    # 第N章 章节标题

    ## 案件状态
    （本章案件进展：调查/分析/推理/突破）

    ## 线索记录
    【新线索】：发现的新线索
    【线索验证】：已确认的线索
    【红鲱鱼】：可能的误导线索

    ## 推理过程
    （侦探的推理链，从线索到结论）

    ## 伏笔标记
    【伏笔:FS-XXX】铺设的新伏笔

---

# 侦探小说

## 核心惯例

- **公平游戏原则**：读者必须获得足够线索来解开谜题——关键线索不可在最后才出现。这是侦探小说与悬疑惊悚的本质区别：侦探小说邀请读者一起推理，而非故意隐藏信息来制造意外
- **经典结构**：犯罪->调查->线索收集->真相揭示->结局。这个结构可以有变体（倒叙推理先展示凶手再展示侦探如何发现），但核心是推理过程的严密性
- **红鲱鱼管理**：误导性线索必须合理解释。红鲱鱼不是对读者的欺骗，而是对侦探（和读者）推理能力的真正考验——每条假线索被排除时，读者应该感到"推理又进了一步"
- **侦探角色**：有独特方法和缺陷（福尔摩斯的推理+药物依赖、波洛的心理洞察+强迫症）。完美的侦探是无聊的——缺陷让角色鲜活，独特的方法让推理过程有趣
- **极高伏笔要求**：每个线索都是伏笔，必须在真相揭示时呼应。侦探小说的伏笔系统是最精密的——读者重读时应该发现每一个被忽略的线索

## 写作指南

（Phase 8 类型适配阶段填充详细指南）

## 禁忌清单

- 关键线索最后才出现（违反公平游戏原则）
- 侦探靠运气破案
- 逻辑推理有漏洞
- 红鲱鱼无合理解释
