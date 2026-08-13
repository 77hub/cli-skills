# 企企管理云 Agent Skills

本仓库提供企企管理云的 Agent Skills，帮助 AI Agent 在产品语义、CLI 使用、数据查询、记录操作与项目协作中保持一致的边界和流程。

GitHub 仓库：[77hub/cli-skills](https://github.com/77hub/cli-skills)

## 三层结构

| 层级 | Skill | 职责 |
| --- | --- | --- |
| Foundation | `qiqi-business-foundations` | 企企产品定位、实体模型、概念口径与跨 Skill 规则。 |
| Core | `qiqi-cli-installation` | 正式 CLI 安装、OAuth、可选 Skills 接入、验证与恢复。 |
| Core | `qiqi-cli` | 已就绪 CLI 的 Profile 与身份、运行时发现、查询完整性、记录动作、附件和结果恢复。 |
| Project | `qiqi-project` | 项目、任务、工时与指标的业务工作流。 |

安装 Core 与运行 Core 分别负责接入和日常 CLI 使用；具体业务语义由 Foundation 和 Project 层承接。每个 Skill 可被独立安装，完整安装时由引用关系自动带出所需依赖。

测试环境适配仅存在于仓库内部的 `develop` 目录，用于隔离测试 CLI 与测试 Profile；不属于公开分发内容。

## 安装

先安装公开 production CLI：

```bash
npm install --global @77hub/cli@latest
qiqi --version
qiqi auth login --method oauth --name production
qiqi auth status
```

需要 Agent Skills 时，再单独安装：

```bash
npx --yes skills@1.5.9 add https://github.com/77hub/cli-skills --global --skill "*" --full-depth
```

安装命令省略 `--agent`，由安装器在实际 Agent 运行环境中自动探测；浏览器页面无法代替该探测。不要使用 `--all`。若当前客户端不支持上述参数，应停止并按该客户端的受支持方式手动安装，而不是伪造成功结果。

CLI、授权和 Skills 是三个独立结果：CLI 可用不代表已授权，也不代表 Skills 已安装。`qiqi-cli-installation` 覆盖 CLI 缺失或初次安装时的恢复路径，但不把安装 Skills 作为 CLI 可用的前置条件。

## 安装与升级约束

- 默认优先使用 `npx skills add` 的标准安装路径，不直接修改用户目录或 Agent 配置目录。
- 安装后只报告可验证的结果；不能确认目标 Agent 是否加载时，明确说明需要重启或刷新 Agent 会话。
- 升级前先确认当前 CLI 版本、Profile 和认证状态；避免覆盖仍在使用的 Profile。
- 公开内容不得引用内部源、私有镜像或测试环境地址。

## 内容与权威边界

- Foundation 是产品概念、对象语义和命名口径的唯一权威来源。
- Core 负责通用 CLI 流程、错误恢复和跨 Skill 的执行前置条件，不重复业务模型定义。
- Project 仅定义项目域工作流；涉及通用对象、记录或附件操作时引用 Core。
- CLI 的帮助输出、实际返回值和服务端行为始终优先于 Skill 中的示例。

## 首版本说明

当前首版本以公开业务能力为主，覆盖产品基础、CLI 通用能力和项目协作。后续新增业务域时，应先补充 Foundation 中的概念口径，再新增对应 Project 或领域 Skill。

## 维护与验证

```bash
node scripts/validate-skills.mjs
npx skills add . --list
```

提交前应确认：

- 所有公开 Skill 的 metadata 合法，且没有内部地址、测试环境或私有源信息。
- Foundation、Core、Project 三层的引用关系没有循环依赖。
- 安装与升级说明仍与当前 CLI 和 Skills 安装器兼容。

## License

Apache-2.0
