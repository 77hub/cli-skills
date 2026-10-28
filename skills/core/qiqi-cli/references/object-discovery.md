# 对象、候选值与工作视图发现

## 选择发现路径

1. 不知道对象类型时，用 `objects` 按业务关键词取得当前 profile 的候选。
2. 已知对象但字段类型、时间语义或引用关系不清楚时，用 `describe fields <ObjectType>`。
3. 只有名称、单号或人名片段时，用 `seek` 获取跨对象有限候选。
4. 查询条件或写入需要枚举值、引用 ID 时，用 `query values <ObjectType.field> <关键词>`。
5. 需要工作台预置视图时，用 `describe view` 发现，再用 `query view <viewId>` 执行。
6. 已有稳定 `RecordRef` 时，用 `records get <RecordRef>` 读取完成任务所需的可见字段。

列表查询不属于本文件范围。对象目录和缓存只产生候选，不证明当前服务端授权；租户之间可能有相似显示名但不同对象、字段和允许值，不凭经验套用。同一任务已有适用于当前身份、对象与字段的发现证据时复用；定义变化或证据不足时再发现。

## 字段与候选值

`describe fields` 说明对象有哪些字段及其类型、引用和时间语义；`describe list` 只说明列表默认展示哪些字段。

- 用户用别名、单据类型名或企业自定义叫法描述业务时，用 `objects <text>` 找到对应的 ObjectType，再结合标题和上下文确认。
- 用户给出界面上的字段名时，用 `describe fields <ObjectType> --query <text>` 搜索；后续查询或写入只使用返回的 `fieldName`。
- 已有 canonical `fieldName` 或已从模糊搜索确认字段时，复用已知定义；语义仍不明确时，用 `describe fields <ObjectType> --field <fieldName>` 精确定位，不用 `--query` 重新扩展解释。
- 用户刚调整模板、标题或明确表示“界面上有但没查到”时，再加 `--refresh` 重新拉取字段与词汇；普通查询不要为了保险无条件刷新。
- 时间字段读取 `temporalKind`、`format` 和 `example`。
- 枚举和引用字段的取值见下文 [查找枚举与引用的取值](#查找枚举与引用的取值)。
- 布尔值固定使用小写 `true/false`，不调用 `query values`。
- 列表、结构化字段和引用字段不因重复读取样例而变成完整展开结果。
- 当前描述没有声明必填、可编辑或默认值时，不从样例推断这些属性。

## 候选与唯一性

`seek` 只搜索当前身份有权访问且已经接入的来源。即使只返回一条，也不能证明全系统唯一。

- 只读展示可用对象类型、标题、编码和 `RecordRef` 帮助用户消歧。
- 写操作必须使用用户给定的稳定引用、唯一业务编码或其它可验证关系确认目标。
- 无法证明唯一时请求用户选择，不默认使用第一条。

## Views 与单记录

`describe view` 列出当前身份可见的工作台视图及其输出定义，`query view` 执行其中某一个。View 独立于 ObjectType，筛选语义由服务端定义；不要把视图标题或样例反推成对象状态条件，也不要猜测清单中未出现的 `viewId`。何时选用视图而不是 `query list`，以技能正文的能力路由为准。

`records get` 返回当前用户可见的业务字段；省略 `--fields` 时按该记录的表单配置返回详情字段，不包含隐藏字段和动作。需要动作时用 `describe actions`，需要附件时用 `records attachments`。

## 查找枚举与引用的取值

查询条件、新建和修改中的枚举、引用字段都要填系统值，不填显示名。用 `query values` 把用户说的名称换成系统值：

```shell
# 引用：按名称关键词模糊匹配，返回 value（记录 ID）和 label
qiqi query values Reimburse.departmentId 销售 --format json

# 枚举：按标题过滤，返回枚举值，如 BillStatus.draft
qiqi query values Reimburse.billStatus 草稿 --format json

# 明细字段：使用明细的实体名
qiqi query values ReimburseOther.costId 交通 --format json
```

- 关键词按“包含”匹配，用名称里最有区分度的一段，如用户说“销售二部”时先用 `销售`；没有命中再缩短关键词，或换成同义叫法。
- 省略关键词会返回前若干项，用 `--limit`（最多 200）扩大范围；`hasMore=true` 说明还有更多，应细化关键词，不要据此认定只有这些。
- 命中多项时，按 `label` 和用户的描述消歧；无法确定时请用户选择，不默认取第一条。
- 用于查询条件时，把 `value` 放进 `--where`，见 [记录列表查询](list-query.md)。新建或修改时，字段已给出 `candidates` 的优先使用候选，见 [新建与修改](create-and-edit-records.md)。
