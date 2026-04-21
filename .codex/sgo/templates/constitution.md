---
# === 必填字段 ===
constitution_version: 1         # 宪法版本
status: draft                   # draft | locked（锁定后不可变）
locked_at: null                 # 锁定时间（null = 未锁定，ISO-8601）

# === 类型信息 ===
genre: ""                       # 写作类型（网络小说/短篇/言情/科幻/侦探/论文等）
genre_config_ref: ""            # 类型配置文件路径

# === 铁律层（不可违反） ===
iron_rules: []
# 每条铁律含: id, category, rule, rationale
# category: pacing | character | style | worldview | plot

# === 指南层（建议性） ===
guidelines: []
# 每条指南含: id, category, rule, priority(high/medium/low)

# === 禁忌清单 ===
prohibitions: []
# 每条禁忌含: id, description, reason

# === 风格锚定 ===
style_anchor: ""
# 引用风格锚定文档路径或内联描述

created_at: null                # 创建时间（ISO-8601）
updated_at: null                # 最后更新时间（ISO-8601）
---

# 创作宪法

> 本文件定义的创作规则一经锁定，不可违反。所有章节写作必须遵守铁律层，建议遵守指南层，绝不可触碰禁忌清单。

## 铁律层（Iron Rules）

> 以下规则不可违反，违反即视为写作失败。

（由立宪阶段自动填充）

## 指南层（Guidelines）

> 以下规则为强烈建议，写作时应尽量遵守。

（由立宪阶段自动填充）

## 禁忌清单（Prohibitions）

> 以下内容绝不可出现在作品中。

（由立宪阶段自动填充）

---

*创作宪法由 SGO 写作系统生成*
