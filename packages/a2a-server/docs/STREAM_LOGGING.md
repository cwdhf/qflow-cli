# 流式日志配置指南

## 概述

A2A 服务器支持对流式输出进行日志记录，帮助开发者调试和监控 API 调用。

## 环境变量

### `GEMINI_STREAM_LOGGING`

控制是否启用流式日志记录功能。

**用法：**

- 设置为 `1` 或 `true`：启用流式日志记录
- 设置为 `0` 或 `false`：禁用流式日志记录（默认）
- 未设置：禁用流式日志记录

**示例：**

```bash
# 启用流式日志记录
export GEMINI_STREAM_LOGGING=1

# 禁用流式日志记录
export GEMINI_STREAM_LOGGING=0
```

## 日志输出格式

启用流式日志后，日志将在流式响应完成后输出完整的日志摘要，包含以下信息：

### 日志摘要

```
================================================================================
STREAM LOG SUMMARY
================================================================================
Stream ID: stream_1234567890_abc123
Start Time: 2025-12-30T10:30:00.000Z
End Time: 2025-12-30T10:30:05.000Z
Duration: 5000ms
Total Chunks: 1360
Model: doubao-seed-1-8-251215
Finish Reason: stop
Has Content: true
Has Tool Calls: true
================================================================================

ALL CHUNKS:
================================================================================

Chunk #1 [2025-12-30T10:30:00.100Z]:
{
  "choices": [
    {
      "delta": {
        "content": "Hello"
      },
      "index": 0
    }
  ],
  ...
}

Chunk #2 [2025-12-30T10:30:00.150Z]:
{
  "choices": [
    {
      "delta": {
        "content": " world"
      },
      "index": 0
    }
  ],
  ...
}

...

================================================================================
END STREAM LOG SUMMARY
================================================================================
```

### 字段说明

- **Stream ID**: 唯一流标识符
- **Start Time**: 流开始时间（ISO 8601 格式）
- **End Time**: 流结束时间（ISO 8601 格式）
- **Duration**: 流持续时间（毫秒）
- **Total Chunks**: 接收到的总块数
- **Model**: 使用的模型名称
- **Finish Reason**: 流结束原因（stop、length、content_filter 等）
- **Has Content**: 是否包含文本内容
- **Has Tool Calls**: 是否包含工具调用

## 使用场景

### 1. 调试 API 调用

启用流式日志可以帮助你：

- 查看 API 返回的完整响应
- 分析每个 chunk 的内容
- 调试流式响应处理问题

### 2. 性能分析

通过日志摘要可以：

- 监控流式响应的持续时间
- 统计接收到的 chunk 数量
- 分析 API 性能

### 3. 问题排查

当遇到问题时：

- 查看完整的 chunk 数据
- 分析流结束原因
- 检查工具调用是否正确

## Kubernetes 环境配置

在 Kubernetes 环境中，通过环境变量配置：

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
        - name: GEMINI_STREAM_LOGGING
          value: '1'
```

## 注意事项

1. **性能影响**：启用流式日志会占用额外的内存和 CPU 资源，建议仅在调试时使用
2. **日志大小**：流式日志可能非常大，特别是在长时间对话时
3. **敏感信息**：日志可能包含敏感信息，请确保日志文件的安全存储
4. **生产环境**：建议在生产环境中禁用流式日志记录

## 与其他日志配置的关系

- `GEMINI_DEBUG_LOG_FILE`：控制日志输出到文件
- `GEMINI_STREAM_LOGGING`：控制是否记录流式日志

这两个环境变量可以同时使用，流式日志会输出到控制台和文件（如果配置了
`GEMINI_DEBUG_LOG_FILE`）。

## 示例

### 本地开发环境

```bash
# 启用流式日志记录
export GEMINI_STREAM_LOGGING=1

# 同时输出到文件
export GEMINI_DEBUG_LOG_FILE=/tmp/a2a-debug.log

# 启动 A2A 服务器
npm start
```

### Kubernetes 生产环境

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: a2a-config
data:
  GEMINI_STREAM_LOGGING: '0' # 生产环境禁用
---
apiVersion: v1
kind: Pod
metadata:
  name: a2a-server
spec:
  containers:
    - name: a2a-server
      image: your-a2a-image
      envFrom:
        - configMapRef:
            name: a2a-config
```

### Kubernetes 开发环境

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: a2a-config
data:
  GEMINI_STREAM_LOGGING: '1' # 开发环境启用
---
apiVersion: v1
kind: Pod
metadata:
  name: a2a-server-dev
spec:
  containers:
    - name: a2a-server
      image: your-a2a-image
      envFrom:
        - configMapRef:
            name: a2a-config
      volumeMounts:
        - name: logs
          mountPath: /var/log/a2a
  volumes:
    - name: logs
      emptyDir: {}
```

## 相关文件

- [streamLogger.ts](file:///Volumes/lp/code/gemini-cli/packages/core/src/utils/streamLogger.ts) - 流式日志监听器实现
- [openAICompatibleContentGenerator.ts](file:///Volumes/lp/code/gemini-cli/packages/core/src/core/openAICompatibleContentGenerator.ts) - 流式内容生成器
