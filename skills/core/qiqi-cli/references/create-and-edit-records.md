# 新建与修改业务记录

适用于已开放通用创建的单据和档案，报销单是最常见的对象。各对象特有的填写方式、来源和字段口径由运行时返回的 `guidance`、字段 `hint` 和问题提示给出，按它们执行，不凭经验套用其它对象。

## 先确定要向用户要哪些事实

只为系统无法得出的业务事实提问：

- 做什么业务：对象，以及单据类型对应的业务类别（如差旅、招待、交通）。
- 本次事实：金额、发生日期、数量、事由、明细内容。
- 归属：为谁办理、哪个部门或项目承担。用户未提及时可以先采用系统默认，但须在预览后让用户确认。

编码、申请人联系方式、税额等系统能生成或计算的值不提问。

## 新建

### 1. 确定对象和单据类型

```shell
qiqi describe creation --search <业务名称> --format json
qiqi describe creation <ObjectType> --format json
```

未找到对象时用 `qiqi objects <业务名称>` 补查；仍未找到就告诉用户当前不能通过 qiqi 新建该业务。

返回要求选择单据类型时，每个候选的 `description` 列出该类型可填写的明细。按用户的事实落在哪类明细来选：例如打车、地铁属于市内交通，住宿、长途属于差旅。事实横跨多个类型或都不匹配时，向用户说明候选并请其选择，不默认取第一项。

### 2. 读取填写要求

```shell
qiqi describe creation <ObjectType> --bill-type-id <类型value> --format json
```

重点看：

- `guidance`：本对象的填写方式。例如报销单分为“手工填写费用明细”和“按已进池发票生成”，后者在 `input.groups` 中提供发票分组，细节见 `inputSchema`。
- `fields`、`details`：表头和明细字段。`required=true` 为必填；`access=readOnly` 不填写，包括自动编号的 `code`。
- 字段上的 `candidates`：本次允许选择的范围（如费用科目、报销凭证），按事实从 `value/label` 中选。`complete=false` 表示未列全，结合 `hint` 细化查找。
- `recentRecords.refs`：本人最近创建的同类型数据（单据或档案），可作为填写参考；没有返回时就不参考。

只需查看某个明细时加 `--detail <明细字段名>`。

### 3. 查找取值，按需参考历史

引用字段要填 ID，不填名称。字段已给出 `candidates` 时先从候选中选；没有候选或候选未列全时，用关键词模糊查找：

```shell
# 用户说“记到市场二部”：取名称中有区分度的一段
qiqi query values Reimburse.departmentId 市场 --format json

# 明细字段使用 details[].entityName，例如报销其他明细的费用
qiqi query values ReimburseOther.costId 交通 --format json
```

没有命中时缩短关键词或换同义叫法；命中多项时按 `label` 与用户确认。更多用法见 [查找枚举与引用的取值](object-discovery.md#查找枚举与引用的取值)。

只有在用户事实定不下项目、部门、费用类别等归属，或用户要求“照上次填”时，才读取历史数据：

```shell
qiqi records get <recentRecords中的ref或用户指定的记录> --fields "<相关字段>" --format json
```

历史数据只用于参考归属和分类习惯。金额、日期、数量必须来自本次事实；记录 ID、明细 ID 和状态不复制。

### 4. 写输入文件并预览

把输入写进 UTF-8 文件 `creation.json`。业务字段放在 `data`，来源参数（如报销单的发票分组）放在同级 `input`；普通填写只需 `data`。明细写成数组，一项一行，新建时不写 `id`。以报销单手工填写两条费用明细为例，字段名和值都以本次契约为准：

```json
{
  "data": {
    "description": "10 月客户拜访费用",
    "reimburseOthers": [
      { "costId": "<交通费用value>", "activityDate": "2026-10-20", "originAmount": "86.50" },
      { "costId": "<餐费value>", "activityDate": "2026-10-20", "originAmount": "120.00", "description": "客户午餐" }
    ]
  }
}
```

只填写本次用到的明细，类型不允许的明细不填写。

```shell
qiqi records create <ObjectType> --bill-type-id <类型value> --data-file creation.json --dry-run --format json
```

始终使用 `--data-file`。在 Windows PowerShell 中，内联 JSON 的引号会被吞掉。

每次预览和保存都提交完整输入，系统不会记住上一次的内容。

### 5. 看预览结果，决定下一步

预览不会保存。先核对返回的 `data`：

- 系统补上的申请人、部门、承担组织、项目、费用科目等归属值，与用户的意图是否一致。代人办理、跨部门承担时尤其要向用户确认。
- 金额、日期、明细行数是否与用户的事实一致。

再处理 `issues`：

| 问题类型 | 处理 |
| --- | --- |
| 缺少用户才知道的事实 | 汇总后一次性问用户 |
| 需要从 `candidates` 选择 | 按事实选择；无法判断时让用户选 |
| `reason=value_filled`（系统自动补值） | 告诉用户补了什么；用户接受后写入 `creation.json` |

预览也可能直接返回错误，此时 `error.problems` 就是待修正的问题清单。错误信息有时描述的是派生规则（例如“可抵扣税额必须小于报销金额”），真实原因可能是该行的必填金额没填，先核对该行的必填字段。

修改输入后重新预览一次。不要为了消除提示而随意改值。

### 6. 保存

```shell
qiqi records create <ObjectType> --bill-type-id <类型value> --data-file creation.json --format json
```

返回 `outcome=saved` 和 `ref` 即为已保存。向用户报告单据编号 `code`、状态和剩余问题；返回内容足够时，不需要再回读。

单据保存后是草稿。用户的事实已经齐备、只剩个别信息以后补充时，先保存草稿，再用修改流程补齐，不要反复预览。保存被拒绝时会明确返回“未保存”和问题，修正后重试即可。档案保存后直接生效，有问题须先处理完再保存。

保存不等于提交。用户要求提交时，按 [记录动作](actions-and-recovery.md) 执行；附件在保存后上传，见 [附件](approvals-and-attachments.md#附件)。

## 修改已有记录

单据只能在草稿、已撤回、已退回状态下修改；审批中的单据暂不支持修改。是否撤回由用户决定，并走业务动作。不要直接改状态字段。

```shell
# 查看当前数据、明细行 id 和可写字段
qiqi records update <RecordRef> --data '{}' --dry-run --format json

# 预览并保存本次修改
qiqi records update <RecordRef> --data-file patch.json --dry-run --no-fields --format json
qiqi records update <RecordRef> --data-file patch.json --format json
```

`patch.json` 只写要改的内容。明细行用空补丁预览返回的真实 `id` 识别；没写到的字段和行保持不变，`null` 不会清空字段。

修改表头和已有明细：

```json
{
  "description": "更正后的事由",
  "reimburseOthers": [
    { "id": "<已有明细id>", "originAmount": "90.00" }
  ]
}
```

新增明细（不写 `id`，按新建明细的要求填写必填字段；已有行不用列出）：

```json
{
  "reimburseOthers": [
    { "costId": "<费用value>", "activityDate": "2026-10-21", "originAmount": "20.00", "description": "停车费" }
  ]
}
```

删除明细：

```json
{
  "reimburseOthers": [
    { "id": "<要删除的明细id>", "editFlag": "delete" }
  ]
}
```

三种操作可以写在同一个补丁里。新增行保存后会得到真实 `id`，之后再改这一行时使用该 `id`。

- 不要通过提交整个明细数组来“替换”明细；省略的行不会被删除，只有标记 `delete` 的行才会删除。
- 创建组织和单据类型不能修改。需要更换时，向用户说明只能新建，原草稿是否删除由用户决定。
- 空补丁预览返回的 `issues` 多是记录里原本就有的问题，要和本次修改引入的问题分开看。用户只要求改某处时，先完成这次修改并保存，再把原有问题告诉用户，不强制一次补齐。

## 判断写入结果

| 返回 | 含义 | 处理 |
| --- | --- | --- |
| `kind=creation-preparation` | 预览，未保存 | 修正或保存 |
| `outcome=saved` 且有 `ref` | 已保存 | 报告结果；剩余问题用修改流程处理 |
| `error.problems` 含 `write_not_saved` | 未保存 | 按问题修正后再执行 |
| `error.problems` 含 `write_saved` | 已保存，只是输出或后续检查失败 | 按 `guidance.nextActions[].targetRef` 回读，不重复写入 |
| `write_outcome_unknown`，或超时、断连 | 不确定 | 先按 `ref` 或本次业务事实查询，确认前不重试 |

新建结果不确定且没有 `ref` 时，按申请人、日期、金额和时间范围查询本人最近的单据。一次查询为空不能证明没有保存，无法唯一确认时如实告诉用户。

返回内容过大会写入文件（`77hub.large-output`）。此时按 `path` 读取完整 JSON 再判断，不要只看摘要。
