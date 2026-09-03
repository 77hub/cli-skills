# 项目经营分析查询 playbook

以下路径已使用正式 `qiqi 0.1.6` 和真实租户只读验证。尖括号必须替换为当前企业的真实值；空结果只证明当前筛选未返回记录。

本 playbook 只收录替换真实项目、日期、状态、组织和其它引用值后，在服务端执行成功的命令。`--dry-run`、对象可发现或字段可描述都不能替代实跑；任何字段、关联路径或条件变更后必须重新执行，失败的命令直接移除。

默认使用当前 qiqi 身份。只有用户明确指定非默认身份或身份有歧义时，才按通用 qiqi 规则追加 `--profile`，不在每条业务命令重复。

## 1. 定位唯一项目

名称模糊查询是首选入口：

```shell
qiqi query list Project --fields "id,code,name" --where name contains <project-name> --limit 20 --format json
```

需要补充候选时限定对象类型搜索：

```shell
qiqi seek <project-name-or-code> --type Project --limit 20 --format json
```

`seek` 的相关性可能较宽，不能直接采用第一条。用编码、名称和稳定 ID 核验最终项目：

```shell
qiqi records get Project:<projectId> --fields "id,code,name" --format json
```

同时确认是否包含子项目、财务组织和观察期间。

## 2. 根据用户表述发现企业能力

从用户原话提取能表达其业务阶段或企业术语的关键词，逐个探索；不要固定执行“项目收入”“项目费用”“项目预算”三组搜索。

```shell
qiqi objects <business-term-from-user> --limit 50 --refresh --format json
qiqi describe fields <ObjectType> --format json
qiqi describe list <ObjectType> --format json
```

用户使用企业自定义名称时保留原词，不先翻译成标准对象名。若一个词对应多个阶段，只追问会改变查询对象的歧义。发现和字段描述只证明元数据可见，不证明记录查询可执行。

没有可执行的企业汇总入口时，查询来源单据明细，不提供当前 CLI 查询模型不可执行的对象。

## 3. 单据状态与明细总领规则

默认单据范围为主单 `BillStatus.effective`。只有用户明确要求草稿、审批中、已提交、已关闭、已结案或其它状态，或目标业务口径本身需要包含这些状态时，才改变状态条件并在结果中说明。

项目归属和金额默认取明细对象：

```text
明细.projectId = 目标项目
明细.主单关联.billStatus = BillStatus.effective
金额 = 明细金额字段
日期与组织 = 元数据确认的主单或明细字段
```

一张主单包含多个项目时，表头项目可能为空；因此只查主表 `projectId` 会漏数。先用元数据确认 `isDetail`、父单外键、项目字段和金额字段，再使用真实关联路径。只有确认没有项目明细或项目仅存在于主表时，才按主表查询。

## 4. 查询合同明细

应收、应付合同默认从合同标的明细按项目查询，并在父合同上限定已生效状态：

```shell
qiqi query list ArContractSubjectMatterItem --fields "id,projectId,arContractId,arContract.code,arContract.customVersion,arContract.currencyId,amountWithoutTax" --where projectId eq <projectId> --where arContract.billStatus eq BillStatus.effective --limit 200 --format json
qiqi query list ApContractSubjectMatterItem --fields "id,projectId,apContractId,apContract.code,apContract.customVersion,apContract.currencyId,amountWithoutTax" --where projectId eq <projectId> --where apContract.billStatus eq BillStatus.effective --limit 200 --format json
```

合同版本、变更、赠品、红冲和标的口径确认前不直接求和。

## 5. 查询收入、成本与资金明细

以下查询均以明细项目归属和已生效主单为基础。日期使用 `YYYY-MM-DD`。

收入确认：

```shell
qiqi query aggregate RevenueConfirmationItem --measure sum amountWithoutTax --where projectId eq <projectId> --where revenueConfirmation.billStatus eq BillStatus.effective --where revenueConfirmation.businessDate between <start-date> <end-date> --format json
```

其它应收：

```shell
qiqi query aggregate ArReceiptItem --measure sum amountWithoutTax --where projectId eq <projectId> --where arReceipt.billStatus eq BillStatus.effective --where arReceipt.businessDate between <start-date> <end-date> --format json
```

销售开票：

```shell
qiqi query aggregate InvoiceItem --measure sum amountWithoutTax --where projectId eq <projectId> --where invoice.billStatus eq BillStatus.effective --where invoice.businessDate between <start-date> <end-date> --format json
```

采购发票：

```shell
qiqi query aggregate PurchaseInvoiceItem --measure sum amountWithoutTax --where projectId eq <projectId> --where purchaseInvoice.billStatus eq BillStatus.effective --where purchaseInvoice.businessDate between <start-date> <end-date> --format json
```

项目报销：

```shell
qiqi query aggregate ReimburseItem --measure sum deductedAmount --where projectId eq <projectId> --where reimburse.billStatus eq BillStatus.effective --where reimburse.businessDate between <start-date> <end-date> --format json
```

应付：

```shell
qiqi query aggregate ApPaymentItem --measure sum amountWithoutTax --where projectId eq <projectId> --where apPayment.billStatus eq BillStatus.effective --where apPayment.businessDate between <start-date> <end-date> --format json
```

收款与付款使用明细金额、主单出纳确认日期和主单状态：

```shell
qiqi query aggregate ReceiptItem --measure sum amount --where projectId eq <projectId> --where receipt.billStatus eq BillStatus.effective --where receipt.cashierTime between <start-date> <end-date> --format json
qiqi query aggregate PaymentItem --measure sum apAmount --where projectId eq <projectId> --where payment.billStatus eq BillStatus.effective --where payment.cashierTime between <start-date> <end-date> --format json
```

工时与系统工时成本使用工时明细，并在父工时单上限定已生效：

```shell
qiqi query aggregate TimesheetLine --measure sum hours --measure sum workCost --where projectId eq <projectId> --where timesheet.billStatus eq BillStatus.effective --where dateFrom ge <start-date> --where dateThru le <end-date> --format json
```

该区间条件只纳入完全落在区间内的明细。若企业存在跨越区间边界的工时行，必须先确认拆分或分摊规则，不能把整行全部计入。

## 6. 枚举、组织、分页与下钻

需要其它状态时先取得主单真实枚举：

```shell
qiqi query values <MainObjectType>.billStatus --limit 200 --format json
```

需要按组织筛选时，先通过字段描述确认实际组织字段。例如收入确认单使用 `createdOrgId`：

```shell
qiqi query values RevenueConfirmation.createdOrgId <org-name> --limit 50 --format json
```

聚合异常或用户追问构成时，查询同一明细对象，投影父单稳定引用、主单状态、日期、组织、明细项目和金额。持续分页到 `hasMore=false`；收到大输出引用时读取完整结果。

## 7. 差异分析

```text
合同未确认差额 = 合同阶段金额 - 收入确认阶段金额
确认未开票差额 = 收入确认阶段金额 - 销售开票阶段金额
开票未收款差额 = 销售开票阶段金额 - 对应收款或核销金额
应付未付款差额 = 应付阶段金额 - 对应付款或核销金额
现金净流入     = 已确认收款 - 已确认付款
```

只有项目、期间、组织、币种、税额和状态范围一致，并确认不存在重复或跨期关系时才计算。这些差异是经营观察值，不自动等于利润、应收余额或会计余额。

## 8. 失败边界

- 明细对象或父单关联未确认：回到元数据探索，不退回表头项目猜测。
- 对象未发现：报告当前身份未确认该能力，继续沿用户原词或企业自定义对象探索。
- 字段不存在：以字段描述为准调整对象或明细，不猜相似字段。
- 查询失败：保留错误码和请求标识，不能用空值替代。
- 空结果：只表述当前筛选范围未返回记录。
- 权限或分页不完整：只报告已见范围，不形成全项目结论。
