---
name: short-story
display_name: 短篇小说
slug: short-story
description: "单线结构的精短小说，注重意境营造和情节精巧，3000-30000字"

scale_defaults:
  default_scale: 短篇
  target_word_count_range:
    min: 3000
    max: 30000
  chapter_structure:
    typical_chapter_words: "全文一气呵成，不分章"
    volumes_enabled: false

research_strategy:
  focus_areas:
    - "题材背景：主题相关的背景知识和氛围素材"
    - "参考作品：同类短篇大师的技巧分析（如欧亨利式结尾、海明威冰山理论）"
    - "核心意象：可贯穿全文的象征性意象或物件"
  web_search_enabled: true
  max_searches: 3
  claude_knowledge_weight: 0.5
  degradation_note: "当 Web 搜索不可用时，完全依赖 Claude 自身知识完成调研，在报告中标注'基于 Claude 知识，未进行 Web 验证'"

constitution_defaults:
  iron_rule_categories: [style, theme, structure]
  key_prohibitions: ["废话和无用场景", "说教式结尾"]

writing_flow:
  pov_default: "灵活（依主题选择）"
  pacing_pattern: "紧凑推进，每场景都有功能"
  chapter_hook: false

quality_rules:
  consistency_checks: [theme, style, symbolism]
  scoring_weights:
    narrative: 0.2
    character: 0.2
    pacing: 0.2
    style: 0.4

template_variants:
  short-story: |
    # 短篇标题

    ## 核心意象
    （贯穿全文的象征性意象）

    ## 情节序列
    （单线结构，开头直入主题，结尾精巧收束）

    ## 伏笔标记
    （象征性伏笔，物件/意象反复出现）
---

# 短篇小说

## 核心惯例

- **单线结构**：三幕式但高度压缩，开头直入主题，结尾精巧收束。没有空间容纳副线，每一条线索都必须为主线服务
- **紧凑节奏**：无废话，每一个场景都推动情节或揭示角色。如果一个场景删除后故事不受影响，那么它不该存在
- **少而精的角色**：3-10人，每个人物都有明确功能。短篇小说中出场一个多余角色，比长篇中出场十个更致命
- **短伏笔**：几段内埋设+回收；象征性伏笔（物件/意象反复出现）。短篇的伏笔不需要跨越章节，但需要精巧——读者回头翻看时应该能发现
- **冰山理论**：意境精巧，"说三分留七分"——留白比说透更有力量。海明威的冰山理论在短篇中体现得最为极致：文字之下是未说出口的深意

## 写作指南

**章节模板指引：**

- **核心意象章节结构**：在首段建立象征性意象，中间通过意象的重复变化推进情节/情感/思想，结尾以意象的升华或转折达成精巧收束
- **冰山原则**：每段文字下应有三倍于文字的潜台词——留白比说透更有力量，节制比铺陈更能打动人心
- **节奏控制**：3000-30000字的作品，不分章，一气呵成；每个场景必须推动情节或揭示角色，否则删除
- **结尾技巧**：反转式结尾（参考欧亨利）、留白式结尾、象征升华式结尾；避免说教式结尾

## 禁忌清单

- 冗长铺垫
- 角色功能不明确
- 主题分散
- 刻意文艺矫揉造作
- 说教式结尾
