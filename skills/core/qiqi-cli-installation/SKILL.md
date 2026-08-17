---
name: qiqi-cli-installation
description: 安装、更新、重装或修复正式 qiqi，OAuth授权，或为当前 Agent 单独接入企企 Skills 时使用。分别验证 CLI、授权、持续调用和 Skills 结果；测试环境、联调或验收由内部测试运行时适配处理。
---

# 企企服务业ERP qiqi 安装与接入

本 Skill 只负责 production 接入：正式 CLI 安装、OAuth、可选 Agent Skills、验证和恢复。Skills 建议配套安装以获得更好的使用效果，但必须先由用户确认是否需要。CLI、授权、目标终端持续调用和 Skills 是独立结果；不要把任一结果的失败伪装成其它结果的失败或成功。

用户点名测试环境、联调或验收时，停止 production 安装，交给 private develop adapter；不得用 `@77hub/cli` 覆盖测试会话。

## 按需读取

- 需要执行 production 安装、升级、OAuth 或可选 Skills 接入时，读取 [installation.md](references/installation.md)。
- 需要确认当前 Agent、验证 Skills 写入或恢复不明确结果时，读取 [installation-recovery.md](references/installation-recovery.md)。

安装就绪后，身份、查询、动作和结果核验交给 `qiqi-cli`；具体业务语义交给对应领域 Skill。
