# 登录授权与身份验证

首次使用在 `qiqi --version` 验证成功后继续完成授权。OAuth 与 API Key 是两种并列授权方式，由用户按使用场景选择。

## OAuth 授权

```sh
qiqi auth login --method oauth
```

浏览器授权页是登录流程的一步；等待 CLI 输出登录成功后，本地登录事务才完成。登录成功会保存新身份或更新同一企业和用户的已有身份，并将该身份设为默认身份。

## API Key 授权

用户先在企企“设置 → CLI 管理”中创建 Key，再通过安全终端提示输入：

```sh
qiqi auth login --method api-key
```

非交互环境通过 `--credential-stdin` 传入密钥。命令参数、对话和文档只记录输入方式与脱敏结果。

## 新增登录身份

同一台机器可以保存多个登录身份。需要登录另一个企业或用户时，直接再次执行对应的 `login`：

```sh
qiqi auth login --method oauth
```

或：

```sh
qiqi auth login --method api-key
```

登录结果属于新的企业与用户组合时，qiqi 保存为新身份；属于同一企业和用户时，qiqi 更新已有身份。登录成功的身份会成为默认身份。随后核对本地身份和当前在线身份：

```sh
qiqi auth list
qiqi auth status
```

需要切回其他已保存身份时，从 `auth list` 取得 `switch-ref`：

```sh
qiqi auth switch <switch-ref>
qiqi auth status
```

## 凭证存储选择

默认 `auto` 先验证系统密钥库。返回 `CREDENTIAL_STORE_SELECTION_REQUIRED` 时，向用户说明并由用户选择：

1. 使用当前 OS 用户可访问的系统密钥库。
2. 在登录进程与后续进程属于同一 OS 用户、同一个 qiqi 安装和同一稳定用户配置目录时，选择 `user-file`；该方式依赖用户文件权限，保护强度与系统密钥库不同。

用户确认 `user-file` 边界后执行：

```sh
qiqi auth login --method oauth --credential-store user-file
```

API Key 使用同一存储选择规则，并继续通过安全提示或 `--credential-stdin` 输入。

## 在线身份验证

登录成功后，在实际使用 qiqi 的目标终端启动新进程并执行：

```sh
qiqi auth status
```

在线验证成功表示目标终端能够持续调用。`auth status --offline` 的 `verified=false` 提供本地摘要，适合辅助定位本地 Profile；在线结果负责验证当前身份可用性。

分别报告两项授权结果：

1. 登录授权：`auth login` 完整返回登录成功；浏览器流程仍在进行时报告“等待用户”。
2. 持续调用：目标终端的新进程通过 `qiqi auth status` 取得在线身份。

`user-file` 在目标终端不可访问时，报告“凭证存储边界未满足”，并让用户重新选择可由目标终端访问的存储方式。所有输出仅保留脱敏错误；API Key、Token、本地主密钥和凭证存储完整路径始终留在安全输入与本地存储边界内。
