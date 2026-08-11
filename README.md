# 企企管理云 Agent Skills

本仓库提供面向 Agent 的企企管理云公开技能。技能帮助 Agent 理解稳定业务事实，使用 `qiqi` 在当前企业和用户身份下发现真实能力，并完成通用或项目领域工作。

## 三层结构

| 层 | Skill | 主要职责 |
| --- | --- | --- |
| Foundation | [`qiqi-business-foundations`](skills/foundation/qiqi-business-foundations/SKILL.md) | 稳定业务事实、对象关系、业务阶段和公共数据语义。 |
| qiqi | [`qiqi-cli`](skills/core/qiqi-cli/SKILL.md) | Profile 与身份、运行时发现、查询完整性、记录动作、附件和结果恢复。 |
| Project | [`qiqi-project`](skills/project/qiqi-project/SKILL.md) | 项目任务专用命令、工时，以及利润、预算执行和任务健康分析口径。 |

三个 Skill 可以独立触发，不以固定安装或加载顺序为前提：

- `qiqi-business-foundations` 只提供业务事实判断，不是执行 qiqi 命令的前置条件。
- `qiqi-cli` 独立提供通用 qiqi 工作规则，不要求先加载 Foundation 或某个领域 Skill。
- `qiqi-project` 自身包含项目领域入口和保护边界；需要通用能力时直接使用 qiqi 当前命令。

建议完整安装以覆盖更多用户意图，但 Agent 只加载当前任务真正需要的 Skill 和引用。

## 安装

安装全部技能：

```bash
npx skills add q7link/77hub-skills --all
```

安装指定技能：

```bash
npx skills add q7link/77hub-skills --skill qiqi-cli --skill qiqi-project
```

查看可安装技能：

```bash
npx skills add q7link/77hub-skills --list
```

安装前应能使用 `qiqi`，并配置有权访问目标企业的 profile。连接、授权和升级以正式产品说明为准。

## 安装与升级约束

Skill 安装不是只追加文件。任何集成这些技能的安装器或发布流程都必须：

1. 更新本来源仍然存在的 Skill 到本次发布内容。
2. 清理本来源已经删除或重命名的旧 Skill，避免新旧规则同时触发。
3. 保留其它来源的 Skill 和用户文件，不做无范围清理。
4. 只有全部目标 Skill 更新和旧项清理成功后，才报告安装完成。

`qiqi-core` 已由 `qiqi-cli` 替代，升级时必须清理旧项。具体安装器、版本固定和发布渠道由后续分发设计负责，本仓库只定义内容和清理不变量。

## 内容与权威边界

公开技能可以包含稳定业务定义、能力选择、跨能力工作流、风险纪律和脱敏示例，但不包含服务地址、部署信息、内部实现、凭据或企业配置猜测。

- 当前命令和参数以 `qiqi --help` 与目标叶子命令帮助为准。
- 当前企业的对象、字段、枚举、视图、动作、权限和业务配置必须在运行时确认。
- Skill 中出现命令名用于能力路由和关键工作流，不复制完整参数契约。
- 仓库不维护独立的静态 qiqi 契约快照，避免形成第二权威来源。

## 首版本说明

当前为 qiqi 首版本内容，不兼容早期草稿或旧交付通道的工具名和参数别名。

- 通用列表查询使用 `describe list` 与 `find list`。
- Project 任务创建、修改、开始和完成统一使用 `project task` 专用命令；开始和完成不使用 `do-action`。
- 附件使用 `records attachments list/url/upload`。
- 时间值只根据当前字段元数据解释，不使用整数时间戳，也不在元数据缺失时猜测默认语义。

## 维护与验证

提交前运行：

```bash
node scripts/validate-skills.mjs
npx skills add . --list
```

评审技能时重点确认：

1. 是否区分权威事实、推导、状态未知和建议。
2. 是否按需确认 profile、业务口径、范围和数据完整性，而不是机械执行固定流程。
3. 是否以 qiqi 运行时帮助和元数据为当前能力权威。
4. 是否正确处理分页、大输出、定义变化和不明确的写入结果。
5. 是否只使用 Project 专用命令开始和完成任务。
6. 是否避免复制完整参数契约或泄露内部实现。

## License

本项目使用 [Apache License 2.0](./LICENSE)。
