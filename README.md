# 企企管理云 Agent Skills

本仓库提供企企管理云的 Agent Skills，帮助 AI Agent 在产品语义、CLI 使用、数据查询、记录操作与项目协作中保持一致的边界和流程。

上游 GitHub 仓库：[77hub/cli-skills](https://github.com/77hub/cli-skills)；面向安装默认使用自动同步的 Gitee 镜像。

## 三层结构

| 层级 | Skill | 职责 |
| --- | --- | --- |
| Foundation | `qiqi-business-foundations` | 企企产品定位、实体模型、概念口径与跨 Skill 规则。 |
| Core | `qiqi-cli-installation` | qiqi 安装、升级、网络与沙箱可见性恢复、登录授权及在线身份验证。 |
| Core | `qiqi-cli` | 已就绪 CLI 的 Profile 与身份、运行时发现、查询完整性、单据与档案的创建和修改、记录动作、附件和结果恢复。 |
| Project | `qiqi-project` | 项目、任务与工时的业务工作流。 |
| Project | `qiqi-project-financial-analysis` | 项目经营的财务事实模型、真实查询路径、项目预算执行与利润口径。 |

安装 Core 与运行 Core 分别负责接入和日常 CLI 使用；具体业务语义由 Foundation 和 Project 层承接。每个 Skill 可被独立安装，完整安装时由引用关系自动带出所需依赖。

仓库内部的 `develop` 目录负责测试环境适配和测试 Profile 隔离；公开分发使用表中的业务 Skills。

## 安装

先安装 qiqi CLI，再完成首次授权和在线身份验证：

```bash
npm install --global @77hub/cli@latest
qiqi --version
qiqi auth login --method oauth
qiqi auth status
```

登录成功会保存新身份或更新同一企业和用户的已有身份，并将该身份设为默认身份；需要改变默认身份时，先用 `qiqi auth list` 查看候选，再执行 `qiqi auth switch <switch-ref>`。

Agent Skills 是可选增强，可提升 AI 对企企业务和 CLI 的理解，但不扩大权限。执行方先检查当前 Agent 是否已存在且可读对应 Skills；已有时不重复安装。缺失时再询问用户并建议安装，只有用户同意后，才根据当前 Agent 类型选择安装方式：

```bash
npx --yes skills add https://gitee.com/qiqihub/cli-skills.git --global --skill "*" --full-depth
```

安装命令省略 `--agent`，由安装器在实际 Agent 运行环境中自动探测；浏览器页面无法代替该探测。不要使用 `--all`。若当前客户端不支持上述参数，应停止并按该客户端的受支持方式手动安装，而不是伪造成功结果。

CLI、授权和 Skills 分别验证：用 `qiqi --version` 验证 CLI，用 `qiqi auth status` 验证在线身份，用目标 Agent 的实际读取结果验证 Skills。`qiqi-cli-installation` 覆盖安装、升级、恢复、首次授权和新增登录身份；Agent Skills 使用上方独立安装流程。

## 安装与升级约束

- 默认优先使用 `npx skills add` 的标准安装路径，不直接修改用户目录或 Agent 配置目录。
- 安装后只报告可验证的结果；不能确认目标 Agent 是否加载时，明确说明需要重启或刷新 Agent 会话。
- 升级前先确认当前 CLI 版本、Profile 和认证状态；避免覆盖仍在使用的 Profile。
- 公开内容不得引用内部源、私有镜像或测试环境地址。

## 内容与权威边界

- Foundation 是产品概念、对象语义和命名口径的唯一权威来源。
- Core 负责通用 CLI 流程、错误恢复和跨 Skill 的执行前置条件，不重复业务模型定义。
- Project 层分别定义项目协作工作流与项目经营分析；涉及通用对象、记录或附件操作时引用 Core。
- CLI 的帮助输出、实际返回值和服务端行为始终优先于 Skill 中的示例。

## 首版本说明

当前首版本以公开业务能力为主，覆盖产品基础、CLI 通用能力和项目协作。后续新增业务域时，应先补充 Foundation 中的概念口径，再新增对应 Project 或领域 Skill。

## License

Apache-2.0
