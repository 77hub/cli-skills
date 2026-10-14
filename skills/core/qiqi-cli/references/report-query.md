# 已有报表查询

`describe reports`/`describe report`/`query report` 使用当前 profile 可访问的报表方案及原报表口径。只有用户明确要查已有报表、上下文已选定方案，或适用的业务流程明确指定报表时，才走本入口。普通业务词不能证明某租户应使用报表；临时按对象统计仍用 `query aggregate`。报表的条件 `name` 与输出字段 `name` 分属不同契约，不能把一个指标直接当作筛选条件。

## 定位方案

```text
qiqi describe reports [text] [--group <groupId>] [--type list|statistic|crosstab|freecell] [--offset <n>] [--limit <n>]
qiqi describe report <reportDefinitionId>
```

- 用户给出报表名称或片段但没有 ID 时，先将它作为带引号的 `text` 检索，例如 `qiqi describe reports "费用统计表"`。不要先执行不带 `text` 的全目录浏览，也不要擅自把名称翻译成另一报表名。已知准确 `reportDefinitionId` 时可直接 `describe report`；不带 `text` 的目录检索用于用户要求浏览目录或没有可用名称词的情况。
- `describe reports` 默认返回 JSON 分页对象。`text` 只检索可访问入口的标题和分组标题，不解析“上个月”“我负责的”等业务条件。`--group` 使用返回的分组 ID；`--type` 是呈现形态，不证明可查询。目录项的 `reportDefinitionId` 才是后续命令的入口，不能用 group/schema ID 或标题代替。
- 若不知道精确名称，先用用户提供的名称片段或入口词搜索；成功且 `total=0` 时，可去掉限定词、改用原话中更宽的入口词，或浏览已知分组。一次自动定位默认最多尝试 3 组关键词/筛选、5 个目录页、描述 5 个不同候选。用户要求完整目录时，沿 `hasMore` 继续翻页，不受定位预算限制。目录错误不是零匹配；不要未经核实就把网关或服务错误称为瞬时故障并原样连续重试。`items=[]` 且 `total>0` 可能只是 offset 越界。
- 对相关候选逐个读 `describe report`，比较当前方案的条件、维度、指标、固定口径与用户问题。不要按列表顺序、标题相似或公共/个人属性自动选择。有实质口径差异且用户上下文无法确定时，展示差异并请用户选择。
- `describe report` 的 `status=selection_required` 是正常的候选响应。按 `candidates` 的标题和 ID 确认一个方案，再对该候选 ID 单独 `describe report`；不能直接查询原入口或自动查询全部候选。`status=ready` 只表示方案已确定，仍须检查 `queryCapability.status` 和 `pagination`。`unsupported`、`unverified` 按 `reasonCode/message` 说明，不能靠试执行验证。当前不支持的报表或专用条件，不通过省略条件、模仿前端转换或改查原始数据来冒充同一报表结果。

## 阅读条件与输出契约

`describe report` 返回的 `criteria[]` 给出条件的 `name`、可能用于区分重名项的 `criterionId`、`required`、`defaultInput` 和 `inputSchema`；顶层 `selectionGroups/orGroups` 给出条件组合；`datasets[]` 仅给出静态输出预览，实际列以同次查询结果为准。顶层 `outputPreview.status=available|runtime|unavailable` 独立描述预览状态；`runtime/unavailable` 不代表不能查询，执行仍以 `queryCapability` 和输入合同为准。只使用当前描述声明的条件、操作符、值类型和引用范围；不要从标题、示例或对象查询的 `--where` 规则推断。`defaultInput` 可能依当前方案和身份变化，必填计数不能替代选择组或最终校验。`fixedConditions` 未知时不要补写口径。

默认值附有 `defaultInputNote` 时，条件的输入 Schema 仍可用，但旧默认值尚不能可靠重放；按 Schema 显式补值，或按用户意图关闭可选条件。不要把 `queryCapability=supported` 理解为默认查询一定成功，也不要静默忽略该筛选。选择组出现 `requiredCriteria` 时，至少填写该必填子集中的一项；组内非必填项不能替代它，仍须遵守 `maxSelected=1`。

大型 `describe report` 可能返回 `77hub.large-output`。其 `summary` 只用于确认方案身份、能力及定位完整文件；`requiresDetails=true` 或 `inputKinds` 均不能代替原 `inputSchema`。用信封的 `path` 读取同次完整描述，或按需本地裁选：

```text
qiqi describe report --from <description.json> --where <name>
qiqi describe report --from <description.json> --field <name> --dataset <datasetName>
qiqi describe report --from <description.json> --dataset <datasetName>
```

`--from` 仅读完整 describe JSON，不访问服务端；不能传入候选列表、查询结果、摘要信封或裁选后的详情。条件详情保留同名条件的全部 `criterionId` 和组合上下文；字段详情保留依赖字段、汇总与公式绑定。裁选详情的 `complete=false` 只表示局部阅读。文件及其 SHA-256 可证明读的是同份描述，不能证明当前配置或权限未变化。

## 提交条件

简单标量条件（包括描述允许的布尔和数值）可直接使用 `--where`；复杂对象、需要 `criterionId` 区分的重名条件及其他结构化输入使用 `--input`：

```text
qiqi query report <reportDefinitionId> [--where <name> <operator> [value ...]]...
qiqi query report <reportDefinitionId> --input <path|->
qiqi query report <reportDefinitionId> [条件输入] --validate-only
```

例如，当**当前描述**确认 `c_month` 是 `year-month` 且允许 `eq` 时，才可传 `--where c_month eq 2026-08`。直接参数中的值保留原文本，类型由服务端按本次 Schema 校验；百分比按 `percentScale` 区分 ratio 与 percent，普通参照使用当前条件声明的 `ObjectType:id`，枚举使用完整枚举值。CLI 不额外查询普通参照 ID 是否在页面候选范围内；编码区间、账簿、期间和辅助项启用仍按各自条件规则处理。不要把登录 `userId` 猜成员工引用，也不要把自然语言时间当作已解析的报表参数。

`--input` 是 UTF-8 JSON，顶层只能有 `criteria` 数组，位置参数仍提供方案 ID。以下仅展示输入形状，名称和取值须取自当前描述：

```json
{"criteria":[{"name":"c_month","operator":"eq","value":"2026-08"},{"name":"c_enabled","operator":"eq","value":false},{"name":"c_optional","omit":true}]}
```

- 同名条件需要精确定位时，在对应数组项加入描述返回的 `criterionId`。特殊参数对象用该条件 Schema 所要求的 `input` 结构；不要套用对象查询的 `where` JSON。
- `--input -` 从 stdin 读取查询 JSON；不能同时用需要读取同一 stdin 的凭证输入选项。
- `--where` 可重复；同一条件的多个约束是否允许由 `multipleConstraints` 决定，组间 AND/OR 以描述为准。`--omit <name>` 只关闭允许关闭的可选条件，并与直接填写同一条件互斥。`--input` 不与直接条件或关闭参数混用。
- 复杂选择或输入不确定时可用 `--validate-only` 让服务端准备并校验，读取 `validation`、`effectiveInput`、`appliedCriteria`、`queryContext` 和消息。响应 `validation.scope=input` 表示输入校验通过，完整业务校验在实际查询时执行；预检没有执行报表，也没有业务数据，不保证正式查询或后端可用；日常明确的简单输入不必机械预检。报表 query 没有 `--dry-run` 或 `--report-version`。
- 存货类报表（条件含 `invAcctgDef` 与 `accountingPeriod`、且无账簿条件）：`accountingPeriod` 按普通期间参数提交 `input.from`/`input.to`（`AccountingPeriod:<id>`），期间方案取自所选存货计价方案；有 `defaultInput` 时可直接沿用，报 `INVENTORY_ACCTG_DEF_REQUIRED` 时先显式补 `invAcctgDef`，报 `REFERENCE_UNAVAILABLE` 表示期间不属于该计价方案的期间方案。期间显示文本按方案日历解释（如“会计期间 等于 2026年9期”）。

## 读取同次结果

`query report` 同步执行，默认显示表格；`describe reports`/`describe report` 默认 JSON。需要精确处理时读取表格指向的**同次规范 JSON**，或在首次查询就明确指定 `--format json`。显式 `--output` 的格式由 `--format` 决定，不能只凭 `.json` 扩展名认为保存的是 JSON。若返回 `77hub.large-output`，读取 `path/uri` 指向的完整文件；摘要或表格预览可能省略条件、列或行，不能当作完整结果。文件只包含本次已交付的数据页，不自动取得后续页。

- 以 `reportDefinitionId`、`effectiveReportDefinitionId`、`effectiveInput`、`appliedCriteria`、`queryContext`、`fixedConditions`、`messages` 和 `refreshTimes` 解释本次身份、条件、口径及提示。`queryContext.preparedAt` 是条件准备时点，不是数据刷新时点。`queryId` 用于追踪本次执行，不是断线后恢复查询的命令。旧的 `describe report` 文件也不是本次查询配置的版本快照；解释历史公式须有同次依据。
- 每个 `datasets[]` 独立核对 `layout`、`fields`、`pagination`、`items`、`hasMore`。普通表的 `values` 按 `fields` 顺序，交叉表按实际 `columns` 顺序并结合行列维度解释；`kind=data/subtotal/total/summary` 分开阅读。`semanticStatus=partial` 表示部分语义未确认，不表示查询失败或数据被截断；可按 `fields/headerPath` 阅读 `table` 中已交付的显示值。`summary` 是有原始 `summaryMarkers` 但角色或完整分组键未知的汇总行，不能混入明细统计、按标题猜分组或补造 `groupValues={}`。原引擎小计和总计保持原值，不从预览或当前页重算。
- `valueMode=typed` 才能按声明类型做精确比较；`display` 只是显示值，不反解析金额、百分比或日期。`states` 中的受限、不适用、空值与数值零不同。输出指标没有同名条件时，只有取得全部必要页、确认粒度/单位/尺度及 typed 值，才可对同次结果做本地筛选，并明确这是“从报表结果筛选”。不要把报表固定 Top N 或累计口径说成业务全集。
- `queryCapability.pagination=cursor` 时，可按结果中各数据集的 `hasMore/nextCursor` 用 `qiqi query report <同一reportDefinitionId> --cursor <该数据集nextCursor>` 续读同次结果；续读不能带条件、`--input`、`--limit` 或 `--validate-only`。`pagination=none` 时省略或显式 `--limit` 都会完整交付（显式值被忽略，messages 会返回 warning `REPORT_PAGINATION_UNSUPPORTED` 说明报表不支持分页）；没有游标。`--limit` 仅用于支持分页的方案，限制每页输出行数，不限制原报表计算范围；表格预览省略与数据分页分别判断。`--cursor` 只接受 JSON 或默认表格交付；续读页的 `returnedRows/firstRowId/lastRowId` 用于校验无缺口拼接。
- 带二次筛选的方案（`describe report` 条件含 `secondFilter=true` 与 `secondFilterNote`）：CLI 不模拟页面两段式，按普通条件查询**完整范围**。成功响应会带 warning `REPORT_SECOND_FILTER_NOT_SIMULATED`，页面默认可能只显示一个成员，两者口径不同时以本次条件与结果为准；需要精确单成员时显式传该条件的单成员/范围过滤（如 `subject in Subject:<id>`），需要含下级时显式传 `includeChildren:true`（默认不含下级）。若必须与页面默认成员一致，请让用户在前端关闭该条件的二次筛选开关后另存方案。
- 查询失败、配置变化、能力未知、源结果不完整或超限都不是空数据。超时或断线只说明未取得可验证结果，不能说执行已取消，也不自动重试；旧游标过期不能靠重新查询后拼接旧页。新查询采用当时的配置、默认条件和数据，不能视为旧查询的恢复。

## 机器处理与本地派生

报表命令只有两种格式：结论读默认表格（显式 `--format table` 等价）；规范交付与代码处理用 `--format json`。报表命令显式指定 `jsonl`/`csv` 会被拒绝并指引读取同次规范 JSON 后本地转换，不要为换格式重新查询。

```text
qiqi query report <reportDefinitionId> [条件输入] --format json --output <file.json>
qiqi query report <reportDefinitionId> [条件输入] --format table
qiqi query report <reportDefinitionId> --cursor <上页表格页尾或 JSON 的 nextCursor>
```

- `--cursor` 只在表格与 JSON 下可用，续读与首次查询使用同一格式规则；续读页的 `returnedRows/firstRowId/lastRowId` 用于校验无缺口拼接，`total` 取引擎 `rowCount`（不含总计行），总计/合并信息只在首屏。
- 代码处理以同次规范 JSON 文件为唯一来源：`datasets[].items` 已是扁平行对象（`rowId/kind/values/displayValues/groupValues`），`fields`/`columns`/`rowDimensionNames` 给出列名、标题与顺序。把下面固定片段存为本地脚本即可得到 JSONL 或 CSV（零远端、不重查）：

```python
import csv, json, sys

source, mode, target = sys.argv[1], sys.argv[2], sys.argv[3]  # mode: jsonl|csv
report = json.load(open(source, encoding="utf-8"))
KIND = {"data": "数据", "subtotal": "小计", "total": "总计", "summary": "汇总（语义未确认）"}

def cell(item, index):
    display = item.get("displayValues") or []
    if index < len(display) and display[index] is not None:
        return display[index]
    values = item.get("values") or []
    value = values[index] if index < len(values) else None
    return "" if value is None else value

def columns(dataset):
    fields = {field["name"]: field for field in dataset.get("fields", [])}
    if dataset.get("layout") != "crosstab":
        return [field["name"] for field in dataset.get("fields", [])], lambda item: [
            cell(item, index) for index in range(len(fields))]
    row_keys = list(dataset.get("rowDimensionNames", []))
    measures = dataset.get("columns", [])
    names = row_keys + ["·".join(column.get("headerPath") or [fields[column["measureName"]]["name"]]) for column in measures]
    def values(item):
        keys = [cell_group(item, ref) for ref in row_keys]
        return keys + [cell(item, index) for index in range(len(measures))]
    return names, values

def cell_group(item, ref):
    display = item.get("displayGroupValues") or {}
    if display.get(ref, "") != "":
        return display[ref]
    raw = (item.get("groupValues") or {}).get(ref)
    return "" if raw is None else raw

for dataset in report["datasets"]:
    if dataset.get("layout") == "sourceLayout":
        raise ValueError("该数据集为安全原布局，请读取 sourceLayout；不能当作空表导出")
    names, values = columns(dataset)
    rows = [{"_type": "row", "dataset": dataset["datasetName"], "rowId": item["rowId"],
             "rowType": item["kind"], "summaryMarkers": item.get("summaryMarkers"), **dict(zip(names, values(item)))} for item in dataset["items"]]
    if mode == "jsonl":
        with open(f"{target}.{dataset['datasetName']}.jsonl", "w", encoding="utf-8") as handle:
            handle.write(json.dumps({"_type": "meta", "reportDefinitionId": report["reportDefinitionId"],
                "queryId": report.get("queryId"), "datasets": [{"name": dataset["datasetName"],
                "layout": dataset.get("layout"), "semanticStatus": dataset.get("semanticStatus"),
                "pagination": dataset.get("pagination"),
                "offset": dataset.get("offset"), "total": dataset.get("total"),
                "hasMore": dataset.get("hasMore"), "columns": names}],
                "appliedCriteria": report.get("appliedCriteria")}, ensure_ascii=False) + "\n")
            for row in rows:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    else:
        with open(f"{target}.{dataset['datasetName']}.csv", "w", newline="", encoding="utf-8-sig") as handle:
            writer = csv.writer(handle)
            writer.writerow(["rowType"] + names)
            for row in rows:
                writer.writerow([KIND.get(row["rowType"], row["rowType"])] + [row[name] for name in names])
```

- 该片段按 `datasetName` 逐数据集输出；CSV 首列 `rowType=数据|小计|总计|汇总（语义未确认）`，交叉表列名内嵌完整列头路径，值使用展示文本（`displayValues` 优先），UTF-8 BOM 便于 Excel 打开。小结果无需落盘时，也可用 `jq -c '.datasets[].items[]' <file.json>` 快速查看。
- 派生视图不是规范交付，也不能当作游标或结果找回入口；`--cursor` 只认 JSON 与默认表格。`77hub.large-output` 摘要的 `schema`（列名→标题/类型/角色）、`legend`（rowType/state 词表）和 `nextActions`（规范 JSON 路径与本地派生指引）可先建立映射；表格页尾同样给出列定义、图例与下一步。
- 不要凭预览或派生重算合计：已确认角色的合计取 `rowType=subtotal|total`；`summary` 只能按原显示值说明未知汇总，不称为全表总计。任何本地统计均排除汇总行，并先验证 typed 值、业务身份、粒度及完整范围；不能把 display 字符串反解析后当可靠数值，`semanticStatus=complete` 也不能替代这些检查。大文件按脚本本地裁剪后再读，不把完整大文件塞进上下文。

自定义 EQL 数据源的内层参数必须已有原生外层通道：外层 Schema 参数声明、有效方案输入，以及同名或 `apiParameters` 映射。describe 只发布已有真实条件；缺少通道会明确限制查询，不会生成虚拟条件。配置补全需独立处理，不能通过省略条件扩大查询范围。CLI 对会触发原引擎自动升级保存的旧方案报告只读限制，需先在系统中完成方案升级；不会创建或保存个人方案。旧 p7/p8分页游标已过期，应重新发起查询。

## 边界说明

- 当前 CLI 暂不支持 `freecell` 电子表格报表查询；目录中可发现该类型不代表可以执行。
- `queryCapability.status=supported` 表示当前输入契约受支持，不保证默认查询或正式执行成功。实际查询仍可能受到条件、业务规则、后端可用性及结果契约等限制；按同次响应的错误码和消息说明，不将失败视为无匹配数据，也不省略筛选来绕过限制。
