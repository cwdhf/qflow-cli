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
} from '@google/genai';
import { GenerateContentResponse, FinishReason } from '@google/genai';

import type { ContentGenerator } from './contentGenerator.js';
import type { UserTierId } from '../code_assist/types.js';
import type {
  OpenAITool,
  OpenAIMessageWithTools,
  OpenAICompletionResponse,
  OpenAIEmbeddingRequest,
  OpenAIEmbeddingResponse,
} from './openai-types.js';
import {
  convertToolsToOpenAI,
  convertToOpenAIMessagesWithTools,
  convertToOpenAIMessages,
  convertToGenerateContentResponse,
} from './openai-converter.js';
import { OpenAIClient } from './openai-client.js';
import { debugLogger } from '../utils/debugLogger.js';
import { TokenEstimator } from '../utils/tokenEstimator.js';
import { StreamLogger } from '../utils/streamLogger.js';

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
 * OpenAI兼容的内容生成器
 * 实现ContentGenerator接口，兼容OpenAI API规范
 */
export class OpenAICompatibleContentGenerator implements ContentGenerator {
  private model: string;
  private embeddingModel: string;
  private client: OpenAIClient;
  userTier?: UserTierId;
  private tokenEstimator: TokenEstimator;

  constructor(config: OpenAICompatibleConfig) {
    this.model = config.model;
    this.embeddingModel = config.embeddingModel || 'text-embedding-ada-002';
    this.client = new OpenAIClient(config);
    this.userTier = config.userTier;
    this.tokenEstimator = TokenEstimator.getInstance();
  }

  private mapFinishReason(
    reason: string | null | undefined,
  ): FinishReason | undefined {
    if (!reason) return undefined;
    switch (reason) {
      case 'stop':
        return FinishReason.STOP;
      case 'length':
        return FinishReason.MAX_TOKENS;
      case 'content_filter':
        return FinishReason.SAFETY;
      case 'function_call':
      case 'tool_calls':
        return FinishReason.STOP;
      default:
        return FinishReason.OTHER;
    }
  }

  /**
   * 生成内容
   */
  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const messages = convertToOpenAIMessagesWithTools(request.contents);

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
      const openaiTools = convertToolsToOpenAI(generationConfig.tools);
      debugLogger.log(
        'OpenAI tools converted:',
        JSON.stringify(openaiTools, null, 2),
      );
      if (openaiTools.length > 0) {
        completionRequest.tools = openaiTools;
        completionRequest.tool_choice = 'auto';
      }
    }

    debugLogger.log(
      'Sending OpenAI API request, messages:',
      JSON.stringify(messages, null, 2),
    );
    debugLogger.log(
      'Full request:',
      JSON.stringify(completionRequest, null, 2),
    );

    const response = await this.client.makeRequest<OpenAICompletionResponse>(
      `${this.client.endpoint}/chat/completions`,
      completionRequest,
    );

    debugLogger.log(
      'Received OpenAI API response:',
      JSON.stringify(response, null, 2),
    );

    // 转换为Gemini格式的响应
    return convertToGenerateContentResponse(response);
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
    debugLogger.log(
      'OpenAI generateContentStream called, using incremental streaming mode',
    );

    const messages = convertToOpenAIMessagesWithTools(request.contents);
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
      const openaiTools = convertToolsToOpenAI(generationConfig.tools);
      debugLogger.log(
        'OpenAI tools converted for streaming:',
        JSON.stringify(openaiTools, null, 2),
      );
      if (openaiTools.length > 0) {
        completionRequest.tools = openaiTools;
        completionRequest.tool_choice = 'auto';
      }
    }

    debugLogger.log(
      'Sending OpenAI streaming request:',
      JSON.stringify(completionRequest, null, 2),
    );

    // 调用真正的流式请求
    const stream = await this.client.makeStreamRequestExperimental(
      `${this.client.endpoint}/chat/completions`,
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

      // 用于本地token估算
      let accumulatedCompletionContent = '';
      let promptContent = '';
      const tokenEstimator = this.tokenEstimator;

      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const streamLogger = new StreamLogger(streamId);

      try {
        // 准备prompt内容用于估算
        try {
          promptContent = messages
            .map((msg) => {
              const role = msg.role || '';
              const content =
                typeof msg.content === 'string' ? msg.content : '';
              return `${role}: ${content}`;
            })
            .join('\n');
        } catch (error) {
          debugLogger.log(
            'Error preparing prompt content for estimation:',
            error,
          );
        }

        let _chunkCount = 0;

        for await (const chunk of stream) {
          _chunkCount++;

          streamLogger.addChunk(chunk, _chunkCount);

          // debugLogger.log(`Received chunk #${_chunkCount}...`);

          // 检查chunk结构
          if (
            !chunk.choices ||
            !Array.isArray(chunk.choices) ||
            chunk.choices.length === 0
          ) {
            debugLogger.log('Skipping chunk: invalid choices structure');
            continue;
          }

          const delta = chunk.choices[0]?.delta;
          if (!delta) {
            debugLogger.log('Skipping chunk: no delta in choices[0]');
            continue;
          }

          // 累积token使用信息（如果chunk中包含）
          if (chunk.usage) {
            accumulatedUsage = {
              prompt_tokens: chunk.usage.prompt_tokens || 0,
              completion_tokens: chunk.usage.completion_tokens || 0,
              total_tokens: chunk.usage.total_tokens || 0,
            };
            debugLogger.log(
              'Received usage metadata in stream chunk:',
              JSON.stringify(accumulatedUsage, null, 2),
            );
          } else if (chunk.choices[0]?.usage) {
            const choiceUsage = chunk.choices[0].usage;
            accumulatedUsage = {
              prompt_tokens: choiceUsage.prompt_tokens || 0,
              completion_tokens: choiceUsage.completion_tokens || 0,
              total_tokens: choiceUsage.total_tokens || 0,
            };
            debugLogger.log(
              'Received usage metadata in choice:',
              JSON.stringify(accumulatedUsage, null, 2),
            );
          }

          // 检查是否流结束
          const isFinished = chunk.choices[0]?.finish_reason;

          // 处理文本内容：只生成增量响应
          if (delta.content) {
            hasYielded = true;
            accumulatedCompletionContent += delta.content;

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
                ? this.mapFinishReason(chunk.choices[0]?.finish_reason) ||
                  FinishReason.STOP
                : undefined,
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
              debugLogger.log(
                'Added usage metadata to content response:',
                JSON.stringify(generateContentResponse.usageMetadata, null, 2),
              );
            } else if (isFinished && accumulatedUsage.total_tokens === 0) {
              // 如果API没有返回usage信息，使用本地估算
              const estimatedTokens = tokenEstimator.estimateTotalTokens(
                promptContent,
                accumulatedCompletionContent,
              );
              generateContentResponse.usageMetadata = {
                promptTokenCount: estimatedTokens.promptTokens,
                candidatesTokenCount: estimatedTokens.completionTokens,
                totalTokenCount: estimatedTokens.totalTokens,
              };
              debugLogger.log(
                'Added estimated usage metadata to content response:',
                JSON.stringify(generateContentResponse.usageMetadata, null, 2),
              );
            }

            yield generateContentResponse;
          } else if (isFinished && accumulatedToolCalls.length === 0) {
            // 如果流结束了但没有内容（例如最后一个chunk只包含finish_reason），

            const candidate = {
              content: {
                role: 'model',
                parts: [{ text: '' }], // 空内容
              },
              finishReason:
                this.mapFinishReason(chunk.choices[0]?.finish_reason) ||
                FinishReason.STOP,
              index: 0,
              safetyRatings: [],
            } as Candidate;

            const generateContentResponse = new GenerateContentResponse();
            generateContentResponse.candidates = [candidate];
            generateContentResponse.modelVersion =
              chunk['model'] || this.model || 'unknown';

            if (accumulatedUsage.total_tokens > 0) {
              generateContentResponse.usageMetadata = {
                promptTokenCount: accumulatedUsage.prompt_tokens,
                candidatesTokenCount: accumulatedUsage.completion_tokens,
                totalTokenCount: accumulatedUsage.total_tokens,
              };
              debugLogger.log(
                'Added usage metadata to empty content response:',
                JSON.stringify(generateContentResponse.usageMetadata, null, 2),
              );
            } else {
              // 如果API没有返回usage信息，使用本地估算
              const estimatedTokens = tokenEstimator.estimateTotalTokens(
                promptContent,
                accumulatedCompletionContent,
              );
              generateContentResponse.usageMetadata = {
                promptTokenCount: estimatedTokens.promptTokens,
                candidatesTokenCount: estimatedTokens.completionTokens,
                totalTokenCount: estimatedTokens.totalTokens,
              };
              debugLogger.log(
                'Added estimated usage metadata to empty content response:',
                JSON.stringify(generateContentResponse.usageMetadata, null, 2),
              );
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
                  debugLogger.log(
                    'Failed to parse tool call arguments:',
                    error,
                  );
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

            // 如果有累积的token使用信息，添加到响应中
            if (accumulatedUsage.total_tokens > 0) {
              generateContentResponse.usageMetadata = {
                promptTokenCount: accumulatedUsage.prompt_tokens,
                candidatesTokenCount: accumulatedUsage.completion_tokens,
                totalTokenCount: accumulatedUsage.total_tokens,
              };
              debugLogger.log(
                'Added usage metadata to tool call response:',
                JSON.stringify(generateContentResponse.usageMetadata, null, 2),
              );
            } else {
              // 如果API没有返回usage信息，使用本地估算
              const estimatedTokens = tokenEstimator.estimateTotalTokens(
                promptContent,
                accumulatedCompletionContent,
              );
              generateContentResponse.usageMetadata = {
                promptTokenCount: estimatedTokens.promptTokens,
                candidatesTokenCount: estimatedTokens.completionTokens,
                totalTokenCount: estimatedTokens.totalTokens,
              };
              debugLogger.log(
                'Added estimated usage metadata to tool call response:',
                JSON.stringify(generateContentResponse.usageMetadata, null, 2),
              );
            }

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

          // 如果有累积的token使用信息，即使是空响应也添加
          if (accumulatedUsage.total_tokens > 0) {
            generateContentResponse.usageMetadata = {
              promptTokenCount: accumulatedUsage.prompt_tokens,
              candidatesTokenCount: accumulatedUsage.completion_tokens,
              totalTokenCount: accumulatedUsage.total_tokens,
            };
            debugLogger.log(
              'Added usage metadata to fallback empty response:',
              JSON.stringify(generateContentResponse.usageMetadata, null, 2),
            );
          } else {
            // 如果API没有返回usage信息，使用本地估算
            const estimatedTokens = tokenEstimator.estimateTotalTokens(
              promptContent,
              accumulatedCompletionContent,
            );
            generateContentResponse.usageMetadata = {
              promptTokenCount: estimatedTokens.promptTokens,
              candidatesTokenCount: estimatedTokens.completionTokens,
              totalTokenCount: estimatedTokens.totalTokens,
            };
            debugLogger.log(
              'Added estimated usage metadata to fallback empty response:',
              JSON.stringify(generateContentResponse.usageMetadata, null, 2),
            );
          }

          yield generateContentResponse;
        }
      } finally {
        streamLogger.finish();
        StreamLogger.removeInstance(streamId);
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
    const contents = convertToOpenAIMessages(request.contents);
    const text = contents.map((msg) => msg.content).join('');

    // 使用本地token估算
    const estimatedTokens = this.tokenEstimator.estimateTokens(text);

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
    const contents = convertToOpenAIMessages(request.contents);
    const text = contents.map((msg) => msg.content).join('');

    const embeddingRequest: OpenAIEmbeddingRequest = {
      model: this.embeddingModel,
      input: text,
    };

    const response = await this.client.makeRequest<OpenAIEmbeddingResponse>(
      `${this.client.endpoint}/embeddings`,
      embeddingRequest,
    );

    const embedding: ContentEmbedding = {
      values: response.data[0].embedding,
    };

    return {
      embeddings: [embedding],
    };
  }
}
