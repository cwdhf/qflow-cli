/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ContentListUnion,
  PartUnion,
  ToolListUnion,
  Candidate,
} from '@google/genai';
import { FinishReason, GenerateContentResponse } from '@google/genai';
import type {
  OpenAIMessageWithTools,
  OpenAITool,
  OpenAICompletionResponse,
  OpenAIToolCall,
  OpenAIStreamChunk,
} from './openai-types.js';

/**
 * 将Gemini内容格式转换为OpenAI消息格式（向后兼容）
 */
export function convertToOpenAIMessages(
  contents: ContentListUnion,
): OpenAIMessageWithTools[] {
  const messages = convertToOpenAIMessagesWithTools(contents);
  // 转换为简单的消息格式用于countTokens和embedContent
  return messages.map((msg) => {
    const result: OpenAIMessageWithTools = {
      role: msg.role,
      content: '',
    };

    // 处理content字段
    if (typeof msg.content === 'string') {
      result.content = msg.content || '';
    } else if (Array.isArray(msg.content)) {
      // 如果是数组，提取文本内容
      const textContent = msg.content
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('');
      result.content = textContent || '';
    }

    // 只在有值时才添加这些字段
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      result.tool_calls = msg.tool_calls;
    }

    if (msg.tool_call_id) {
      result.tool_call_id = msg.tool_call_id;
    }

    return result;
  });
}

/**
 * 将Gemini工具转换为OpenAI工具格式
 */
export function convertToolsToOpenAI(
  tools: ToolListUnion | undefined,
): OpenAITool[] {
  if (!tools || !Array.isArray(tools)) {
    return [];
  }

  const openaiTools: OpenAITool[] = [];

  for (const tool of tools) {
    // 检查是否是具有functionDeclarations的工具类型
    if (
      'functionDeclarations' in tool &&
      tool.functionDeclarations &&
      Array.isArray(tool.functionDeclarations)
    ) {
      for (const funcDecl of tool.functionDeclarations) {
        openaiTools.push({
          type: 'function',
          function: {
            name: funcDecl.name || 'unknown',
            description: funcDecl.description || '',
            parameters: funcDecl.parameters
              ? {
                  type: funcDecl.parameters.type || 'object',
                  properties: funcDecl.parameters.properties || {},
                  required: funcDecl.parameters.required,
                }
              : {
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

/**
 * 将Gemini内容转换为OpenAI消息格式（支持工具调用）
 */
export function convertToOpenAIMessagesWithTools(
  contents: ContentListUnion,
): OpenAIMessageWithTools[] {
  const messages: OpenAIMessageWithTools[] = [];

  // 辅助函数：从 PartUnion 提取信息
  const extractFromPartUnion = (
    part: PartUnion,
  ): {
    text?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
    functionResponse?: { name: string; response: Record<string, unknown> };
  } => {
    if (typeof part === 'string') {
      return { text: part };
    }
    if (part.text !== undefined) {
      return { text: part.text };
    }
    if (part.functionCall) {
      return {
        functionCall: {
          name: part.functionCall.name || 'unknown',
          args: part.functionCall.args || {},
        },
      };
    }
    if (part.functionResponse) {
      return {
        functionResponse: {
          name: part.functionResponse.name || 'unknown',
          response: part.functionResponse.response || {},
        },
      };
    }
    return {};
  };

  // 处理 ContentListUnion 类型
  if (typeof contents === 'string') {
    // 字符串
    messages.push({
      role: 'user',
      content: contents,
    });
  } else if (
    contents &&
    typeof contents === 'object' &&
    'role' in contents &&
    !Array.isArray(contents)
  ) {
    // 单个 Content 对象（不是数组）
    const contentItem = contents as {
      role: 'user' | 'model' | 'assistant' | 'tool';
      parts: PartUnion[];
    };
    const message: OpenAIMessageWithTools = {
      role: contentItem.role === 'model' ? 'assistant' : contentItem.role,
      content: '',
    };

    if (contentItem.parts && Array.isArray(contentItem.parts)) {
      let textContent = '';
      const toolCalls: OpenAIToolCall[] = [];

      for (const part of contentItem.parts) {
        const extracted = extractFromPartUnion(part);

        if (extracted.text) {
          textContent += (textContent ? '\n' : '') + extracted.text;
        }

        if (extracted.functionCall) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'function',
            function: {
              name: extracted.functionCall.name,
              arguments: JSON.stringify(extracted.functionCall.args || {}),
            },
          });
        }

        if (extracted.functionResponse) {
          // 函数响应作为工具消息
          const responseContent = extracted.functionResponse.response;

          // 确保content是字符串
          let contentString: string;
          if (typeof responseContent === 'string') {
            contentString = responseContent;
          } else if (
            typeof responseContent === 'object' &&
            responseContent !== null
          ) {
            // 如果是对象，检查是否有特定的格式
            // 工具返回的结果可能是一个包含output、stdout、stderr等的对象
            if (responseContent['output'] !== undefined) {
              contentString = String(responseContent['output']);
            } else if (responseContent['stdout'] !== undefined) {
              contentString = String(responseContent['stdout']);
            } else if (responseContent['result'] !== undefined) {
              contentString = String(responseContent['result']);
            } else {
              // 其他对象转换为JSON字符串
              contentString = JSON.stringify(responseContent, null, 2);
            }
          } else {
            // 其他类型转换为字符串
            contentString = String(responseContent);
          }

          messages.push({
            role: 'tool',
            content: contentString,
            tool_call_id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          });
        }
      }

      message.content = textContent || '';
      if (toolCalls.length > 0) {
        message.tool_calls = toolCalls;
      }
    }

    messages.push(message);
  } else if (Array.isArray(contents)) {
    // 数组
    for (const item of contents) {
      if (typeof item === 'string') {
        // 字符串
        messages.push({
          role: 'user',
          content: item,
        });
      } else if (item && typeof item === 'object' && 'role' in item) {
        // Content 类型
        const contentItem = item as {
          role: 'user' | 'model' | 'assistant' | 'tool';
          parts: PartUnion[];
        };
        const message: OpenAIMessageWithTools = {
          role: contentItem.role === 'model' ? 'assistant' : contentItem.role,
          content: '',
        };

        if (contentItem.parts && Array.isArray(contentItem.parts)) {
          let textContent = '';
          const toolCalls: OpenAIToolCall[] = [];

          for (const part of contentItem.parts) {
            const extracted = extractFromPartUnion(part);

            if (extracted.text) {
              textContent += (textContent ? '\n' : '') + extracted.text;
            }

            if (extracted.functionCall) {
              toolCalls.push({
                id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'function',
                function: {
                  name: extracted.functionCall.name,
                  arguments: JSON.stringify(extracted.functionCall.args || {}),
                },
              });
            }

            if (extracted.functionResponse) {
              // 函数响应作为工具消息
              const responseContent = extracted.functionResponse.response;

              // 确保content是字符串
              let contentString: string;
              if (typeof responseContent === 'string') {
                contentString = responseContent;
              } else if (
                typeof responseContent === 'object' &&
                responseContent !== null
              ) {
                // 如果是对象，检查是否有特定的格式
                // 工具返回的结果可能是一个包含output、stdout、stderr等的对象
                if (responseContent['output'] !== undefined) {
                  contentString = String(responseContent['output']);
                } else if (responseContent['stdout'] !== undefined) {
                  contentString = String(responseContent['stdout']);
                } else if (responseContent['result'] !== undefined) {
                  contentString = String(responseContent['result']);
                } else {
                  // 其他对象转换为JSON字符串
                  contentString = JSON.stringify(responseContent, null, 2);
                }
              } else {
                // 其他类型转换为字符串
                contentString = String(responseContent);
              }

              messages.push({
                role: 'tool',
                content: contentString,
                tool_call_id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              });
            }
          }

          message.content = textContent || '';
          if (toolCalls.length > 0) {
            message.tool_calls = toolCalls;
          }
        }

        messages.push(message);
      }
    }
  }

  return messages;
}

/**
 * 将OpenAI响应转换为GenerateContentResponse
 */
export function convertToGenerateContentResponse(
  response: OpenAICompletionResponse,
): GenerateContentResponse {
  console.log(
    'OpenAI API Response received:',
    JSON.stringify(response, null, 2),
  );

  // 检查响应结构
  if (
    !response.choices ||
    !Array.isArray(response.choices) ||
    response.choices.length === 0
  ) {
    console.error(
      'Invalid OpenAI response structure - choices is empty or undefined:',
      response,
    );
    // 返回一个空的响应
    const candidate = {
      content: {
        role: 'model',
        parts: [{ text: 'Error: Invalid response from OpenAI API' }],
      },
      finishReason: FinishReason.STOP,
      index: 0,
      safetyRatings: [],
      citationMetadata: undefined,
      groundingMetadata: undefined,
      finishMessage: undefined,
    } as Candidate;

    const generateContentResponse = new GenerateContentResponse();
    generateContentResponse.candidates = [candidate];
    generateContentResponse.modelVersion = response.model || 'unknown';
    return generateContentResponse;
  }

  const candidate = {
    content: {
      role: 'model',
      parts: [],
    },
    finishReason:
      (response.choices[0]?.finish_reason as FinishReason) || FinishReason.STOP,
    index: 0,
    safetyRatings: [],
    citationMetadata: undefined,
    groundingMetadata: undefined,
    finishMessage: undefined,
  } as Candidate;

  const message = response.choices[0]?.message;

  // 处理文本内容
  if (message?.content) {
    let textContent = '';

    if (typeof message.content === 'string') {
      textContent = message.content;
    } else if (Array.isArray(message.content)) {
      // 如果是数组，提取文本内容
      textContent = message.content
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('');
    }

    if (textContent) {
      candidate.content!.parts!.push({
        text: textContent,
      });
    }
  }

  // 处理工具调用
  if (message?.tool_calls && Array.isArray(message.tool_calls)) {
    for (const toolCall of message.tool_calls) {
      if (toolCall.type === 'function') {
        try {
          const args = JSON.parse(toolCall.function.arguments || '{}');
          candidate.content!.parts!.push({
            functionCall: {
              name: toolCall.function.name,
              args,
            },
          });
        } catch (error) {
          console.error('Failed to parse tool call arguments:', error);
          candidate.content!.parts!.push({
            functionCall: {
              name: toolCall.function.name,
              args: {},
            },
          });
        }
      }
    }
  }

  // 如果没有parts，添加一个空的文本part
  if (candidate.content!.parts!.length === 0) {
    candidate.content!.parts!.push({
      text: '',
    });
  }

  const generateContentResponse = new GenerateContentResponse();
  generateContentResponse.candidates = [candidate];
  generateContentResponse.modelVersion = response.model || 'unknown';
  generateContentResponse.usageMetadata = response.usage
    ? {
        promptTokenCount: response.usage.prompt_tokens || 0,
        candidatesTokenCount: response.usage.completion_tokens || 0,
        totalTokenCount: response.usage.total_tokens || 0,
      }
    : undefined;

  return generateContentResponse;
}

/**
 * 转换OpenAI流式响应块为Gemini格式
 */
export function convertStreamChunkToGeminiResponse(
  chunk: OpenAIStreamChunk,
  accumulatedToolCalls: OpenAIToolCall[] = [],
  accumulatedUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  },
) {
  // 实现流式响应转换逻辑
  // 简化版实现，实际可能需要更复杂的状态管理
  if (!chunk.choices || chunk.choices.length === 0) {
    return null;
  }

  const delta = chunk.choices[0].delta;
  if (!delta) {
    return null;
  }

  // 累积token使用信息
  if (chunk.usage) {
    accumulatedUsage = {
      prompt_tokens:
        chunk.usage.prompt_tokens || accumulatedUsage.prompt_tokens,
      completion_tokens:
        chunk.usage.completion_tokens || accumulatedUsage.completion_tokens,
      total_tokens: chunk.usage.total_tokens || accumulatedUsage.total_tokens,
    };
  }

  // 处理工具调用增量
  if (delta.tool_calls && delta.tool_calls.length > 0) {
    delta.tool_calls.forEach((toolCallDelta) => {
      const index = toolCallDelta.index || 0;
      if (!accumulatedToolCalls[index]) {
        accumulatedToolCalls[index] = {
          id: toolCallDelta.id || `call_${Date.now()}`,
          type: 'function',
          function: {
            name: toolCallDelta.function?.name || '',
            arguments: toolCallDelta.function?.arguments || '',
          },
        };
      } else {
        if (toolCallDelta.function?.name) {
          accumulatedToolCalls[index].function.name =
            toolCallDelta.function.name;
        }
        if (toolCallDelta.function?.arguments) {
          accumulatedToolCalls[index].function.arguments +=
            toolCallDelta.function.arguments;
        }
      }
    });
  }

  // 构建Gemini响应格式
  const candidate = {
    content: {
      role: 'model',
      parts: [],
    },
    finishReason: chunk.choices[0]?.finish_reason
      ? FinishReason.STOP
      : undefined,
    index: 0,
    safetyRatings: [],
    citationMetadata: undefined,
    groundingMetadata: undefined,
    finishMessage: undefined,
  } as Candidate;

  // 处理文本内容增量
  if (delta.content && candidate.content) {
    if (!candidate.content.parts) {
      candidate.content.parts = [];
    }
    candidate.content.parts.push({ text: delta.content });
  }

  // 处理工具调用
  if (accumulatedToolCalls.length > 0 && candidate.content) {
    if (!candidate.content.parts) {
      candidate.content.parts = [];
    }
    candidate.content.parts = candidate.content.parts.concat(
      accumulatedToolCalls.map((toolCall) => ({
        functionCall: {
          name: toolCall.function.name,
          args: JSON.parse(toolCall.function.arguments || '{}'),
        },
      })),
    );
  }

  const response = new GenerateContentResponse();
  response.candidates = [candidate];
  response.modelVersion = chunk.model || 'unknown';
  response.usageMetadata =
    accumulatedUsage.prompt_tokens > 0
      ? {
          promptTokenCount: accumulatedUsage.prompt_tokens,
          candidatesTokenCount: accumulatedUsage.completion_tokens,
          totalTokenCount: accumulatedUsage.total_tokens,
        }
      : undefined;

  return {
    response,
    accumulatedToolCalls,
    accumulatedUsage,
  };
}
