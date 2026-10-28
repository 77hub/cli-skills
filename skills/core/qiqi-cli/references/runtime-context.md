# qiqi、Profile 与错误上下文

## 确认 qiqi

命令缺失或含义不确定时，先执行 `qiqi --version` 和 `qiqi --help`。需要版本与连接详情时用 `qiqi --version --format json`，没有 `version` 子命令。帮助中没有公开的选项和子命令不要使用。

## Profile 与身份

一个 profile 对应一个企业下的一个用户身份。

- profile 不明确时，用 `auth list` 选定目标；业务命令显式传 `--profile <switch-ref>`，避免改动默认身份。
- 需要在线核验，或出现认证、授权失败时，用 `auth status` 核对企业和用户是否与请求一致。`auth status --offline` 只读本地状态，不能证明身份仍然有效。
- `auth login` 成功和 `auth switch <switch-ref>` 都会把该身份设为默认，影响之后所有未指定 `--profile` 的命令；只有用户明确要求更换默认身份时才执行 `auth switch`。
- 身份过期或未登录时，停止业务操作，按 qiqi 提示重新授权；不索取或输出凭据。

身份确认只说明“以谁的名义调用”，不代表某条记录或动作一定有权限。

## 默认工作组织

日常操作沿用当前默认组织。用户要求查看或切换，或 CLI 提示需要选择组织时：

1. `qiqi context show` 查看当前上下文。
2. `qiqi context options org` 查看可选组织，按名称、编码和上级确认目标。
3. `qiqi context set org <org-id>` 设置。目标不明确时，先请用户选择。

该设置只影响当前 profile 的后续命令，与网页端的组织切换互不影响。目前只有组织可以设置；业务日期、角色和语言只读。

## 错误处理

向用户说明错误时，保留 qiqi 返回的 `code`、`message` 和 `requestId`，不暴露凭据。

- `CLI_USAGE_ERROR` 表示命令或参数写错了，不是业务拒绝。按 `error.problems` 的 `path`、`message`、`expected` 修正，再按提示查看命令帮助。
- 记录不存在和无权访问可能返回同一种错误，不据此推断记录是否存在。
- 使用 `--format json` 时，成功结果输出到 stdout，错误以 JSON 输出到 stderr。
