---
name: qiqi-cli
description: 使用已就绪的 qiqi 命令处理企企服务业ERP通用工作。需要核对身份与 profile、查看或切换默认工作组织、发现对象和字段、查询记录或已有报表、聚合统计或工作视图、处理分页和大输出、判断能否创建、新建或修改单据与档案、执行单据或审批动作、删除记录、处理附件，或核查结果不明确的写入时使用。
---

# 企企服务业ERP qiqi

本 Skill 处理已安装并已授权的 `qiqi`。安装、升级、首次授权或新增登录身份由 `qiqi-cli-installation` 处理。

命令和参数以 `qiqi --help` 及目标命令的 `--help` 为准；当前企业有哪些对象、字段、候选值、视图、动作和报表，以 `objects`、`describe`、`query` 的返回为准。本文示例不是完整契约。用户要做的事当前 qiqi 做不到时，停止操作并说明缺口，不构造替代请求。

## 按需检查

以下检查只在条件出现时执行。同一任务中身份和连接没有变化、也没有授权失败时，复用已确认的身份；目标和命令都明确的简单只读任务可以直接执行。

| 条件 | 检查 |
| --- | --- |
| profile 不明确 | `auth list` 选定目标，业务命令显式传 `--profile` |
| 需要核验身份，或认证、授权失败 | 用目标 profile 执行 `auth status` |
| 命令、对象、字段、值、视图或动作不明确 | 读取对应 `--help`，按需使用 `objects`、`describe`、`query` |
| 名称、单号、人员不唯一 | 先列出候选并消歧；写入只用稳定 `RecordRef`、唯一编码或可验证关系 |
| 需要完整集合或统计 | 明细全集走分页 `query list`；合计、分组走 `query aggregate`；不用第一页或本地加总代替 |
| 写入超时、断连或返回不明确 | 标记“状态未知”，先查业务事实，不直接重试 |

## 能力路由

| 意图 | 使用 |
| --- | --- |
| 查看或核对身份 | `auth list`、`auth status` |
| 查看或切换默认工作组织 | `context show`、`context options org`、`context set org <org-id>`，见 [运行上下文](references/runtime-context.md) |
| 发现对象类型 | `objects` |
| 查看字段类型和时间语义 | `describe fields` |
| 查看常用字段和少量样例 | `describe list` |
| 按文本跨对象找候选 | `seek` |
| 按条件查询记录 | `query list` |
| 合计、分组统计或度量互比 | `query aggregate` |
| 查询当前企业已有的报表 | `describe reports`、`describe report`、`query report`，见 [报表查询](references/report-query.md) |
| 查找枚举或引用候选值 | `query values` |
| 工作台预置视图（如我的单据、待我审批） | 先 `describe view` 匹配，再 `query view` |
| 读取或删除记录，执行提交、审批等动作 | `records get`、`records delete`、`describe actions`、`do-action` |
| 判断能否新建、新建或修改单据和档案 | `describe creation`、`records create`、`records update`，见 [新建与修改](references/create-and-edit-records.md) |
| 处理附件 | `records attachments list/url/upload/delete` |
| 专用业务命令 | 从 `qiqi --help` 的「业务命令」起逐级找到叶子命令 |

用户明确要求已有报表、或流程指定了报表时才用报表命令；不要仅凭“毛利率”等通用词就选定报表。视图未匹配时不要猜 `viewId`，也不要逐个对象用 `query list` 去拼出同一视图。

提交、撤回、同意、驳回是记录上的动作，走 `describe actions` 与 `do-action`。调用成功或返回 `data={}` 不能证明已提交、审批完成或已付款，需要时用 `records get` 回读状态。

## 读取与输出

- 要取 ID、金额、问题或下一步来继续操作时，加 `--format json`。新建预览和报表默认输出文字摘要或表格，内容可能被截短，不能从中摘取值。只是给用户看少量结果时，可以用默认输出。
- 文件和终端统一使用 UTF-8；出现乱码时先把终端切到 UTF-8 再重新执行只读命令，不猜测字符。
- 内部查询保留字段的 `apiName`；对用户说明时使用元数据返回的对象标题和字段标题。标题缺失、不唯一或用户询问时再附 `apiName`，不自行翻译标题或由标题猜 `apiName`。
- 消歧、确认写入和报告结果时，保留唯一业务编码或 `RecordRef`。
- `describe list` 的样例和 `seek` 的候选不是全集，也不能证明唯一。
- 需要全集时持续翻页直到 `hasMore=false`。
- 返回 `77hub.large-output` 时，`summary` 只用于定位；需要明细、问题或下一步时读取 `path` 指向的完整 JSON。
- 没查到可能是筛选、权限、对象未接入或数据不存在造成的；没有更多证据时只说“当前范围未查到”。
- 向用户报告时不捏造或揣测错误原因。
- 遇到升级提醒时提示用户升级。

## 写入纪律

执行前核对企业、用户、目标记录、动作和影响。用户已明确授权且目标、范围和影响没变时，不逐条重复确认；目标不唯一或影响变化时再澄清。

- qiqi 有专用业务命令时，不用名称相近的通用动作代替。
- 收到 `BUSINESS_WARNING` 时，先向用户展示警告，用户明确确认后才加 `--ignore-warn` 重新执行；通用授权不能代替这次确认。
- 删除只在用户明确要求且目标已确认时使用 `--yes`。
- 写入结果不明确时按 [未知结果核查](references/actions-and-recovery.md#未知结果核查) 处理，确认前不重试。
- 用新记录替代旧记录时，仍有效的旧记录要处理或向用户说明。

## 按需读取

- 确认 profile、默认工作组织或解释错误：[runtime-context.md](references/runtime-context.md)
- 发现对象、字段、候选值、视图或读取单条记录：[object-discovery.md](references/object-discovery.md)
- 查询记录列表、构造条件、分页：[list-query.md](references/list-query.md)
- 合计、分组统计：[aggregate-query.md](references/aggregate-query.md)
- 报表：[report-query.md](references/report-query.md)
- 时间值：[temporal-values.md](references/temporal-values.md)
- 新建或修改单据、档案：[create-and-edit-records.md](references/create-and-edit-records.md)
- 提交、撤回、删除或核查未知结果：[actions-and-recovery.md](references/actions-and-recovery.md)
- 审批或附件：[approvals-and-attachments.md](references/approvals-and-attachments.md)
