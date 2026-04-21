---
name: philosophical
display_name: 哲理小说
slug: philosophical
description: "以思想主题为驱动力的小说，注重文学性和思想深度，通过故事引发思考而非直接给答案"

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
    - "哲学/思想主题深度研究：相关哲学流派、思想家、核心概念"
    - "文学技巧参考：寓言、象征、多视角叙事等手法"
    - "同类作品分析：哲理小说代表作的思想深度和表达技巧"
  web_search_enabled: true
  max_searches: 5
  claude_knowledge_weight: 0.5
  degradation_note: "当 Web 搜索不可用时，完全依赖 Claude 自身知识完成调研，在报告中标注'基于 Claude 知识，未进行 Web 验证'"

constitution_defaults:
  iron_rule_categories: [theme, style, worldview, character]
  key_prohibitions: ["直接说教代替故事", "角色沦为思想传声筒"]

writing_flow:
  pov_default: "灵活（可使用非线性叙事、对话体）"
  pacing_pattern: "思想驱动节奏（冲突服务于思想探讨）"
  chapter_hook: false

quality_rules:
  consistency_checks: [theme, worldview, symbolism]
  scoring_weights:
    narrative: 0.2
    character: 0.2
    pacing: 0.15
    style: 0.45

template_variants:
  philosophical: |
    # 章节标题（可打破传统结构）

    ## 思想脉络
    （本章探讨的核心思想/主题）

    ## 叙事结构
    （线性/非线性/对话体/寓言式标注）

    ## 象征系统
    （本章使用的象征/隐喻元素）
---

# 哲理小说

## 核心惯例

- **思想主题驱动**：而非情节驱动——主题是骨架，情节是血肉。故事中每个事件、每个角色、每段对话都应服务于核心思想的探索和展现
- **灵活结构**：可采用非线性叙事、寓言式结构、对话体等形式。哲理小说不拘泥于传统三幕式——如果思想表达需要打破线性时间，那就打破它
- **有血有肉的角色**：角色是思想的载体，但必须有血有肉——不能是"会说话的概念"。最好的哲理小说角色，读者记住的是他们的故事和情感，而非他们代表的哲学立场
- **高文学性**：语言有质感、意象丰富、象征系统完整。哲理小说对语言的要求高于一般类型——文字本身应该是美的，而不仅仅是思想的容器
- **多角度思辨**：避免说教——通过故事引发思考，而非直接给答案。让不同角色代表不同立场，让读者在观点的碰撞中自己得出结论

## 写作指南

**章节模板指引：**

- **思想脉络优先**：每章明确标注核心思想/主题，所有场景、对话、意象都服务于思想表达
- **结构灵活**：可打破传统三幕式，采用倒叙、插叙、对话体、寓言式等多种叙事方式
- **象征系统构建**：建立贯穿全文的象征性意象/隐喻，通过象征的变化展现思想的深化
- **避免说教**：通过故事引发思考，让角色在行动和对话中展现思想，而非直接陈述
- **文学性语言**：文字本身应具有美感和质感，意象丰富，节奏感强

## 禁忌清单

- 直接说教代替故事
- 角色沦为会说话的概念
- 思想深度不足
- 缺乏故事性
