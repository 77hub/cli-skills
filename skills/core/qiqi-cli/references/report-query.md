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
- `describe report` 的 `status=selection_required` 是正常的候选响应。按 `candidates` 的标题和 ID 确认一个方案，再对该候选 ID 单独 `describe report`；不能直接查询原入口或自动查询全部候选。`status=ready` 只表示方案已确定：数据读取参考 `queryCapability.status/pagination`，实际请求仍由后端验证；CLI原样保留未知状态，不本地推断为supported。`unsupported`、`unverified` 按 `reasonCode/message` 说明，不能靠试执行验证。当前不支持的报表或专用条件，不通过省略条件、模仿前端转换或改查原始数据来冒充同一报表结果。

## 阅读条件与输出契约

`describe report` 返回的 `criteria[]` 给出条件的 `name`、可能用于区分重名项的 `criterionId`、`required`、`defaultInput` 和 `inputSchema`；顶层 `selectionGroups/orGroups` 给出条件组合；`datasets[]` 仅给出静态输出预览，实际列以同次查询结果为准。顶层 `outputPreview.status=available|runtime|unavailable` 独立描述预览状态；`runtime/unavailable` 不代表不能查询，执行仍以 `queryCapability` 和输入合同为准。只使用当前描述声明的条件、操作符、值类型和引用范围；不要从标题、示例或对象查询的 `--where` 规则推断。`defaultInput` 可能依当前方案和身份变化，必填计数不能替代选择组或最终校验。`fixedConditions` 未知时不要补写口径。

默认值附有 `defaultInputNote` 时，条件的输入 Schema 仍可用，但旧默认值尚不能可靠重放；按 Schema 显式补值，或按用户意图关闭可选条件。不要把 `queryCapability=supported` 理解为默认查询一定成功，也不要静默忽略该筛选。选择组出现 `requiredCriteria` 时，至少填写该必填子集中的一项；组内非必填项不能替代它，仍须遵守 `maxSelected=1`。

大型 `describe report` 可能返回 `77hub.large-output`。其 `summary` 只用于确认方案身份、能力及定位完整文件；`requiresDetails=true` 或 `inputKinds` 均不能代替原 `inputSchema`。用信封的 `path` 读取同次完整描述，或按需本地裁选：

```text
qiqi describe report --from <description.json> --where <name>
qiqi describe report --from <description.json> --field <name> --dataset <datasetName>
qiqi describe report --from <description.json> --dataset <datasetName>
```

`--from` 仅读完整 describe JSON，不访问服务端；不能传入候选列表、查询结果、摘要信封或裁选后的详情。条件详情保留同名条件的全部 `criterionId` 和组合上下文；字段详情只摘录所选字段的原始子树；完整context保留原有汇总与公式绑定，CLI不补选依赖字段或推导依赖。裁选详情的 `complete=false` 只表示局部阅读。文件及其 SHA-256 可证明读的是同份描述，不能证明当前配置或权限未变化。

## 提交条件

简单标量条件（包括描述允许的布尔和数值）可直接使用 `--where`；复杂对象、需要 `criterionId` 区分的重名条件及其他结构化输入使用 `--input`：

CLI JSON只检查交付所需的基本结构、身份、完成状态和资源上限，保留服务端原始字段、扩展、null与精确数字值。条件对应、字段/汇总语义、日期/错误编码及工作表排序/最小范围由后端和共享合同测试负责。JSON可被格式化，但不会为适配客户端删除展示注解或未知字段。

table无法正确展示未知布局、行列或坐标结构时，会回退为同次JSON并在stderr提示，沿用stdout/自动文件/--output/--force策略，不重新查询或补describe。大输出摘要不替代原始结果；缺少分页事实时从文件确认，不能将摘要缺省值当作无后续页。validate-only只消费服务端输入验证结果，不复验条件业务语义或时间文本，也不创建报表结果文件。

```text
qiqi query report <reportDefinitionId> [--where <name> <operator> [value ...]]...
qiqi query report <reportDefinitionId> --input <path|->
qiqi query report <reportDefinitionId> [条件输入] --validate-only
```

例如，当**当前描述**确认 `c_month` 是 `year-month` 且允许 `eq` 时，才可传 `--where c_month eq 2026-08`。直接参数中的值保留原文本，类型由服务端按本次 Schema 校验；百分比按 `percentScale` 区分 ratio 与 percent，普通参照使用当前条件声明的 `ObjectType:id`，枚举使用完整枚举值。CLI 不额外查询普通参照 ID 是否在页面候选范围内；编码区间、账簿、期间和辅助项启用仍按各自条件规则处理。不要把登录 `userId` 猜成员工引用，也不要把自然语言时间当作已解析的报表参数。

`--input` 是 UTF-8 JSON，顶层只能有 `criteria` 成员；当前服务端要求数组，其值的业务形态由服务端判定，位置参数仍提供方案 ID。以下仅展示输入形状，名称和取值须取自当前描述：

```json
{"criteria":[{"name":"c_month","operator":"eq","value":"2026-08"},{"name":"c_enabled","operator":"eq","value":false},{"name":"c_optional","omit":true}]}
```

- 同名条件需要精确定位时，在对应数组项加入描述返回的 `criterionId`。特殊参数对象用该条件 Schema 所要求的 `input` 结构；不要套用对象查询的 `where` JSON。
- `--input -` 从 stdin 读取查询 JSON；不能同时用需要读取同一 stdin 的凭证输入选项。
- `--where` 可重复；同一条件的多个约束是否允许由 `multipleConstraints` 决定，组间 AND/OR 以描述为准。`--omit <name>` 只关闭允许关闭的可选条件，并与直接填写同一条件互斥。当前服务端不允许 `--input` 与直接条件或关闭参数混用；CLI 完整发送显式参数，由服务端返回组合错误。
- 复杂选择或输入不确定时可用 `--validate-only` 让服务端准备并校验，读取 `validation`、`effectiveInput`、`appliedCriteria`、`queryContext` 和消息。响应 `validation.scope=input` 表示输入校验通过，完整业务校验在实际查询时执行；预检没有执行报表，也没有业务数据，不保证正式查询或后端可用；日常明确的简单输入不必机械预检。报表 query 没有 `--dry-run` 或 `--report-version`。
- 存货类报表（条件含 `invAcctgDef` 与 `accountingPeriod`、且无账簿条件）：`accountingPeriod` 按普通期间参数提交 `input.from`/`input.to`（`AccountingPeriod:<id>`），期间方案取自所选存货计价方案；有 `defaultInput` 时可直接沿用，报 `INVENTORY_ACCTG_DEF_REQUIRED` 时先显式补 `invAcctgDef`，报 `REFERENCE_UNAVAILABLE` 表示期间不属于该计价方案的期间方案。期间显示文本按方案日历解释（如“会计期间 等于 2026年9期”）。

## 读取同次结果

`query report` 同步执行，默认显示表格；`describe reports`/`describe report` 默认 JSON。需要精确处理时读取表格指向的**同次规范 JSON**，或在首次查询就明确指定 `--format json`。显式 `--output` 的格式由 `--format` 决定，不能只凭 `.json` 扩展名认为保存的是 JSON。若返回 `77hub.large-output`，读取 `path/uri` 指向的完整文件；摘要或表格预览可能省略条件、列或行，不能当作完整结果。文件只包含本次已交付的数据页，不自动取得后续页。

- 以 `reportDefinitionId`、`effectiveReportDefinitionId`、`effectiveInput`、`appliedCriteria`、`queryContext`、`fixedConditions`、`messages` 和 `refreshTimes` 解释本次身份、条件、口径及提示。`queryContext.preparedAt` 是条件准备时点，不是数据刷新时点。`queryId` 用于追踪本次执行，不是断线后恢复查询的命令。旧的 `describe report` 文件也不是本次查询配置的版本快照；解释历史公式须有同次依据。
- 标准表格的每个 `datasets[]` 独立核对 `layout`、`fields`、`pagination`、`items`、`hasMore`。普通表的 `values` 按 `fields` 顺序，交叉表按实际 `columns` 顺序并结合行列维度解释；`kind=data/subtotal/total/summary` 分开阅读。`semanticStatus=partial` 表示部分语义未确认，不表示查询失败或数据被截断；可按 `fields/headerPath` 阅读 `table` 中已交付的显示值。`summary` 是有原始 `summaryMarkers` 但角色或完整分组键未知的汇总行，不能混入明细统计、按标题猜分组或补造 `groupValues={}`。原引擎小计和总计保持原值，不从预览或当前页重算。
- `reportType=freecell` 且 `resultKind=worksheet-data` 时，按每个 `layout=worksheet` 数据集读取 `sheetName/range/cells/merges/excludedRanges`，不套用标准表的 fields/items。cells 保留原 A1 坐标、valueType、value 和 displayText；范围内未列出的格默认 blank，合并覆盖格和排除格优先处理。null、空串、0、false 和合法错误值分别解释，不反解析显示文本。隐藏依赖可以参与计算，但不作为可见数据交付；空 sheet 的 range=null，无可见 sheet 时 datasets=[]。默认 table 使用服务端 presentation 通用预览；有预览时先保存同次完整无样式 JSON，再有界展示；预览缺失或无法消费时按原输出策略回退同次 JSON并提示；预览省略不代表计算或数据交付截断，不从预览重算合计。
- `valueMode=typed` 才能按声明类型做精确比较；`display` 只是显示值，不反解析金额、百分比或日期。`states` 中的受限、不适用、空值与数值零不同。输出指标没有同名条件时，只有取得全部必要页、确认粒度/单位/尺度及 typed 值，才可对同次结果做本地筛选，并明确这是“从报表结果筛选”。不要把报表固定 Top N 或累计口径说成业务全集。
- `queryCapability.pagination=cursor` 时，首次查询省略 `--limit` 默认每页 100 行，显式 `--limit` 支持 1～200；续页沿用首屏绑定的页大小。可按结果中各数据集的 `hasMore/nextCursor` 用 `qiqi query report <同一reportDefinitionId> --cursor <该数据集nextCursor>` 续读同次结果；当前服务端规定续读不能带条件、`--input`、`--limit` 或 `--validate-only`。`pagination=none` 时省略或显式 `--limit` 都会完整交付（显式值被忽略，messages 会返回 warning `REPORT_PAGINATION_UNSUPPORTED` 说明报表不支持分页）；没有游标。`--limit` 仅用于支持分页的方案，限制每页输出行数，不限制原报表计算范围；表格预览省略与数据分页分别判断。`--cursor` 只接受 JSON 或默认表格交付；续读页的 `returnedRows/firstRowId/lastRowId` 用于校验无缺口拼接。
- 带二次筛选的方案（`describe report` 条件含 `secondFilter=true` 与 `secondFilterNote`）：CLI 不模拟页面两段式，按普通条件查询**完整范围**。成功响应会带 warning `REPORT_SECOND_FILTER_NOT_SIMULATED`，页面默认可能只显示一个成员，两者口径不同时以本次条件与结果为准；需要精确单成员时显式传该条件的单成员/范围过滤（如 `subject in Subject:<id>`），需要含下级时显式传 `includeChildren:true`（默认不含下级）。若必须与页面默认成员一致，请让用户在前端关闭该条件的二次筛选开关后另存方案。
- 查询失败、配置变化、能力未知、源结果不完整或超限都不是空数据。超时或断线只说明未取得可验证结果，不能说执行已取消，也不自动重试；旧游标过期不能靠重新查询后拼接旧页。新查询采用当时的配置、默认条件和数据，不能视为旧查询的恢复。

## 机器处理与本地派生

报表命令使用默认表格（显式 `--format table` 等价）或规范 JSON（`--format json`）。全局 `--format` 支持 table/json/jsonl；Excel 不属于 CLI 输出格式，所有命令的 `--format excel` 都会在网络请求前被拒绝。报表命令显式指定 `jsonl`/`csv` 会被拒绝并指引读取同次规范 JSON 后本地转换，不要为换数据格式重新查询。

明确报表和条件时可直接 query，无需先 describe。CLI 报表查询沿用服务端缺省 data，`--output` 仅指定所选格式的保存目标，`.xlsx` 扩展名也不会触发 Excel 导出。电子表格由 Java 完成工作簿计算后交付无样式 worksheet 数据。Excel 导出仅保留 Baseapp 接口，报表数据查询接口不接受 `outputFormat`；describe 的规范 JSON 保留这项服务端能力，CLI 摘要只列 table/json。导出权限不能由 VIEW 或数据查询成功推定，CLI 不提供 Excel 下载、文件回执或失败恢复入口。

describe 的 supported 表示已接入路径及已知必要事实满足，不保证任意条件、公式或运行依赖必定成功；运行结果以本次 query 为准。可选预览、说明文案或未使用的 Baseapp 附加格式元数据不完整时，不据此拒绝直接查询，也不要求先完成兼容矩阵登记。真实必要输入、权限、可信应用和只读限制仍按原执行链路处理。

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
    if dataset.get("layout") == "worksheet":
        raise ValueError("电子表格请按原 A1 坐标读取 cells/merges/excludedRanges；此配方仅适用于标准表")
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
- 派生视图不是规范交付，也不能当作游标或结果找回入口；`--cursor` 只认 JSON 与默认表格。`77hub.large-output` 摘要的 `schema`（列名→标题/类型/角色）、`legend`（rowType/state 词表）和 `nextActions`（规范 JSON 路径与本地派生指引）可先建立映射；服务端附加的 presentation.facts 可提供列定义、图例和分页说明；缺失或未知信息不由 CLI 推导补齐。
- 不要凭预览或派生重算合计：已确认角色的合计取 `rowType=subtotal|total`；`summary` 只能按原显示值说明未知汇总，不称为全表总计。任何本地统计均排除汇总行，并先验证 typed 值、业务身份、粒度及完整范围；不能把 display 字符串反解析后当可靠数值，`semanticStatus=complete` 也不能替代这些检查。大文件按脚本本地裁剪后再读，不把完整大文件塞进上下文。

自定义 EQL 数据源的内层参数必须已有原生外层通道：外层 Schema 参数声明、有效方案输入，以及同名或 `apiParameters` 映射。describe 只发布已有真实条件；缺少通道会明确限制查询，不会生成虚拟条件。配置补全需独立处理，不能通过省略条件扩大查询范围。CLI 对会触发原引擎自动升级保存的旧方案报告只读限制，需先在系统中完成方案升级；不会创建或保存个人方案。旧 p7/p8分页游标已过期，应重新发起查询。

## 边界说明

- `freecell` 支持范围取决于部署中的 Java 适配、独立开关、模板兼容性和真实权限；目录可见不等于已经通过该报表的计算/Excel验收。缺少适配时按服务端明确限制处理，不通过修改格式或省略条件绕过。
- `queryCapability.status=supported` 表示当前输入契约受支持，不保证默认查询或正式执行成功。实际查询仍可能受到条件、业务规则、后端可用性及结果契约等限制；按同次响应的错误码和消息说明，不将失败视为无匹配数据，也不省略筛选来绕过限制。


## 电子表格值与失败定位

- `value`是权威类型值，`displayText`用于显示。数值45351可显示为日期、0.125可显示为12.50%，不能从格式化文本反推类型、时区或金额单位；单位由同次标题和说明保留。仅日期格式不会使number自动变成date。
- 空sheet仍有dataset身份且range=null；来源零行仍可能有标题、常量和最终公式值。没有可见sheet时datasets=[]，与查询失败不同。
- 合法Excel错误以`valueType=error,value={"code":"#DIV/0!"}`等形式交付；`#GETTING_DATA`属于未完成状态，必需函数/上下文缺失及计算异常也不能用null、0或空表替代。
- 报`REPORT_ADAPTER_UNAVAILABLE`时读取同次安全原因，不能把兼容矩阵当报表/函数准入清单；报`REPORT_RESULT_INCOMPLETE`、`REPORT_EXECUTION_FAILED`或超限时不接收部分结果。预览不可用与这些执行错误分别处理。
- table/json的公式计算发生在Baseapp，CLI只消费数据。两者均无Excel导出入口；本机CLI无需安装Java、GcExcel或JavaScript计算环境。

客户端不再重复验证结果内部结构或报表行列/单元格/sheet 容量，仍核对身份、queryId、completed 和通用 JSON/本机预算。未知预览或预览超限回退同次完整 JSON，不重新查询。输入组合与 criteria 值由服务端校验，本地仅保留单 criteria 根封装、语法和资源保护；新输入不能覆盖身份、租户或 operation。非法组合可能产生认证及上下文请求，但当前 Gateway 在报表执行前拒绝。

validate-only 始终向 stdout 输出 JSON，不创建/覆盖 --output 文件；scope 可扩展或缺省，按服务端事实解释，附加 execution/datasets 不是查询成功的依据。当前 scope=input 仅保证输入校验，Provider、计算、分页结果缓存均不执行；必要元数据及参照读取仍可发生。
