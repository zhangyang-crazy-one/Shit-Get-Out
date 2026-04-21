---
# === 必填字段 ===
report_version: 1
status: draft                 # draft | completed
genre: ""                     # 识别的写作类型（slug，对应类型配置文件的 slug 字段）
scale: ""                     # 判定的规模（短篇/中篇/长篇）
topic: ""                     # 用户输入的主题原文
genre_config_ref: ""          # 类型配置文件路径（如 .claude/sgo/config/web-novel.md）

# === 调研元数据 ===
research_date: null           # 调研完成日期（ISO-8601）
web_searches_performed: 0     # 执行的 Web 搜索次数
web_search_degraded: false    # 是否因 WebSearch 不可用而降级为纯 Claude 知识
sources_consulted: []         # 引用来源列表

created_at: null
updated_at: null
---

# 调研报告：{主题}

## 背景知识
<!-- 领域相关的背景知识、历史脉络、理论基础 -->
<!-- 本章节为立宪引擎提供世界观基础 -->

## 创作素材
<!-- 可直接用于创作的具体素材：场景描述、对话模板、细节参考 -->
<!-- 本章节为构架引擎提供素材库 -->

## 类型特征分析
<!-- 本类型的写作惯例、读者期待、经典结构模式 -->
<!-- 本章节为立宪引擎提供类型特征约束 -->

## 参考作品/文献
<!-- 同类型代表作分析，提炼可借鉴的技巧 -->
<!-- 分析要点：结构、节奏、角色设计、伏笔布局、风格特色 -->

## 关键约束
<!-- 世界观规则、时间设定、技术限制等必须在创作中遵守的约束 -->
<!-- 本章节直接转化为宪法铁律 -->

## 规模判定依据
<!-- 为什么判定为此规模：类型默认值 + 主题复杂度分析 -->
<!-- 说明选择的 scale 和 target_word_count 的理由 -->
