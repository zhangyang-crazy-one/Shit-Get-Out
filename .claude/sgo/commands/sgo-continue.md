---
name: sgo-continue
description: "从断点恢复写作流程。读取 .continue-here.md 自动识别并继续未完成的阶段。"
allowed-tools:
  - Read
  - Write
  - Glob
  - Agent
model: inherit
---

# SGO 断点续写

从上次停止的位置恢复写作流程。

## 执行步骤

### 第一步：读取断点信息

1. 读取 `.sgo/.continue-here.md` 获取断点上下文：
   - 当前阶段
   - 下一阶段
   - 上下文摘要（类型、主题、已完成制品）
   - 关键约束
2. 读取 `.sgo/STATE.md` 获取完整项目状态
3. 如果断点文件不存在，提示用户使用 `/sgo-status` 查看当前状态

### 第二步：判断恢复点并自动衔接

根据 `.continue-here.md` 中的 `当前阶段` 和 `下一阶段` 确定恢复动作：

| 当前阶段 | 下一阶段 | 恢复动作 |
|----------|----------|----------|
| research | constitution | 使用 `/sgo-start` 从立宪阶段继续 |
| constitution | outline | 使用 `/sgo-start` 从构架阶段继续 |
| outline | validation | 启动 sgo-validator Agent 验证大纲 |
| validation | writing | 启动 sgo-writer Agent 开始写作 |
| writing | finalize | 启动 sgo-finalizer Agent 终审 |
| finalize | done | 仅在 final 状态成立后提示用户使用 `/sgo-export` 发布成品 |

### 第三步：显示恢复上下文

向用户展示恢复信息：
```
=== SGO 断点恢复 ===
上次停止: [停止原因]
当前阶段: [阶段名] (已完成)
下一阶段: [阶段名] (即将执行)
已完成制品: [列表]
关键约束: [摘要]

正在恢复...
```

### 第四步：执行恢复

根据第二步确定的恢复动作，自动调度对应 Agent 或命令继续执行。

恢复完成后更新 `.sgo/.continue-here.md` 为新的断点状态。

## 前置条件

- `.sgo/STATE.md` 必须存在（项目已初始化）
- `.sgo/.continue-here.md` 必须存在（有断点记录）

## 强制约束

- 恢复前必须验证前序阶段的制品确实存在（防止断点文件与实际状态不一致）
- STATE.md 更新必须先 Read 再 Write，保留已有字段值
