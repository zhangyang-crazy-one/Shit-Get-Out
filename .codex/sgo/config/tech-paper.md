---
name: tech-paper
display_name: 科技论文
slug: tech-paper
description: "论证严谨、引用完整的学术规范写作，注重研究方法和结论可靠性"
methodology_profile_ref: ".codex/sgo/config/methodology-overrides/tech-paper.json"

scale_defaults:
  default_scale: 短篇
  target_word_count_range:
    min: 5000
    max: 20000
  chapter_structure:
    typical_chapter_words: "按论文结构分段"
    volumes_enabled: false

research_strategy:
  focus_areas:
    - "文献综述：主题相关的最新研究文献、学术前沿动态和已有工作梳理（极高需求）"
    - "研究方法：适合该主题的研究方法论参考（实验设计、数据分析、理论框架等）"
    - "领域标准：引用格式（APA/IEEE/GB等）、学术写作规范、同行评审标准"
  web_search_enabled: true
  max_searches: 8
  claude_knowledge_weight: 0.2
  degradation_note: "当 Web 搜索不可用时，完全依赖 Codex 自身知识完成调研，在报告中标注'基于 Codex 知识，未进行 Web 验证'。科技论文对文献引用要求极高，建议在搜索可用时尽量多搜索"

constitution_defaults:
  iron_rule_categories: [rigor, citation, originality, methodology]
  key_prohibitions: ["无引用支撑的主张", "抄袭或未标注引用"]

writing_flow:
  pov_default: "学术第三人称"
  pacing_pattern: "论证递进式（引言->方法->结果->讨论的 IMRaD 结构）"
  chapter_hook: false

quality_rules:
  consistency_checks: [citation, methodology, logic, terminology]
  scoring_weights:
    rigor: 0.3
    citation: 0.25
    originality: 0.25
    clarity: 0.2

template_variants:
  tech-paper: |
    # 论文标题

    ## 摘要
    （200-300字，涵盖研究背景、方法、结论）

    ## 关键词
    （3-5个关键词）

    ## 章节结构（IMRaD）
    1. 引言
    2. 方法
    3. 结果
    4. 讨论
    5. 结论

    ## 引用标注
    （[1] 格式的引用标记）
---

# 科技论文

## 核心惯例

- **IMRaD 结构**：引言-方法-结果-讨论，或按领域惯例。这是科技论文的骨架——引言说明研究背景和问题、方法说明如何研究、结果呈现发现、讨论解释意义和局限。某些领域可能使用变体结构，但逻辑链条必须完整
- **论证严谨**：每个主张必须有证据或引用支撑。"众所周知"、"一般认为"这类模糊表述在科技论文中不可接受——要么给出数据，要么引用文献，要么标注为假设
- **引用完整**：引用格式遵循领域标准（APA/IEEE/GB 等）。引用不仅是对前人工作的尊重，更是论文论证链条的一部分——引用质量直接反映研究的深度和广度
- **学术性语言**：精确、客观、避免模糊表述和口语化。学术论文的语言风格不是故作高深，而是追求精确——每个术语都有明确定义，每个结论都有明确前提
- **原创性声明**：必须明确贡献和创新点，区分自己工作与已有工作。论文的价值在于新贡献——无论多小的进步，都必须清晰说明"本文做了什么前人没做的事"

## 写作指南

**章节模板指引：**

- **IMRaD结构严格遵循**：引言(背景/动机) -> 方法 -> 结果 -> 讨论 -> 结论，逻辑链条必须完整
- **摘要规范**：200-300字涵盖研究背景、方法、结论，避免使用缩写和专业术语
- **引用标注**：正文使用[1][2]格式引用，引用文献列表按时间或字母排序
- **术语一致性**：全文使用统一的术语表，避免同一概念使用不同名称
- **原创性声明**：在结论部分明确说明本文的创新点和贡献，与已有工作区分

## 禁忌清单

- 无引用支撑的主张
- 口语化或模糊表述
- 抄袭或未标注引用
- 区分不清自己工作与已有工作
