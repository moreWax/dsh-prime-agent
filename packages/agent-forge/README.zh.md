# dsh-agent-forge

[English](README.md) | 中文

为每个智能体提供独立的 GitHub 身份。`dsh-agent-forge` 是一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件包，在你自己的组织下为每个智能体创建独立的私有 GitHub App——提交、PR 和评论都会以独立的 `agent-<name>[bot]` 身份出现，而你只保留**一个**人类账号。设计上完全符合平台条款。

## 安装

```sh
dsh plugin --profile <name> add dsh-agent-forge
```

## 工具

| 工具 | 用途 |
|---|---|
| `forge_provision_agent` | 开始创建；返回一个 URL，需要人在 github.com 上**一键批准** |
| `forge_list_agents` | 列出身份、机器人名称与状态 |
| `forge_agent_token` | 为活跃智能体铸造约 1 小时的安装令牌 |
| `forge_revoke_agent` | 本地吊销并清除凭据 |

## 配置（`cordis.yml` 行配置）

| 字段 | 默认值 | 说明 |
|---|---|---|
| `stateFile` | `$DSH_HOME/agents.json` | 智能体注册表 |
| `workspaceRoot` | `~/agents` | 每个智能体的工作区 |
| `callbackPort` | `8765` | 一次性回调监听端口 |
| `publicUrl` | — | **创建时必填。** github.com 回跳的基础地址；必须可从公网到达（Tailscale 地址或隧道） |
| `org` | — | 安装智能体 App 的组织 |

## 许可证

[MIT](LICENSE)。第三方依赖许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
