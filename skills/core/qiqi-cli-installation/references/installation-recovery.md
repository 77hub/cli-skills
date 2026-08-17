# 安装验证与恢复

分别报告四项状态：

1. CLI：`qiqi --version` 成功才表示 CLI 已可执行；失败时检查 npm 安装和当前平台 binary。
2. 授权：只有 `auth login` 完整返回登录成功才表示本地登录事务完成；浏览器 OAuth 未完成时报告“等待用户”，不读取、索取、输出或记录令牌。
3. 持续调用：必须在实际目标终端的新进程执行 `qiqi auth status` 并取得在线身份。`--offline`、旧 Profile 或另一个终端的成功不能替代。若 `user-file` 在目标终端不可访问，诚实报告边界不满足，不改写为凭证失效或授权成功。
4. Skills：确认 canonical `SKILL.md` 存在且当前 Agent 客户端实际可读取。自动识别失败、客户端未知或不受支持时停止自动写入，只询问用户一次或遵循该客户端的官方接入路径。

遇到 `CREDENTIAL_STORE_SELECTION_REQUIRED` 时，只能让用户在系统密钥库与显式 `user-file` 风险边界之间做选择。非交互 Agent 不代替用户同意；取得同意后才重试 `--credential-store user-file`。不得把 API Key、Token、本地主密钥或凭证存储完整路径写入输出。

更新 CLI 时重跑 `npm install --global @77hub/cli@latest`；更新 Skills 时只重跑独立 Skills 命令。任何超时、断连或结果不明确都标记“状态未知”，先核验再决定是否重试；Skills 失败不得要求重装 CLI。
