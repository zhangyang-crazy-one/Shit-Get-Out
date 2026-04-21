---
# === 必填字段 ===
outline_version: 1              # 大纲版本号
total_volumes: 1                 # 总卷数（长篇启用，短篇为1）
total_chapters: 0               # 总章数（短篇为0，使用场景编号）
target_word_count: 0            # 目标总字数
status: draft                   # draft | locked
genre_config_ref: null          # 类型配置引用（如 ".claude/sgo/config/short-story.md"）

# === 结构信息 (D-01) ===
# 根据 scale_defaults.volumes_enabled 条件选择结构类型
structure_type: "三幕结构"       # 三幕结构 | 场景段列表 | 卷/章两级
# volumes_enabled=false 时使用 scene-based act_breakdown
# volumes_enabled=true 时使用 chapter-based act_breakdown

# 短篇结构（volumes_enabled=false）
# 使用场景段列表格式：
#   structure_type: "场景段列表"
#   act_breakdown:
#     act1_scenes: "1-3"
#     act2_scenes: "4-7"
#     act3_scenes: "8-9"

# 长篇结构（volumes_enabled=true）
# 使用卷/章两级格式：
#   structure_type: "卷/章两级"
#   act_breakdown:
#     act1_chapters: "1-30"
#     act2_chapters: "31-80"
#     act3_chapters: "81-120"

act_breakdown:
  # 场景段列表格式（短篇）
  # act1_scenes: ""             # 第一幕场景范围（如 "1-3"）
  # act2_scenes: ""             # 第二幕场景范围（如 "4-7"）
  # act3_scenes: ""             # 第三幕场景范围（如 "8-9"）

  # 卷/章两级格式（长篇）
  # act1_chapters: ""           # 第一幕章节范围（如 "1-30"）
  # act2_chapters: ""           # 第二幕章节范围（如 "31-80"）
  # act3_chapters: ""           # 第三幕章节范围（如 "81-120"）

# === 章节依赖 (D-01) ===
# 灵活跳跃写作模式的依赖标注
# 格式: chapter_id: [依赖的chapter_id列表]
# 无依赖章节: []
# 有依赖章节: ["ch-1"] 或 ["ch-1", "ch-3"]
chapter_dependencies: {}
# 示例:
#   ch-1: []              # 无依赖，可首先写作
#   ch-2: ["ch-1"]        # 依赖 ch-1
#   ch-3: ["ch-1", "ch-2"] # 依赖 ch-1 和 ch-2
#   ch-4: ["ch-2"]        # 可与 ch-3 并行（都依赖 ch-2）

# === 伏笔网络 (D-02) ===
# GSD风格的伏笔追踪机制
# 状态机：plant_status (pending → planted)
#          collect_status (pending → verified | failed)
# 验证方式：verification_method (auto | human_needed)
#          verification_state (pending → confirmed | failed)
foreshadow_plan: []
# 每项含:
#   - id: 伏笔编号（如 "FS-001"）
#   - description: 伏笔描述
#   - plant_location: 铺设位置（如 "scene-1" 或 "ch-1"）
#   - plant_status: pending | planted
#   - collect_location: 回收位置（如 "scene-8" 或 "ch-15"）
#   - collect_status: pending | verified | failed
#   - verification_method: auto | human_needed
#   - verification_state: pending | confirmed | failed

# === 角色设计 (D-03) ===
# 规模自适应角色设计
# 短篇：精简角色卡（name, role, description, dialogue_style）
# 长篇：完整角色设计（name, role, personality, appearance, arc_summary, relationships, dialogue_style）
characters: []
# 每项含:
#   - name: 角色名
#   - role: 功能定位（如 "protagonist" | "功能=读者视角"）
#   - description: 一句话描述
#   - dialogue_style: 对话风格（如 "理性克制" | "过于正式"）
# 长篇额外字段:
#   - personality: 性格特征
#   - appearance: 外貌描写
#   - arc_summary: 角色弧线（起点→转折→终点）
#   - relationships: 关系列表

# === 情感弧线 (D-05) ===
# 情感节点规划，使用隐式表达适配冰山理论
emotional_arc: []
# 每项含:
#   - character: 角色名
#   - chapter_range: 章节/场景范围（如 "1-3" | "10-end"）
#   - emotion: 主导情感（如 "理性" | "困惑" | "动摇" | "重新定义"）
#   - intensity: 情感强度（1-10）
#   - trigger: 触发事件
#   - display_method: implicit | explicit（隐式通过行为/细节暗示，显式直接描写）

created_at: null                # 创建时间（ISO-8601）
updated_at: null                # 最后更新时间（ISO-8601）
---

<!--
====================================================
规模自适应大纲模板
====================================================

使用说明：
1. 根据 genre_config_ref 指向的类型配置确定 structure_type
2. volumes_enabled=false → 使用 "场景段列表" 格式（短篇）
3. volumes_enabled=true → 使用 "卷/章两级" 格式（长篇）
4. 大纲内容使用 Markdown 格式撰写，伏笔使用【伏笔:FS-XXX】标记

====================================================
-->

# 故事大纲

### 章节依赖说明 (D-01)

写作采用**灵活跳跃模式**：
1. 优先写无依赖或依赖已完成的章节
2. 章节依赖关系必须显式标注在此处
3. 依赖必须形成有向无环图（不能循环依赖）
4. 短篇作品无需此字段（单线结构）

**示例依赖关系：**
```
ch-1: []
ch-2: ["ch-1"]
ch-3: ["ch-1"]
ch-4: ["ch-2", "ch-3"]
ch-5: ["ch-4"]
```
这表示：ch-1 可首先写作，ch-2 和 ch-3 依赖 ch-1，ch-4 依赖 ch-2 和 ch-3，ch-5 依赖 ch-4。

---

## 第一幕：开端

<!-- 铺设世界观、引入主角、建立核心冲突 -->

### 场景/章节规划

（由 sgo-outliner Agent 自动填充）

**伏笔铺设：**
- 【伏笔:FS-XXX】在此场景埋设的伏笔

## 第二幕：发展

<!-- 升级冲突、角色成长、伏笔铺设 -->

### 场景/章节规划

（由 sgo-outliner Agent 自动填充）

**伏笔铺设：**
- 【伏笔:FS-XXX】在此场景埋设的伏笔

## 第三幕：高潮与结局

<!-- 伏笔回收、高潮冲突、主题升华 -->

### 场景/章节规划

（由 sgo-outliner Agent 自动填充）

**伏笔回收：**
- 【伏笔:FS-XXX】在此场景回收的伏笔

---

## 附录：伏笔网络总览

| ID | 描述 | 状态 |
|----|------|------|
| FS-001 | （示例）机器人异常反应（侧头） | pending→pending |
| FS-002 | （示例）测试数据异常 | pending→pending |
| FS-003 | （示例）测试员的隐秘质疑 | pending→pending |

---

*大纲由 SGO 写作系统生成*
