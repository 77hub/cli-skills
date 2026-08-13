# 项目预算执行分析

## 核心模型

项目预算执行按四层事实分析：

1. `BudgetPlan`：确定预算单、版本、组织、方案、期间、币种和产品预计利润。
2. `BudgetPlanTotalView`：提供某张预算单按预算类型和指标汇总的预算基线。
3. `BudgetExeAnalysisView`：提供预算、占用、实际执行、总消耗和可用预算，是预算执行分析的主要事实源。
4. `BudgetTransactionView`：提供构成预算总消耗的执行事务、主单和明细单据，用于继续下钻。

`BudgetProjectExeView` 是将多个指标展开为成对宽字段的展示视图，可用于特定报表展示，但不作为默认分析入口。其 `*Actuals` 和通用 `actuals` 实际包含预留、占用和实际执行，对应总消耗，不是纯实际发生数。

## 执行字段的准确语义

`BudgetExeAnalysisView` 的金额关系为：

```text
budget         = 预算数
encumbrance    = 预留执行数 + 占用执行数
actuals        = 实际执行数
totalExecution = 预留执行数 + 占用执行数 + 实际执行数
remainBudget   = budget - totalExecution
exeDiff        = budget - actuals
```

因此必须先确认用户问的是：

- 实际发生：使用 `actuals`；
- 已占用但未全部发生：使用 `encumbrance`；
- 已承诺和已发生的全部预算消耗：使用 `totalExecution`；
- 尚可使用：使用 `remainBudget`。

合同、确认、开票、收付款、费用、工时和材料是不同业务阶段。只有 `accountTypeId`、`indicatorId`、组织、方案、期间、币种和其它分析范围一致时，预算数与执行数才可比较。

## 标准查询路径

### 1. 确认预算单和版本

```shell
qiqi find list BudgetPlan --fields "id,code,projectId,billStatus,versionNo,modelId,createdOrgId,currencyId,periodCycleTimeId,isControlled,dataExtcnStatusId,profitAmount,profitMarginAmount,incomeTotalAmount,expenseTotalAmount,laborTotalAmount,materialTotalAmount" --where projectId eq <projectId> --limit 200 --format json
```

优先选择与用户范围一致、已生效或已关闭、且属于执行控制版本的预算单。

存在多张预算单时，先区分：

- 财务组织；
- 编制方案；
- 编制期间；
- 原始版本、变更版本和编辑暂存版本；
- 是否为执行控制版本；
- 币种。

无法证明多张预算单可以合并时逐单分析，不按项目直接累计。`dataExtcnStatusId` 只说明执行数抽取状态，不能单独证明执行为零或数据完整。

### 2. 查询指标预算基线

先确认字段：

```shell
qiqi describe fields BudgetPlanTotalView --format json
```

再按已选择的预算单查询：

```shell
qiqi find list BudgetPlanTotalView --fields "budgetPlanId,projectId,modelId,financialOrgId,accountTypeId,indicatorId,profitAmount,budgetAmount,budgetQuantity,budgetPrice,budgetLaborTime,budget" --where budgetPlanId eq <budgetPlanId> --limit 1000 --format json
```

`BudgetPlanTotalView` 的基本粒度是：

```text
budgetPlanId
× accountTypeId
× indicatorId
```

并附带项目、方案和财务组织。它不提供预算执行期间字段，也不提供执行数。

注意：

- `budget` 是当前行指标的预算值。
- `budgetAmount`、`budgetQuantity`、`budgetPrice` 和 `budgetLaborTime` 只在对应指标行有意义。
- `profitAmount` 在指标行重复出现，不能求和。
- 不能把金额、数量、单价和工时跨指标合计为一个预算总额。

`BudgetPlanSubtable` 是收入、费用、人员或材料预算的编制表结构容器；其 `totalAmount` 可辅助解释预算类型合计，但它不是指标执行事实，也不用于下钻业务单据。

### 3. 查询预算执行汇总

先确认字段：

```shell
qiqi describe fields BudgetExeAnalysisView --format json
```

再使用预算单确定的项目、方案、财务组织和执行期间限定范围：

```shell
qiqi find list BudgetExeAnalysisView --fields "accountingDimensionId,projectId,parentProjectId,modelId,financialOrgId,projectOrgId,budgetProjectCycleTimeId,accountTypeId,accountId,indicatorId,stageId,departmentId,projectRoleId,productCategoryId,productId,costId,rankId,containsUnBook,isControlledVersion,isControlledBill,budget,encumbrance,actuals,totalExecution,remainBudget,exeDiff" --where projectId eq <projectId> --where modelId eq <modelId> --where financialOrgId eq <financialOrgId> --where budgetProjectCycleTimeId eq <budgetProjectCycleTimeId> --where isControlledVersion eq true --limit 1000 --format json
```

读取完整分页后，按用户要求保留或汇总维度。同一指标的项目级结果应在统一范围内分别计算：

```text
指标预算数     = SUM(budget)
指标占用数     = SUM(encumbrance)
指标实际执行数 = SUM(actuals)
指标总消耗数   = SUM(totalExecution)
指标可用预算   = SUM(remainBudget)
```

预算基线和事务执行可能落在不同 `accountingDimensionId` 行。不能逐行观察到预算为零就认定该执行没有预算，也不能逐行观察到执行为零就认定整个指标没有执行；应先按相同指标和范围汇总。

### 4. 计算差异和比例

只有同指标、同单位和同范围的数据才允许计算：

```text
实际执行差异 = budget - actuals
总消耗差异   = budget - totalExecution
实际执行率   = actuals / budget
总消耗率     = totalExecution / budget
可用预算率   = remainBudget / budget
```

预算为零时不计算比例。比例和自行计算的差异必须标记为推导值并展示公式。

总消耗超过预算不自动等于业务违规。是否超预算、何时占用、是否允许未受控单据，取决于预算控制配置。负数可能来自红冲、退回、撤销、冲销或跨期调整；必须下钻事务后再解释。

### 5. 下钻预算执行单据

用户追问“哪些单据构成这个执行数”时，查询 `BudgetTransactionView`：

```shell
qiqi describe fields BudgetTransactionView --format json
```

范围级下钻：

```shell
qiqi find list BudgetTransactionView --fields "accountingDimensionId,budgetTransactionId,objectType,masterBillId,detailObjectType,detailLineId,projectId,modelId,financialOrgId,projectOrgId,budgetProjectCycleTimeId,accountTypeId,accountId,indicatorId,billStatus,isControlledBill,action,transactionCreatedTime,execution" --where projectId eq <projectId> --where modelId eq <modelId> --where financialOrgId eq <financialOrgId> --where budgetProjectCycleTimeId eq <budgetProjectCycleTimeId> --where accountTypeId eq <accountTypeId> --where indicatorId eq <indicatorId> --limit 1000 --format json
```

精确下钻某条执行维度时增加：

```text
accountingDimensionId = <accountingDimensionId>
```

稳定关系为：

```text
BudgetExeAnalysisView
    accountingDimensionId + indicatorId
        → BudgetTransactionView
            objectType + masterBillId
            detailObjectType + detailLineId
```

`BudgetTransactionView.execution` 等于该事务的预留、占用和实际执行之和，因此事务汇总应与相同范围的 `BudgetExeAnalysisView.totalExecution` 对账，不与 `actuals` 对账。

通过 `objectType + masterBillId` 定位来源主单，通过 `detailObjectType + detailLineId` 定位来源明细。

`billStatus` 和 `action` 用于解释事务处于提交、生效、结转、关闭或冲销等阶段。不能仅凭字段名称把所有事务解释成实际发生。

## 维度与总分结构

`BudgetExeAnalysisView` 和 `BudgetTransactionView` 都通过 `accountingDimensionId` 关联 `BudgetAccountingDimension`。预算维度组合还包含预算维度类型及项目、方案、组织、期间、预算项目、部门、角色、存货等标准维度。

当前视图不直接暴露 `dimensionTypeId` 时，不自行构造或假设该字段可查询；以 `describe fields` 为准。

以下字段可以确定分析范围，但不是单行唯一键：

```text
projectId + modelId + financialOrgId
```

完整范围通常还要增加：

```text
budgetProjectCycleTimeId
+ accountTypeId
+ indicatorId
```

精确对应事务时使用：

```text
accountingDimensionId + indicatorId
```

## 可选宽表展示

只有用户明确要求查看某些业务指标的预算/执行成对字段时，才使用 `BudgetProjectExeView`：

```shell
qiqi describe fields BudgetProjectExeView --format json
```

查询时必须先确认具体字段，并明确：

```text
<indicator>Budget  = 预算数
<indicator>Actuals = 预留 + 占用 + 实际执行
```

它适合展示，不适合区分纯实际数和占用数；需要严谨分析时回到 `BudgetExeAnalysisView`。

## 查询失败与数据缺口

- 查询失败表示当前通道没有取得数据，不表示预算或执行为零。
- 空结果只表示当前过滤范围没有返回记录，不反向证明业务没有发生。
- 预算单可见而指标基线不可见时，只报告预算单表头事实。
- 执行汇总可见而事务不可见时，可以报告执行数，但必须说明暂时不能解释具体单据。
- 事务合计与总消耗不一致时，先检查分页、期间、指标、维度、控制范围和观察截止时间，不强行对账。
- 未生效、未受控、红冲和变更版本可能改变结果，必须随结论说明。

## 形成结论的必要条件

1. 唯一项目；
2. 明确预算单状态和版本；
3. 固定财务组织、编制方案、执行期间和币种；
4. 明确预算类型、指标及其业务阶段；
5. 预算与执行使用相同范围和单位；
6. 完整读取分页；
7. 区分实际执行、占用和总消耗；
8. 需要单据解释时完成事务对账；
9. 查询失败和缺失数据没有被当作零值。

## 标准结果结构

- 项目稳定引用、编码和名称；
- 预算单、状态、版本、组织、方案、期间和币种；
- 预算类型、指标及业务阶段；
- 预算、占用、实际执行、总消耗和可用预算；
- 透明计算的差异与比例；
- 构成总消耗的主单和明细单据；
- 多版本、多维度、分页、控制范围和数据缺口。
