/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CountTokensResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
  Candidate,
  ContentEmbedding,
  ContentListUnion,
  PartUnion,
  ToolListUnion,
} from '@google/genai';
import { GenerateContentResponse, FinishReason } from '@google/genai';

import type { ContentGenerator } from './contentGenerator.js';
import type { UserTierId } from '../code_assist/types.js';

/**
 * OpenAI兼容的内容生成器配置
 */
export interface OpenAICompatibleConfig {
  /** API端点地址，例如: https://api.openai.com/v1 */
  endpoint: string;
  /** 聊天模型名称，例如: gpt-3.5-turbo */
  model: string;
  /** Embedding模型名称，例如: text-embedding-ada-002 */
  embeddingModel?: string;
  /** API密钥 */
  apiKey: string;
  /** 组织ID (可选) */
  organization?: string;
  /** 项目ID (可选) */
  project?: string;
  /** 用户层级 (可选) */
  userTier?: UserTierId;
}

/**
 * OpenAI函数定义
 */
interface OpenAIFunction {
  name: string;
  description?: string;
  parameters?: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * OpenAI工具定义
 */
interface OpenAITool {
  type: 'function';
  function: OpenAIFunction;
}

/**
 * OpenAI工具调用
 */
interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * OpenAI消息内容项（用于多模态内容）
 */
interface OpenAIContentItem {
  type: 'text';
  text: string;
}

/**
 * OpenAI消息（支持工具调用）
 */
interface OpenAIMessageWithTools {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | OpenAIContentItem[] | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

/**
 * OpenAI聊天完成响应（支持工具调用）
 */
interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessageWithTools;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI Embedding请求
 */
interface OpenAIEmbeddingRequest {
  model: string;
  input: string | string[];
}

/**
 * OpenAI Embedding响应
 */
interface OpenAIEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI流式工具调用增量
 */
interface OpenAIStreamToolCallDelta {
  index: number;
  id?: string;
  type?: 'function';
  function?: {
    name?: string;
    arguments?: string;
  };
}

/**
 * OpenAI流式响应块
 */
interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: OpenAIStreamToolCallDelta[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI兼容的内容生成器
 * 实现ContentGenerator接口，兼容OpenAI API规范
 */
export class OpenAICompatibleContentGenerator implements ContentGenerator {
  private endpoint: string;
  private model: string;
  private embeddingModel: string;
  private apiKey: string;
  private organization?: string;
  private project?: string;
  userTier?: UserTierId;

  constructor(config: OpenAICompatibleConfig) {
    this.endpoint = config.endpoint;
    this.model = config.model;
    this.embeddingModel = config.embeddingModel || 'text-embedding-ada-002';
    this.apiKey = config.apiKey;
    this.organization = config.organization;
    this.project = config.project;
    this.userTier = config.userTier;
  }

  /**
   * 将Gemini内容格式转换为OpenAI消息格式（向后兼容）
   */
  private convertToOpenAIMessages(
    contents: ContentListUnion,
  ): OpenAIMessageWithTools[] {
    const messages = this.convertToOpenAIMessagesWithTools(contents);
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
  private convertToolsToOpenAI(tools: ToolListUnion | undefined): OpenAITool[] {
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
  private convertToOpenAIMessagesWithTools(
    contents: ContentListUnion,
  ): OpenAIMessageWithTools[] {
    const messages: OpenAIMessageWithTools[] = [];

    console.log(
      'convertToOpenAIMessagesWithTools input:',
      JSON.stringify(contents, null, 2),
    );

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
                    arguments: JSON.stringify(
                      extracted.functionCall.args || {},
                    ),
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
   * 生成内容
   */
  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const messages = this.convertToOpenAIMessagesWithTools(request.contents);

    // 提取生成配置
    const generationConfig = request.config;

    const completionRequest: {
      model: string;
      messages: OpenAIMessageWithTools[];
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      stream: boolean;
      tools?: OpenAITool[];
      tool_choice?:
        | 'auto'
        | 'none'
        | { type: 'function'; function: { name: string } };
    } = {
      model: this.model,
      messages,
      temperature: generationConfig?.temperature,
      max_tokens: generationConfig?.maxOutputTokens,
      top_p: generationConfig?.topP,
      stream: false,
    };

    // 添加工具支持
    if (generationConfig?.tools) {
      const openaiTools = this.convertToolsToOpenAI(generationConfig.tools);
      console.log(
        'OpenAI tools converted:',
        JSON.stringify(openaiTools, null, 2),
      );
      if (openaiTools.length > 0) {
        completionRequest.tools = openaiTools;
        completionRequest.tool_choice = 'auto';
      }
    }

    console.log(
      'Sending OpenAI API request, messages:',
      JSON.stringify(messages, null, 2),
    );
    console.log('Full request:', JSON.stringify(completionRequest, null, 2));

    const response = await this.makeRequest<OpenAICompletionResponse>(
      `${this.endpoint}/chat/completions`,
      completionRequest,
    );

    // 转换为Gemini格式的响应
    return this.convertToGenerateContentResponse(response);
  }

  /**
   * 生成流式内容（简化版 - 非流式）
   * 注意：这是简化版本，直接使用非流式调用
   * 用于工具调用等不需要实时流式响应的场景
   */
  async generateContentTest(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    console.log(
      'OpenAI generateContentStream called, using non-streaming simplified version',
    );

    // 对于OpenAI，特别是工具调用，直接使用非流式API
    // 这样可以避免复杂的流式解析问题
    const response = await this.generateContent(request, userPromptId);

    return (async function* () {
      yield response;
    })();
  }

  /**
   * 生成真正的流式内容（增量模式）
   * 注意：这是真正的流式处理版本，只生成增量响应
   * 避免内容重复，客户端需要自己累积内容
   */
  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    console.log(
      'OpenAI generateContentStream called, using incremental streaming mode',
    );

    const messages = this.convertToOpenAIMessagesWithTools(request.contents);
    const generationConfig = request.config;

    const completionRequest: {
      model: string;
      messages: OpenAIMessageWithTools[];
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      stream: boolean;
      tools?: OpenAITool[];
      tool_choice?:
        | 'auto'
        | 'none'
        | { type: 'function'; function: { name: string } };
    } = {
      model: this.model,
      messages,
      temperature: generationConfig?.temperature,
      max_tokens: generationConfig?.maxOutputTokens,
      top_p: generationConfig?.topP,
      stream: true, // 启用真正的流式
    };

    // 添加工具支持
    if (generationConfig?.tools) {
      const openaiTools = this.convertToolsToOpenAI(generationConfig.tools);
      console.log(
        'OpenAI tools converted for streaming:',
        JSON.stringify(openaiTools, null, 2),
      );
      if (openaiTools.length > 0) {
        completionRequest.tools = openaiTools;
        completionRequest.tool_choice = 'auto';
      }
    }

    console.log(
      'Sending OpenAI streaming request:',
      JSON.stringify(completionRequest, null, 2),
    );

    // 调用真正的流式请求
    const stream = await this.makeStreamRequestExperimental(
      `${this.endpoint}/chat/completions`,
      completionRequest,
    );

    // 使用箭头函数保留this上下文，避免使用self别名
    const generate = async function* (
      this: OpenAICompatibleContentGenerator,
    ): AsyncGenerator<GenerateContentResponse> {
      let hasYielded = false;
      interface ToolCall {
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }
      const accumulatedToolCalls: ToolCall[] = [];
      let accumulatedUsage = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      for await (const chunk of stream) {
        console.log('OpenAI streaming chunk:', JSON.stringify(chunk, null, 2));

        // 检查chunk结构
        if (
          !chunk.choices ||
          !Array.isArray(chunk.choices) ||
          chunk.choices.length === 0
        ) {
          console.warn('Empty choices in streaming chunk, skipping:', chunk);
          continue;
        }

        const delta = chunk.choices[0]?.delta;
        if (!delta) {
          console.warn('No delta in streaming chunk, skipping:', chunk);
          continue;
        }

        // 累积token使用信息（如果chunk中包含）
        if (chunk.usage) {
          accumulatedUsage = {
            prompt_tokens:
              chunk.usage.prompt_tokens || accumulatedUsage.prompt_tokens,
            completion_tokens:
              chunk.usage.completion_tokens ||
              accumulatedUsage.completion_tokens,
            total_tokens:
              chunk.usage.total_tokens || accumulatedUsage.total_tokens,
          };
        }

        // 检查是否流结束
        const isFinished = chunk.choices[0]?.finish_reason;

        // 处理文本内容：只生成增量响应
        if (delta.content) {
          hasYielded = true;
          const candidate = {
            content: {
              role: 'model',
              parts: [
                {
                  text: delta.content, // 只包含当前增量
                },
              ],
            },
            finishReason: isFinished
              ? (chunk.choices[0]?.finish_reason as FinishReason) ||
                FinishReason.STOP
              : FinishReason.STOP,
            index: 0,
            safetyRatings: [],
            citationMetadata: undefined,
            groundingMetadata: undefined,
            finishMessage: undefined,
          } as Candidate;

          const generateContentResponse = new GenerateContentResponse();
          generateContentResponse.candidates = [candidate];
          generateContentResponse.modelVersion =
            chunk['model'] || this.model || 'unknown';

          // 如果是流结束的chunk，并且有累积的token使用信息，添加到响应中
          if (isFinished && accumulatedUsage.total_tokens > 0) {
            generateContentResponse.usageMetadata = {
              promptTokenCount: accumulatedUsage.prompt_tokens,
              candidatesTokenCount: accumulatedUsage.completion_tokens,
              totalTokenCount: accumulatedUsage.total_tokens,
            };
          }

          yield generateContentResponse;
        }

        // 处理工具调用：累积并在流结束时生成
        if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
          for (const toolCallDelta of delta.tool_calls) {
            const index = toolCallDelta.index || 0;

            // 初始化工具调用数组
            if (!accumulatedToolCalls[index]) {
              accumulatedToolCalls[index] = {
                id: toolCallDelta.id || `call_${Date.now()}_${index}`,
                type: 'function',
                function: {
                  name: '',
                  arguments: '',
                },
              };
            }

            // 累积函数名称
            if (toolCallDelta.function?.name) {
              accumulatedToolCalls[index].function.name +=
                toolCallDelta.function.name;
            }

            // 累积函数参数
            if (toolCallDelta.function?.arguments) {
              accumulatedToolCalls[index].function.arguments +=
                toolCallDelta.function.arguments;
            }
          }
        }

        // 流结束时，如果有工具调用，生成工具调用响应
        if (isFinished && accumulatedToolCalls.length > 0) {
          const candidate = {
            content: {
              role: 'model',
              parts: [],
            },
            finishReason:
              (chunk.choices[0]?.finish_reason as FinishReason) ||
              FinishReason.STOP,
            index: 0,
            safetyRatings: [],
            citationMetadata: undefined,
            groundingMetadata: undefined,
            finishMessage: undefined,
          } as Candidate;

          // 添加累积的工具调用
          for (const toolCall of accumulatedToolCalls) {
            if (toolCall.function.name) {
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

          const generateContentResponse = new GenerateContentResponse();
          generateContentResponse.candidates = [candidate];
          generateContentResponse.modelVersion =
            chunk['model'] || this.model || 'unknown';

          yield generateContentResponse;
        }
      }

      // 如果整个流都没有生成任何响应，至少生成一个空响应
      if (!hasYielded && accumulatedToolCalls.length === 0) {
        const candidate = {
          content: {
            role: 'model',
            parts: [
              {
                text: '',
              },
            ],
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
        generateContentResponse.modelVersion = this.model || 'unknown';

        yield generateContentResponse;
      }
    };

    return generate.call(this);
  }

  /**
   * 计算token数量
   */
  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // OpenAI没有专门的token计数端点，这里进行估算
    const contents = this.convertToOpenAIMessages(request.contents);
    const text = contents.map((msg) => msg.content).join('');

    // 粗略估算：英文约4个字符一个token
    const estimatedTokens = Math.ceil(text.length / 4);

    return {
      totalTokens: estimatedTokens,
    };
  }

  /**
   * 生成嵌入向量
   */
  async embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    const contents = this.convertToOpenAIMessages(request.contents);
    const text = contents.map((msg) => msg.content).join('');

    const embeddingRequest: OpenAIEmbeddingRequest = {
      model: this.embeddingModel,
      input: text,
    };

    const response = await this.makeRequest<OpenAIEmbeddingResponse>(
      `${this.endpoint}/embeddings`,
      embeddingRequest,
    );

    const embedding: ContentEmbedding = {
      values: response.data[0].embedding,
    };

    return {
      embeddings: [embedding],
    };
  }

  /**
   * 发送HTTP请求
   */
  private async makeRequest<T>(url: string, body: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    if (this.project) {
      headers['OpenAI-Project'] = this.project;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json();
  }

  /**
   * 发送流式HTTP请求（实验性）
   * 用于真正的流式处理
   */
  private async makeStreamRequestExperimental(
    url: string,
    body: unknown,
  ): Promise<AsyncIterable<OpenAIStreamChunk>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    if (this.project) {
      headers['OpenAI-Project'] = this.project;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI API stream request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    async function* generate(): AsyncGenerator<OpenAIStreamChunk> {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream reading done');
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                console.log('Stream finished with [DONE]');
                return;
              }
              try {
                const parsed = JSON.parse(data);
                yield parsed;
              } catch (e) {
                console.error(
                  'Failed to parse stream chunk:',
                  e,
                  'Data:',
                  data,
                );
              }
            }
          }
        }
      } finally {
        console.log('Releasing stream reader lock');
        reader.releaseLock();
      }
    }

    return generate();
  }

  /**
   * 将OpenAI响应转换为GenerateContentResponse
   */
  private convertToGenerateContentResponse(
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
        (response.choices[0]?.finish_reason as FinishReason) ||
        FinishReason.STOP,
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
    generateContentResponse.modelVersion =
      response.model || this.model || 'unknown';

    // 设置 usageMetadata 如果存在
    if (response.usage) {
      generateContentResponse.usageMetadata = {
        promptTokenCount: response.usage.prompt_tokens || 0,
        candidatesTokenCount: response.usage.completion_tokens || 0,
        totalTokenCount: response.usage.total_tokens || 0,
      };
    }

    return generateContentResponse;
  }
}
