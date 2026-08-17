# 项目利润分析

## 核心定义

项目利润默认沿用项目预算方案定义的利润口径。利润公式来自 `BudgetModel`，公式变量由“预算类型 + 预算指标”唯一表达，指标的预算数、实际执行数和占用执行数来自 `BudgetExeAnalysisView`。

必须区分以下结果：

- **预算预计利润**：`BudgetPlan.profitAmount`，是产品按预算方案计算并保存的权威预算结果。
- **预算公式核验值**：将 `BudgetExeAnalysisView.budget` 代入预算方案公式得到的推导值，用于核验预算指标与产品结果是否一致。
- **实际执行利润推导值**：将 `BudgetExeAnalysisView.actuals` 代入同一公式，表示已进入预算执行体系的实际指标结果。
- **占用执行利润推导值**：将 `BudgetExeAnalysisView.totalExecution` 代入同一公式，包含预留、占用和实际执行，表示预算消耗或承诺口径的利润暴露。

实际执行利润推导值不自动等于会计利润。预算方案可能采用合同、确认、开票、收付、费用、工时或材料等任一业务阶段；结果只能按该方案的指标语义解释。

这套模式保留了基于预算执行指标形成其它分析口径的空间，但不预设用户必须补充利润公式，也不主动限定额外口径的表达方式。只有用户明确提出其它利润定义时，才根据其目标继续澄清和分析。

## 前提与边界

开始计算前必须固定：

1. 唯一项目 `projectId`；
2. 财务组织 `createdOrgId` / `financialOrgId`；
3. 编制方案 `modelId`；
4. 预算执行期间 `periodCycleTimeId` / `budgetProjectCycleTimeId`；
5. 生效预算版本；
6. 币种；
7. 观察截止时间和分页范围。

`projectId + modelId + financialOrgId` 只能确定预算分析范围，不能唯一确定一行执行数据。同一范围内还可能按期间、预算项目、部门、项目角色、职级、存货和其它维度拆行。

## 标准查询路径

### 1. 选择预算单

```shell
qiqi find list BudgetPlan --fields "id,code,projectId,billStatus,versionNo,modelId,createdOrgId,currencyId,periodCycleTimeId,isControlled,dataExtcnStatusId,profitAmount,profitMarginAmount,incomeTotalAmount,expenseTotalAmount,laborTotalAmount,materialTotalAmount" --where projectId eq <projectId> --limit 200 --format json
```

优先选择与用户范围一致、已生效或已关闭、且属于执行控制版本的预算单。存在多张预算单时，先区分组织、方案、期间和版本；不能证明可以合并时逐单分析。

`incomeTotalAmount`、`expenseTotalAmount`、`laborTotalAmount` 和 `materialTotalAmount` 是预算类型合计，只用于说明结构，不能代替利润公式引用的具体指标。

### 2. 读取利润公式

```shell
qiqi records get BudgetModel:<modelId> --fields "id,name,incomeEnabled,expenseEnabled,laborEnabled,materialEnabled,profitEvalFormula,profitFormulaText,profitMarginFormula,profitMarginFormulaText" --format json
```

公式变量通常形如：

```text
BudgetAccountType.income_BudInd.receiptAmt
```

变量应拆解为：

```text
accountTypeId = BudgetAccountType.income
indicatorId   = BudInd.receiptAmt
```

只依据 `profitEvalFormula` 执行计算，`profitFormulaText` 用于向用户解释，不从中文标题猜测变量。

### 3. 查询公式指标

先确认当前字段：

```shell
qiqi describe fields BudgetExeAnalysisView --format json
```

再按预算单确定的范围查询：

```shell
qiqi find list BudgetExeAnalysisView --fields "accountingDimensionId,projectId,modelId,financialOrgId,budgetProjectCycleTimeId,accountTypeId,accountId,indicatorId,containsUnBook,isControlledVersion,isControlledBill,budget,encumbrance,actuals,totalExecution,remainBudget,exeDiff" --where projectId eq <projectId> --where modelId eq <modelId> --where financialOrgId eq <financialOrgId> --where budgetProjectCycleTimeId eq <budgetProjectCycleTimeId> --where isControlledVersion eq true --limit 1000 --format json
```

必须读取完整分页。公式中的每个变量都可能对应多行维度数据，应先在同一范围内按 `accountTypeId + indicatorId` 分组汇总，再代入公式：

```text
变量预算数     = SUM(budget)
变量实际执行数 = SUM(actuals)
变量占用执行数 = SUM(totalExecution)
```

不能跨指标直接汇总金额、数量、工时、单价或比例。

### 4. 核验预算预计利润

按 `profitEvalFormula` 将各变量的 `budget` 汇总值代入：

```text
预算公式核验值 = F(各指标 budget)
```

再与 `BudgetPlan.profitAmount` 比较：

- 一致：说明当前指标范围、方案和版本能够解释产品预计利润。
- 不一致：保留产品预计利润，只报告核验差异，并检查期间、版本、分页、控制范围及公式变量是否完整。

利润率同理使用 `profitMarginFormula`。分母为零时不自行计算比例，保留产品字段及其原始语义。

### 5. 计算执行利润

默认提供两个独立推导结果：

```text
实际执行利润推导值 = F(各指标 actuals)
占用执行利润推导值 = F(各指标 totalExecution)
```

其中：

```text
totalExecution = 预留执行 + 占用执行 + 实际执行
```

不得将 `totalExecution` 命名为实际发生数。若公式变量没有取得执行事实，只能说明当前预算执行体系中未取得对应指标；不能由零值或空结果推断项目实际没有收入、成本或利润。

### 6. 下钻利润构成单据

用户追问某个公式指标由哪些单据构成时，查询 `BudgetTransactionView`：

```shell
qiqi describe fields BudgetTransactionView --format json
```

```shell
qiqi find list BudgetTransactionView --fields "accountingDimensionId,budgetTransactionId,objectType,masterBillId,detailObjectType,detailLineId,projectId,modelId,financialOrgId,budgetProjectCycleTimeId,accountTypeId,accountId,indicatorId,billStatus,isControlledBill,action,transactionCreatedTime,execution" --where projectId eq <projectId> --where modelId eq <modelId> --where financialOrgId eq <financialOrgId> --where budgetProjectCycleTimeId eq <budgetProjectCycleTimeId> --where accountTypeId eq <accountTypeId> --where indicatorId eq <indicatorId> --limit 1000 --format json
```

精确下钻某条执行维度时，再增加：

```text
accountingDimensionId = <accountingDimensionId>
```

`BudgetTransactionView.execution` 的口径是预留、占用和实际执行之和，因此应与相同范围的 `BudgetExeAnalysisView.totalExecution` 对账，不与 `actuals` 对账。

通过 `objectType + masterBillId` 定位来源主单，通过 `detailObjectType + detailLineId` 定位来源明细。

## 查询失败与数据缺口

- 查询失败表示当前通道未取得数据，不表示利润或执行为零。
- 空结果只表示当前过滤范围没有返回记录，不反向证明业务没有发生。
- 预算单可见但执行指标不可见时，只报告产品预计利润和公式，不构造执行利润。
- 公式变量缺失、分页不完整或范围不一致时，不输出最终推导利润。
- `containsUnBook`、`isControlledBill` 和预算执行数抽取状态可能改变完整性，必须随结果说明。

## 标准结果结构

- 项目稳定引用、编码和名称；
- 预算单、版本、组织、方案、期间和币种；
- 产品预算预计利润及利润率；
- 利润公式及每个变量的预算、实际执行、占用执行汇总值；
- 预算公式核验值及与产品结果的差异；
- 实际执行利润推导值和占用执行利润推导值；
- 预留、占用是实际执行的一部分内容，同时也是内部技术实现的方案；所以除非用户明确要求，不暴露这两个业务概念；
- 可下钻的业务单据及其执行金额；
- 分页、控制范围、未生效数据、抽取状态和其它数据缺口。
