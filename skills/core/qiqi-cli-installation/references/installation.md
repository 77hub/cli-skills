# Production 安装

安装正式 CLI，并独立核验 binary：

```sh
npm install --global @77hub/cli@latest
qiqi --version
```

再完成 production OAuth：

```sh
qiqi auth login --method oauth --name production
```

登录成功会保存新身份或更新同一企业和用户的已有身份，并将该身份设为默认身份。

默认 `auto` 会先验证系统密钥库。若返回 `CREDENTIAL_STORE_SELECTION_REQUIRED`，不得按 Agent 品牌猜测可用存储，也不得自动改用文件。只有用户确认登录进程与后续进程属于同一 OS 用户、同一 qiqi 渠道并可访问同一稳定用户配置目录，且明确接受 `user-file` 依赖该用户文件权限、保护强度不等同于系统密钥库后，才执行：

```sh
qiqi auth login --method oauth --name production --credential-store user-file
```

浏览器授权页完成不等于登录事务完成；必须等待 CLI 输出登录成功。然后在实际目标终端的新进程中在线验证：

```sh
qiqi auth status
```

只有在线验证成功才表示后续可持续调用。`auth status --offline` 的 `verified=false` 只是本地摘要，不能替代。

API Key 与 OAuth 只是授权模式不同。选择 API Key 时，先由用户在企企“设置 → CLI 管理”中创建 Key；密钥只通过安全终端提示或 `--credential-stdin` 输入，不得出现在命令参数、对话或文档中。非交互环境若需要 `user-file`，仍须先取得上述明确同意，再显式添加 `--credential-store user-file`。

Agent Skills 是面向 AI 客户端的可选增强，不是 CLI 或授权前置条件。建议配套安装，以获得更好的业务理解和使用效果；先说明其作用并由用户确认是否需要，只有用户确认后才使用受治理公共来源单独安装：

```sh
npx --yes skills@1.5.9 add https://github.com/77hub/cli-skills --global --skill "*" --full-depth
```

该命令省略 `--agent`，由 Skills CLI 在实际执行环境中自动识别当前 Agent；Agent 识别只用于 Skills 安装位置，不得影响 qiqi 凭证 provider。不得使用 `--all`。公开全量集合包含 `qiqi-cli-installation`、`qiqi-cli`、`qiqi-business-foundations` 和 `qiqi-project`，复制或更新 Skill 文件不会执行其内容。
