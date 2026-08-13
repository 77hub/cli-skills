# Production 安装

安装正式 CLI，并独立核验 binary：

```sh
npm install --global @77hub/cli@latest
qiqi --version
```

再完成 production OAuth：

```sh
qiqi auth login --method oauth --name production
qiqi auth status
```

Agent Skills 是面向 AI 客户端的可选增强，不是 CLI 或授权前置条件。使用受治理公共来源单独安装：

```sh
npx --yes skills@1.5.9 add https://github.com/77hub/cli-skills --global --skill "*" --full-depth
```

该命令省略 `--agent`，由 Skills CLI 在实际执行环境中自动识别当前 Agent；不得使用 `--all`。公开全量集合包含 `qiqi-cli-installation`、`qiqi-cli`、`qiqi-business-foundations` 和 `qiqi-project`，复制或更新 Skill 文件不会执行其内容。
