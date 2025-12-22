# OpenAI 集成使用指南

## 快速开始

### 1. 获取 OpenAI API 密钥

1. 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 登录你的账户
3. 点击 "Create new secret key"
4. 复制生成的API密钥

### 2. 配置环境变量

编辑 `.env` 文件，填入你的API密钥：

```bash
# 使用你喜欢的编辑器
nano .env
# 或
code .env
```

将 `OPENAI_API_KEY` 的值改为你的实际密钥：

```
OPENAI_API_KEY=sk-你的实际API密钥
```

### 3. 启动 Qflow CLI

```bash
npm run start
```

### 4. 选择认证方式

在启动后的认证对话框中，选择 **"Use OpenAI API"**

## 配置详解

### 必需配置

- `OPENAI_API_KEY`: 你的OpenAI API密钥

### 可选配置

- `OPENAI_BASE_URL`: API端点地址
  - 默认: `https://api.openai.com/v1`
  - 可以设置为第三方兼容服务
  - 示例: `https://api.deepseek.com/v1`

- `OPENAI_MODEL`: 使用的模型
  - 默认: `gpt-3.5-turbo`
  - 其他选项: `gpt-4`, `gpt-4-turbo`, `gpt-4o` 等
  - 第三方模型: 根据服务商提供的模型名称

### 企业级参数（通常不需要）

- `OPENAI_ORGANIZATION`: 组织ID
  - **仅限企业用户**，个人用户不需要
  - 用于在企业账户中区分不同组织

- `OPENAI_PROJECT`: 项目ID
  - **仅限企业用户**，个人用户不需要
  - 用于在企业账户中区分不同项目

## 使用示例

### 示例1: 使用官方OpenAI API

```bash
# .env 文件内容:
OPENAI_API_KEY=sk-abc123def456
OPENAI_MODEL=gpt-4
# OPENAI_BASE_URL 使用默认值
```

### 示例2: 使用第三方服务（如DeepSeek）

```bash
# .env 文件内容:
OPENAI_API_KEY=your-deepseek-api-key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

### 示例3: 使用本地部署的模型

```bash
# .env 文件内容:
OPENAI_API_KEY=not-required-for-local
OPENAI_BASE_URL=http://localhost:8080/v1
OPENAI_MODEL=local-llama-model
```

## 常见问题

### Q: 为什么需要设置 OPENAI_API_KEY？

A: 这是访问OpenAI API的身份凭证，没有它无法调用API服务。

### Q: OPENAI_BASE_URL 是什么？

A: 这是API服务的地址。默认指向OpenAI官方服务器，但可以改为任何兼容OpenAI
API的第三方服务。

### Q: 这两个参数是做什么的？我没有呀：

```bash
export OPENAI_ORGANIZATION="org-id"
export OPENAI_PROJECT="project-id"
```

A: 这两个参数是给**OpenAI企业账户用户**使用的：

- `OPENAI_ORGANIZATION`: 企业账户中的组织ID
- `OPENAI_PROJECT`: 企业账户中的项目ID

**普通个人用户完全不需要设置这两个参数**，只需要 `OPENAI_API_KEY` 就够了。

### Q: 如何知道我的模型名称？

A:

- 官方OpenAI: 查看 [OpenAI模型列表](https://platform.openai.com/docs/models)
- 第三方服务: 查看服务商的文档
- 本地部署: 查看部署配置

### Q: 支持流式输出吗？

A: 是的，完全支持流式输出，响应会实时显示。

### Q: 可以同时使用OpenAI和Gemini吗？

A: 可以，但需要手动切换。在认证对话框中选择不同的认证方式即可。

## 故障排除

### 1. "Module 'openai' not found" 错误

```bash
cd packages/core
npm install openai@^4.0.0
```

### 2. API连接失败

- 检查 `OPENAI_API_KEY` 是否正确
- 验证 `OPENAI_BASE_URL` 是否可以访问
- 检查网络连接

### 3. 模型不支持

- 确认 `OPENAI_MODEL` 在目标API中可用
- 检查模型名称拼写

### 4. 启用调试模式

在 `.env` 文件中添加：

```
DEBUG=true
```

## 高级配置

### 使用多个配置

你可以创建不同的 `.env` 文件来切换配置：

```bash
# 切换到OpenAI配置
cp .env.openai .env
npm run start

# 切换回Gemini配置
cp .env.gemini .env
npm run start
```

### 环境变量优先级

1. 系统环境变量（最高优先级）
2. `.env` 文件中的设置
3. 默认值（最低优先级）

## 获取帮助

如果遇到问题：

1. 检查 `.env` 文件配置
2. 启用调试模式：`DEBUG=true`
3. 查看控制台错误信息
4. 确保网络可以访问配置的API端点
