# 项目预算执行与利润

项目预算是项目经营分析的一条可选证据路径，不是其它财务事实的前置条件。

## 可分析门槛

只有同时确认以下事实时才进入项目预算分析：

1. 当前项目存在匹配预算单；
2. 财务组织、编制方案、编制期间、版本和币种与用户范围一致；
3. 预算状态能够支持本次目的；
4. 预算执行期间和控制版本可确认；
5. 查询完整，空结果和失败没有被当作零。

查到对象但未取得匹配记录，记为“当前范围未取得可分析项目预算”；对象不可用、权限不明或查询失败，记为“项目预算状态未知”。二者都不证明企业没有使用项目预算。

## 四层项目预算事实

| 层次 | 标准对象 | 主要语义 |
| --- | --- | --- |
| 预算单 | `BudgetPlan` | 项目、组织、方案、期间、版本、币种和产品预计利润 |
| 预算基线 | `BudgetPlanTotalView` | 预算类型与指标的预算数 |
| 执行汇总 | `BudgetExeAnalysisView` | 预算、占用、实际执行、总消耗和可用预算 |
| 执行事务 | `BudgetTransactionView` | 构成总消耗的来源主单和明细 |

```text
encumbrance    = 预留执行 + 占用执行
actuals        = 实际执行
totalExecution = encumbrance + actuals
remainBudget   = budget - totalExecution
exeDiff        = budget - actuals
```

`totalExecution` 是承诺与实际的总消耗，不是纯实际发生。执行事务的 `execution` 与同范围 `totalExecution` 对账，不与 `actuals` 对账。

## 已验证的最小查询路径

先取得项目预算单候选：

```shell
qiqi query list BudgetPlan --fields "id,code,projectId,billStatus,versionNo,modelId,createdOrgId,currencyId,periodCycleTimeId,isControlled,dataExtcnStatusId,profitAmount,profitMarginAmount" --where projectId eq <projectId> --where billStatus eq BillStatus.effective --limit 200 --format json
```

存在多张时，按组织、方案、期间、版本、控制状态和币种逐单分析；不能证明可合并时不得按项目直接相加。

选定范围后查询执行汇总：

```shell
qiqi query list BudgetExeAnalysisView --fields "accountingDimensionId,projectId,modelId,financialOrgId,budgetProjectCycleTimeId,accountTypeId,indicatorId,containsUnBook,isControlledVersion,isControlledBill,budget,encumbrance,actuals,totalExecution,remainBudget,exeDiff" --where projectId eq <projectId> --where modelId eq <modelId> --where financialOrgId eq <financialOrgId> --where budgetProjectCycleTimeId eq <cycleTimeId> --where isControlledVersion eq true --where containsUnBook eq false --limit 200 --format json
```

金额、数量、单价、工时和比例不能跨指标相加。解释来源时查询事务：

```shell
qiqi query list BudgetTransactionView --fields "accountingDimensionId,budgetTransactionId,objectType,masterBillId,detailObjectType,detailLineId,projectId,modelId,financialOrgId,budgetProjectCycleTimeId,accountTypeId,indicatorId,billStatus,isControlledBill,action,transactionCreatedTime,execution" --where projectId eq <projectId> --where modelId eq <modelId> --where financialOrgId eq <financialOrgId> --where budgetProjectCycleTimeId eq <cycleTimeId> --where accountTypeId eq <accountTypeId> --where indicatorId eq <indicatorId> --where billStatus eq BillStatus.effective --limit 200 --format json
```

使用 `objectType + masterBillId` 定位来源主单，使用 `detailObjectType + detailLineId` 定位来源明细。

`BudgetExeAnalysisView` 没有单据 `billStatus`，因此默认用 `containsUnBook = false` 排除包含未生效单据的执行口径；用户明确要求观察预算占用或未生效执行时才改为其它范围。事务下钻仍默认筛选 `BillStatus.effective`。

## 产品预算利润

`BudgetPlan.profitAmount` 是产品按预算方案保存的预计利润。权威公式来自 `BudgetModel.profitEvalFormula`，不能默认替换为收入减成本：

```shell
qiqi records get BudgetModel:<modelId> --fields "id,name,profitEvalFormula,profitFormulaText,profitMarginFormula,profitMarginFormulaText" --format json
```

需要核验或推导时，按 `accountTypeId + indicatorId` 分组后分别代入：

```text
预算公式核验值     = F(各指标 budget)
实际执行利润推导值 = F(各指标 actuals)
总消耗利润暴露值   = F(各指标 totalExecution)
```

三者必须分开命名。它们不自动等于会计利润或企业经营利润，因为预算指标可能采用合同、确认、开票、收付、费用、工时或材料中的任一阶段。

公式变量缺失、范围不一致、分页不完整或执行数据抽取状态不明时，只保留产品结果和可见事实，不输出最终推导利润。

## 无项目预算时的利润请求

没有可分析项目预算时，不要求用户补建预算。按业务事实模型展示合同、收入确认、开票、成本费用、人力投入和现金事实，并确认企业采用哪套权威利润口径。

用户未提供口径时，最小结果是分阶段事实和差异，不创建默认利润。用户明确公式后，只有输入完整且范围一致时才计算，并标记为企业口径推导值。
