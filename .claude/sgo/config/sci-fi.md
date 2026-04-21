---
name: sci-fi
display_name: 科幻小说
slug: sci-fi
description: "以科技设定为核心想象力的小说，注重设定自洽、内部一致性是生命线"

scale_defaults:
  default_scale: 长篇
  target_word_count_range:
    min: 200000
    max: 1000000
  chapter_structure:
    typical_chapter_words: "2000-4000"
    volumes_enabled: true

research_strategy:
  focus_areas:
    - "科技设定研究：相关科技领域的真实知识基础和前沿动态（极高需求）"
    - "世界观构建：科技对社会和个人的影响推演，内部自洽性设计"
    - "参考作品：同类科幻作品（硬/软/赛博朋克等子类型）的设定参考和技巧分析"
  web_search_enabled: true
  max_searches: 6
  claude_knowledge_weight: 0.3
  degradation_note: "当 Web 搜索不可用时，完全依赖 Claude 自身知识完成调研，在报告中标注'基于 Claude 知识，未进行 Web 验证'。科幻设定对前沿科技依赖较高，建议在可用时优先搜索"

constitution_defaults:
  iron_rule_categories: [worldview, logic, character, plot]
  key_prohibitions: ["设定自相矛盾", "科技设定缺乏内在逻辑"]

writing_flow:
  pov_default: "第三人称（可多视角切换）"
  pacing_pattern: "设定渐进揭示（前期铺垫世界观，中后期加速）"
  chapter_hook: true

quality_rules:
  consistency_checks: [worldview, logic, foreshadow, technology]
  scoring_weights:
    narrative: 0.25
    character: 0.2
    pacing: 0.2
    style: 0.15
    worldbuilding: 0.2

template_variants:
  sci-fi: |
    # 第N卷 第M章 章节标题

    ## 科技设定标注
    【新设定引入】/ 【设定伏笔】/ 【设定应用】

    ## 世界观状态
    （本章涉及的世界观规则/科技原理）

    ## 伏笔回收
    （早期设定的应用标记）
---

# 科幻小说

## 核心惯例

- **"What if?" 前提驱动**：一个科技假设及其社会/个人影响。优秀的科幻小说始于一个令人兴奋的"如果...会怎样"问题，而非始于一个想炫耀的设定
- **内部一致性是生命线**：无论多么天马行空，设定规则不能自相矛盾。读者可以接受光速旅行，但不能接受第七章说光速不可超越、第二十章主角却超光速了
- **子类型区分**：硬科幻（科学严谨，每个设定有现实科学基础）vs 软科幻（社会/人文探索，科技只是舞台）vs 赛博朋克（高科技低生活、企业统治、数字身份）vs 太空歌剧（宏大叙事、星际政治、英雄史诗）。不同子类型对科技严谨度的要求差异巨大
- **角色在科技影响下的变化**：这是核心冲突源。科技不仅仅是背景板——它应该深刻地改变角色的人生、道德、身份认知
- **设定伏笔**：早期提到的科技/规则在后期发挥关键作用。第一章看似随口提到的技术原理，可能成为最终解决危机的关键

## 写作指南

**章节模板指引：**

- **设定标注体系**：每章标注科技设定的使用状态【新设定引入】/【设定伏笔】/【设定应用】
- **世界观状态追踪**：章节开头明确本章涉及的世界观规则/科技原理，确保前后一致
- **渐进揭示策略**：前期章节（卷1-2）侧重世界观铺垫，中后期逐步加速揭示和冲突升级
- **伏笔回收标记**：当早期设定的技术在当前章节应用时，明确标记伏笔ID
- **科技与人文平衡**：科技设定不仅是背景板，必须展现科技对角色人生、道德、身份的深刻影响

## 禁忌清单

- 设定自相矛盾
- 科技设定缺乏内在逻辑
- 世界观规则随意变更
- 忽略人文维度
