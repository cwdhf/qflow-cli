# A2A 服务器自定义提示词配置指南

## 概述

A2A 服务器支持通过环境变量配置自定义系统提示词，允许你自定义 AI 助手的行为和响应方式。

## 环境变量

### `QFLOW_SYSTEM_MD`

覆盖默认系统提示词，使用 Markdown 文件的内容。

**用法：**

- 如果设置为 `1` 或 `true`，使用 `.qflow/system.md` 文件
- 如果设置为文件路径，使用该文件。路径可以是绝对路径或相对路径。支持 `~`
  表示用户主目录
- 指定的文件必须存在

**示例：**

```bash
# 使用默认路径 .qflow/system.md
export QFLOW_SYSTEM_MD=1

# 使用自定义路径
export QFLOW_SYSTEM_MD=/path/to/custom/system.md

# 使用相对路径
export QFLOW_SYSTEM_MD=./config/my-prompt.md

# 使用主目录路径
export QFLOW_SYSTEM_MD=~/my-prompts/system.md
```

### `GEMINI_WRITE_SYSTEM_MD`

将默认系统提示词写入文件。这对于获取自定义提示词的模板非常有用。

**用法：**

- 如果设置为 `1` 或 `true`，写入到 `.qflow/system.md`
- 如果设置为文件路径，写入到该文件。路径可以是绝对路径或相对路径。支持 `~`
  表示用户主目录

**示例：**

```bash
# 写入到默认路径 .qflow/system.md
export GEMINI_WRITE_SYSTEM_MD=1

# 写入到自定义路径
export GEMINI_WRITE_SYSTEM_MD=/path/to/output/system.md

# 写入到相对路径
export GEMINI_WRITE_SYSTEM_MD=./templates/default-prompt.md

# 写入到主目录路径
export GEMINI_WRITE_SYSTEM_MD=~/my-prompts/default.md
```

## 使用步骤

### 1. 导出默认提示词（可选）

首先，你可以导出默认的系统提示词作为模板：

```bash
export GEMINI_WRITE_SYSTEM_MD=1
```

这将在 `.qflow/system.md` 中创建默认提示词的副本。

### 2. 自定义提示词

编辑生成的 `system.md` 文件或创建新的提示词文件：

```bash
# 编辑默认路径的文件
nano .qflow/system.md

# 或编辑自定义路径的文件
nano ~/my-prompts/custom-system.md
```

### 3. 应用自定义提示词

设置 `QFLOW_SYSTEM_MD` 环境变量指向你的自定义提示词文件：

```bash
# 使用默认路径
export QFLOW_SYSTEM_MD=1

# 或使用自定义路径
export QFLOW_SYSTEM_MD=~/my-prompts/custom-system.md
```

### 4. 重启 A2A 服务器

应用环境变量后，重启 A2A 服务器以使更改生效。

## Kubernetes 环境配置

在 Kubernetes 环境中，你可以通过 ConfigMap 或环境变量配置自定义提示词。

### 方法 1：通过 ConfigMap

创建 ConfigMap 包含你的自定义提示词：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: a2a-prompts
data:
  system.md: |
    你是一个专业的软件工程助手。
    你的主要目标是帮助用户安全高效地完成任务。
    # 核心指令
    - 严格遵循项目约定
    - 使用项目已有的库和框架
    - 保持代码风格一致
```

在 Pod 中挂载 ConfigMap：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: a2a-server
spec:
  containers:
    - name: a2a-server
      image: your-a2a-image
      env:
        - name: QFLOW_SYSTEM_MD
          value: '/config/system.md'
      volumeMounts:
        - name: prompt-config
          mountPath: /config
  volumes:
    - name: prompt-config
      configMap:
        name: a2a-prompts
```

### 方法 2：通过环境变量直接设置

将提示词内容直接嵌入到环境变量中（不推荐用于长提示词）：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: a2a-server
spec:
  containers:
    - name: a2a-server
      image: your-a2a-image
      env:
        - name: QFLOW_SYSTEM_MD
          value: '/app/config/custom-system.md'
```

## 自定义提示词示例

### 示例 1：专注于特定编程语言

```markdown
你是一个专业的 Python 开发助手。

# 核心职责

- 帮助用户进行 Python 代码开发、调试和优化
- 遵循 PEP 8 代码风格指南
- 优先使用 Python 标准库和流行的第三方库（如 NumPy、Pandas、Django）

# 工作流程

1. 理解用户需求
2. 分析现有代码
3. 提供解决方案
4. 编写测试
5. 验证结果
```

### 示例 2：专注于安全编码

```markdown
你是一个专注于安全编码的软件工程助手。

# 安全优先原则

- 始终考虑代码的安全性
- 验证所有用户输入
- 防止 SQL 注入、XSS、CSRF 等常见漏洞
- 使用加密存储敏感数据
- 遵循 OWASP 安全最佳实践

# 代码审查重点

- 输入验证
- 输出编码
- 认证和授权
- 敏感数据处理
- 错误处理
```

### 示例 3：专注于性能优化

```markdown
你是一个专注于性能优化的软件工程助手。

# 性能优化原则

- 优先考虑算法复杂度
- 避免不必要的计算和 I/O 操作
- 使用缓存策略
- 优化数据库查询
- 考虑并发和异步处理

# 性能分析工具

- 使用性能分析工具识别瓶颈
- 监控内存使用情况
- 优化关键路径代码
```

## 故障排除

### 问题：提示词文件未找到

**错误信息：** `missing system prompt file '/path/to/system.md'`

**解决方案：**

- 确保文件路径正确
- 确保文件存在
- 检查文件权限

### 问题：提示词未生效

**可能原因：**

- 环境变量未正确设置
- 服务器未重启
- 文件路径使用了相对路径但工作目录不正确

**解决方案：**

- 验证环境变量：`echo $QFLOW_SYSTEM_MD`
- 重启 A2A 服务器
- 使用绝对路径

### 问题：在 Kubernetes 中提示词未加载

**可能原因：**

- ConfigMap 未正确挂载
- 环境变量配置错误
- 文件路径不匹配

**解决方案：**

- 检查 Pod 日志：`kubectl logs <pod-name>`
- 验证 ConfigMap：`kubectl describe configmap <configmap-name>`
- 确认文件挂载路径

## 最佳实践

1. **版本控制**：将自定义提示词文件纳入版本控制
2. **文档化**：在提示词文件中添加注释说明自定义的目的
3. **测试**：在应用自定义提示词前进行充分测试
4. **渐进式修改**：逐步修改提示词，观察效果
5. **备份**：保留原始默认提示词作为备份

## 相关文件

- [prompts.ts](file:///Volumes/lp/code/gemini-cli/packages/core/src/core/prompts.ts) - 核心提示词实现
- [config.ts](file:///Volumes/lp/code/gemini-cli/packages/a2a-server/src/config/config.ts) -
  A2A 服务器配置
