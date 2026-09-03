---
name: qiqi-cli-installation
description: 安装、升级、重装或修复 qiqi，排查 npm、PATH 与沙箱可见性问题，完成首次授权或新增登录身份，并验证目标终端持续调用时使用。测试环境、联调或验收由对应测试环境适配处理。
---

# 企企服务业ERP qiqi 安装、升级与登录授权

本 Skill 负责 qiqi 首次安装、升级、重装、npm 取包失败恢复、PATH 与沙箱可见性诊断、首次授权、新增登录身份及在线身份验证。首次使用依次完成 CLI 可执行性和授权可持续性验证，并分别报告结果。

用户明确提出测试环境、联调或验收时，交给对应测试环境适配 Skill；其他安装与授权场景使用本 Skill。

## 按需读取

- 首次安装、升级、重装、npm 取包失败、CLI 缺失或 PATH 恢复，读取 [installation.md](references/installation.md)。
- 首次授权、新增登录身份、凭证存储选择、登录恢复和在线身份验证，读取 [authorization.md](references/authorization.md)。
- 首次使用同时读取两份文档，先验证 `qiqi --version`，再完成授权并验证 `qiqi auth status`。

安装就绪后，身份、查询、动作和结果核验交给 `qiqi-cli`；具体业务语义交给对应领域 Skill。
