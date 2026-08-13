# 安装验证与恢复

分别报告三项状态：

1. CLI：`qiqi --version` 成功才表示 CLI 已可执行；失败时检查 npm 安装和当前平台 binary。
2. 授权：`qiqi auth status` 返回在线身份；浏览器 OAuth 未完成时报告“等待用户”，不读取、索取、输出或记录令牌。
3. Skills：确认 canonical `SKILL.md` 存在且当前 Agent 客户端实际可读取。自动识别失败、客户端未知或不受支持时停止自动写入，只询问用户一次或遵循该客户端的官方接入路径。

更新 CLI 时重跑 `npm install --global @77hub/cli@latest`；更新 Skills 时只重跑独立 Skills 命令。任何超时、断连或结果不明确都标记“状态未知”，先核验再决定是否重试；Skills 失败不得要求重装 CLI。
