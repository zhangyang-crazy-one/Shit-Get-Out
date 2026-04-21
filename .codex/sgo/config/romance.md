---
name: romance
display_name: 言情小说
slug: romance
description: "以情感发展为核心驱动的小说，注重角色代入感和虐甜节奏控制"

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
    - "情感弧线设计：虐甜节奏参考、情感冲突模式（相遇->误解->确认->考验->HEA）"
    - "参考作品：同类热门言情作品的分析，重点关注角色关系和情感节奏"
    - "角色代入感：男女主性格设定和互动模式参考"
  web_search_enabled: true
  max_searches: 4
  claude_knowledge_weight: 0.4
  degradation_note: "当 Web 搜索不可用时，完全依赖 Codex 自身知识完成调研，在报告中标注'基于 Codex 知识，未进行 Web 验证'"

constitution_defaults:
  iron_rule_categories: [emotion, character, pacing, plot]
  key_prohibitions: ["违反 HEA/HFN 核心承诺", "感情线无波折"]

writing_flow:
  pov_default: "双视角（男女主交替）"
  pacing_pattern: "虐甜节奏（甜蜜后接虐心，虐心后给糖）"
  chapter_hook: true

quality_rules:
  consistency_checks: [character, emotion, foreshadow]
  scoring_weights:
    narrative: 0.2
    character: 0.35
    pacing: 0.25
    style: 0.2

template_variants:
  romance: |
    # 第N卷 第M章 章节标题
    ## 视角标注
    【女主视角】/ 【男主视角】/ 【上帝视角】

    ## 情感节拍
    - 当前情感状态：[甜蜜/虐心/转折]
    - 情感强度：1-10
    - 触发事件：

    ## 虐甜节奏
    （记录本章在虐甜循环中的位置）
---

# 言情小说

## 核心惯例

- **情感驱动**：主情节由情感发展驱动；常见模式（相遇->误解->确认->考验->HEA/HFN）。外部的冒险、商战、宫斗都只是情感发展的舞台
- **虐甜节奏**：甜蜜后接虐心，虐心后给糖；情感曲线有明确波峰波谷。持续甜蜜会让读者腻烦，持续虐心会让读者弃文——节奏控制是言情写作的核心功力
- **双视角交替**：男女主交替 POV 非常常见，增强代入感。同一事件从两个视角呈现，读者获得"全知但角色不知"的戏剧性信息差
- **HEA/HFN 承诺**：HEA（Happily Ever After）或 HFN（Happy For Now）——言情类型的核心承诺，不可违反。读者选择言情就是期待一个温暖结局，打破这个承诺等于背叛读者信任
- **角色成长**：主角有明确的情感创伤/成长需求；感情线推动角色变化。最好的言情不是两个完美的人在一起，而是两个有缺陷的人因为彼此变得更好

## 写作指南

**章节模板指引：**

- **视角切换**：每章明确标注当前视角【女主视角】/【男主视角】/【上帝视角】，双视角章节需在切换处明确标记
- **情感节拍记录**：章节开头标注当前情感状态（甜蜜/虐心/转折）和情感强度（1-10），结尾记录触发事件
- **虐甜节奏**：每3-5章完成一个虐甜循环；持续甜蜜超过5章需警惕，读者需要情感波折来保持投入
- **情感转折处理**：虐心场景后必须有情感释放（给糖），不能连续虐心超过3章
- **HEA保证**：结尾必须兑现HEA或HFN承诺，言情类型的核心契约不可打破

## 禁忌清单

- 违反 HEA/HFN 核心承诺（这是言情类型的底线）
- 感情线无波折
- 角色情感缺乏成长弧线
