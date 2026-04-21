---
name: web-novel
display_name: 网络小说
slug: web-novel
description: "多卷多章的长篇网络小说，注重爽感节奏、升级体系和长线伏笔"

scale_defaults:
  default_scale: 长篇
  target_word_count_range:
    min: 200000
    max: 1000000
  chapter_structure:
    typical_chapter_words: "2000-3000"
    volumes_enabled: true

research_strategy:
  focus_areas:
    - "类型惯例：爽点节奏设计（铺垫->冲突->爽点->新铺垫循环）、金手指设定模式、升级体系参考"
    - "参考作品：分析同类型热门作品（最多3部）的结构技巧和节奏设计"
    - "世界观素材：根据主题收集相关设定参考（修炼体系/科技体系/势力划分等）"
  web_search_enabled: true
  max_searches: 5
  claude_knowledge_weight: 0.4
  degradation_note: "当 Web 搜索不可用时，完全依赖 Claude 自身知识完成调研，在报告中标注'基于 Claude 知识，未进行 Web 验证'"

constitution_defaults:
  iron_rule_categories: [pacing, character, worldview, plot]
  key_prohibitions: ["开局长篇铺垫无冲突", "主角动机不明确"]

writing_flow:
  pov_default: "第三人称限制视角"
  pacing_pattern: "爽感循环（铺垫->冲突->爽点->新铺垫）"
  chapter_hook: true

quality_rules:
  consistency_checks: [character, worldview, foreshadow]
  scoring_weights:
    narrative: 0.3
    character: 0.25
    pacing: 0.25
    style: 0.2
  template_variants:
    standard: |
      ## 第{{chapter_number}}章 {{title}}
      
      ### 场景描写
      <!-- 场景设定与氛围营造 -->
      
      ### 冲突事件
      <!-- 主要冲突推动情节 -->
      
      ### 爽点揭示
      <!-- 金手指或升级的爽感时刻 -->
      
      ### 伏笔铺垫
      <!-- 本章埋设的伏笔 -->

template_variants:
---

# 网络小说

## 核心惯例

- **黄金三章**：前三章必须建立核心冲突、展示主角魅力、埋下第一个悬念。这是网络小说的"生死线"——读者是否继续阅读往往在三章内决定
- **升级体系**：清晰的等级划分，每级有明确的质变标志；金手指设定独特且有成长空间。等级不仅是数值提升，更要有本质性的能力跃迁
- **爽感节奏**：每 3-5 章一个小高潮，每卷一个大高潮；避免连续 3 章无冲突。爽感循环的公式：铺垫 -> 冲突 -> 爽点 -> 新铺垫
- **伏笔管理**：长线伏笔跨卷铺设，中线伏笔卷内回收；未回收活跃伏笔不超过 15 个。伏笔回收时应有"恍然大悟"的满足感
- **读者代入**：主角成长曲线让读者有"如果我也能..."的代入感；配角有独立人格，非工具人。主角的金手指要有代价和限制，避免无脑碾压

## 写作指南

（Phase 8 类型适配阶段填充详细指南）

## 禁忌清单

- 开局节奏过慢，三章内未建立冲突
- 主角动机不明确
- 升级体系逻辑自相矛盾
- 配角工具人化（无独立人格）
