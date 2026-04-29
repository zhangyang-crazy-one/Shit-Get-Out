---
# === 必填字段 ===
chapter_number: N               # 章节编号（整数）
title: ""                       # 章节标题
volume: 1                       # 卷号（短篇为 1）
status: draft                   # draft | finalized | published
word_count: 0                   # 字数（由工具自动更新）
created_at: null                # 创建时间（ISO-8601）
updated_at: null                # 最后更新时间（ISO-8601）

# === 写作上下文 ===
narrative_pov: ""               # 叙事视角（第一人称/第三人称/全知等）
scene_location: ""              # 场景地点
active_characters: []           # 活跃角色列表
time_in_story: ""               # 故事内时间点

# === 伏笔追踪 ===
foreshadow_planted: []          # 本章埋设的伏笔ID列表
foreshadow_collected: []        # 本章回收的伏笔ID列表

# === 质量元数据 ===
quality_score: null             # 质量评分（null = 未评分，0-100）
constitution_compliant: null    # 宪法合规（null = 未检查，true/false）
review_notes: ""                # 审校备注
local_result_sources: []        # tech-paper 可选：本章使用的本地结果文件
provenance_status: ""           # tech-paper 可选：none | versioned_result_bundle | raw_run_bundle

# === 风格锚定 (D-02) ===
style_locked: false              # 是否已锁定为风格样本（首章完成后设为 true）
style_anchor_snippet: ""         # 风格锚定片段（首章完成后写入前200字）
style_locked_at: null            # 锁定时间（ISO-8601）
---

# 第{{chapter_number}}章 {{title}}

## 场景正文

<!-- 在此写入章节内容 -->

- 伏笔铺设（如有）：【伏笔:FS-XXX】

---

## 伏笔追踪

<!-- 本章埋设/回收的伏笔 ID 列表，对应 outline.md foreshadow_plan -->

foreshadow_planted: []
foreshadow_collected: []

---

## 风格标注

<!-- 写作完成后，提取本章最具代表性的 200 字作为风格锚定片段 -->
<!-- 仅在 status: style_locked 时填写 -->
<!-- 风格锚定片段将作为后续章节的风格参考 -->

style_anchor_snippet: |
  （写作完成后由 Agent 自动填充）

---

*本章由 SGO 写作系统生成*
