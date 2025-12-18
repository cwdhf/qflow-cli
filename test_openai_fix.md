# OpenAI兼容生成器函数调用修复方案

## 问题

`OpenAICompatibleContentGenerator`
不支持函数调用，导致OpenAI模式下无法使用shell工具。

## 需要修改的文件

`packages/core/src/core/openAICompatibleContentGenerator.ts`

## 需要添加的功能

### 1. 添加函数定义类型

```typescript
interface OpenAIFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface OpenAITool {
  type: 'function';
  function: OpenAIFunction;
}
```

### 2. 修改消息转换逻辑

需要处理包含函数调用的消息部分。

### 3. 修改请求格式

在OpenAI请求中添加`tools`参数。

### 4. 修改响应处理

正确处理OpenAI的函数调用响应。

## 具体修改步骤

### 步骤1：添加工具转换函数

```typescript
private convertToolsToOpenAI(tools: Tool[]): OpenAITool[] {
  if (!tools || tools.length === 0) {
    return [];
  }

  const openaiTools: OpenAITool[] = [];

  for (const tool of tools) {
    if (tool.functionDeclarations) {
      for (const funcDecl of tool.functionDeclarations) {
        openaiTools.push({
          type: 'function',
          function: {
            name: funcDecl.name,
            description: funcDecl.description || '',
            parameters: funcDecl.parameters || {
              type: 'object',
              properties: {},
            },
          },
        });
      }
    }
  }

  return openaiTools;
}
```

### 步骤2：修改generateContent方法

在请求中添加tools参数：

```typescript
const completionRequest: any = {
  model: this.model,
  messages,
  temperature: generationConfig?.temperature,
  max_tokens: generationConfig?.maxOutputTokens,
  top_p: generationConfig?.topP,
  stream: false,
};

// 添加工具支持
if (request.config?.tools) {
  const openaiTools = this.convertToolsToOpenAI(request.config.tools);
  if (openaiTools.length > 0) {
    completionRequest.tools = openaiTools;
    completionRequest.tool_choice = 'auto';
  }
}
```

### 步骤3：修改响应处理

处理OpenAI的函数调用响应：

```typescript
private convertToGenerateContentResponse(
  response: any,
): GenerateContentResponse {
  const candidate: Candidate = {
    content: {
      role: 'model',
      parts: [],
    },
    finishReason: FinishReason.STOP,
    index: 0,
  };

  // 处理文本响应
  if (response.choices[0]?.message?.content) {
    candidate.content.parts.push({
      text: response.choices[0].message.content,
    });
  }

  // 处理函数调用
  if (response.choices[0]?.message?.tool_calls) {
    for (const toolCall of response.choices[0].message.tool_calls) {
      if (toolCall.type === 'function') {
        candidate.content.parts.push({
          functionCall: {
            name: toolCall.function.name,
            args: JSON.parse(toolCall.function.arguments || '{}'),
          },
        });
      }
    }
  }

  // 设置finish reason
  if (response.choices[0]?.finish_reason === 'tool_calls') {
    candidate.finishReason = FinishReason.STOP;
  }

  const generateContentResponse = new GenerateContentResponse();
  generateContentResponse.candidates = [candidate];
  generateContentResponse.modelVersion = response.model;

  return generateContentResponse;
}
```

## 测试

修复后，OpenAI模式应该能够：

1. 接收工具定义
2. 调用shell工具
3. 执行命令如 `ping www.baidu.com`
