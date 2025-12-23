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
import { promises as fs } from 'node:fs';

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

  constructor(config: OpenAICompatibleConfig) {
    this.model = config.model;
    this.embeddingModel = config.embeddingModel || 'text-embedding-ada-002';
    this.client = new OpenAIClient(config);
    this.userTier = config.userTier;
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

    const response = await this.client.makeRequest<OpenAICompletionResponse>(
      `${this.client.endpoint}/chat/completions`,
      completionRequest,
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
    console.log(
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
    const stream = await this.client.makeStreamRequestExperimental(
      `${this.client.endpoint}/chat/completions`,
      completionRequest,
    );

    // 日志文件路径
    const logFilePath = '/tmp/openai_stream_debug.log';

    // 辅助函数：写入日志文件
    const writeLog = async (message: string) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}\n`;
      await fs.appendFile(logFilePath, logMessage);
    };

    // 写入开始日志
    await writeLog('===== OPENAI STREAMING START =====');
    await writeLog(`Request: ${JSON.stringify(completionRequest)}`);

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

      // 记录收到的chunk数量
      let chunkCount = 0;

      for await (const chunk of stream) {
        chunkCount++;

        // 记录完整的chunk信息（简化版）
        await writeLog(`--- Chunk #${chunkCount} ---`);
        await writeLog(`Chunk ID: ${chunk.id}`);
        await writeLog(`Chunk model: ${chunk.model}`);
        await writeLog(`Chunk choices count: ${chunk.choices?.length || 0}`);

        // 检查chunk结构
        if (
          !chunk.choices ||
          !Array.isArray(chunk.choices) ||
          chunk.choices.length === 0
        ) {
          await writeLog('WARNING: Empty choices in streaming chunk');
          continue;
        }

        const delta = chunk.choices[0]?.delta;
        if (!delta) {
          await writeLog('WARNING: No delta in streaming chunk');
          continue;
        }

        // 记录delta内容
        await writeLog(`Delta has content: ${!!delta.content}`);
        await writeLog(`Delta has tool_calls: ${!!delta.tool_calls}`);
        await writeLog(`Delta role: ${delta.role || 'undefined'}`);

        // 累积token使用信息（如果chunk中包含）
        if (chunk.usage) {
          accumulatedUsage = {
            prompt_tokens: chunk.usage.prompt_tokens,
            completion_tokens: chunk.usage.completion_tokens,
            total_tokens: chunk.usage.total_tokens,
          };
          await writeLog(
            `Usage: prompt=${chunk.usage.prompt_tokens}, completion=${chunk.usage.completion_tokens}, total=${chunk.usage.total_tokens}`,
          );
        } else if (chunk.choices[0]?.usage) {
          // 某些API可能将usage放在choices[0]中
          const choiceUsage = chunk.choices[0].usage;
          accumulatedUsage = {
            prompt_tokens: choiceUsage.prompt_tokens,
            completion_tokens: choiceUsage.completion_tokens,
            total_tokens: choiceUsage.total_tokens,
          };
          await writeLog(
            `Choice usage: prompt=${choiceUsage.prompt_tokens}, completion=${choiceUsage.completion_tokens}, total=${choiceUsage.total_tokens}`,
          );
        }

        // 检查是否流结束
        const isFinished = chunk.choices[0]?.finish_reason;
        if (isFinished) {
          await writeLog(`Stream finished: ${isFinished}`);
        }

        // 处理文本内容：只生成增量响应
        if (delta.content) {
          hasYielded = true;
          // 调试：查看实际收到的增量内容
          const contentForLog = delta.content
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
          await writeLog(
            `delta.content: "${contentForLog}" (length: ${delta.content.length}, raw: ${JSON.stringify(delta.content)})`,
          );

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
          }

          yield generateContentResponse;
        } else if (isFinished && accumulatedToolCalls.length === 0) {
          // 如果流结束了但没有内容（例如最后一个chunk只包含finish_reason），
          // 我们必须生成一个带有finishReason的响应，否则geminiChat会认为流异常中断而重试
          await writeLog(
            `Stream finished without content in this chunk. Yielding finishReason: ${isFinished}`,
          );

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

          // 如果有累积的token使用信息，添加到响应中
          if (accumulatedUsage.total_tokens > 0) {
            generateContentResponse.usageMetadata = {
              promptTokenCount: accumulatedUsage.prompt_tokens,
              candidatesTokenCount: accumulatedUsage.completion_tokens,
              totalTokenCount: accumulatedUsage.total_tokens,
            };
          }

          yield generateContentResponse;
        }
      }

      // 流处理结束，写入总结日志
      await writeLog(`===== STREAM PROCESSING SUMMARY =====`);
      await writeLog(`Total chunks processed: ${chunkCount}`);
      await writeLog(`Has yielded content: ${hasYielded}`);
      await writeLog(`Accumulated tool calls: ${accumulatedToolCalls.length}`);
      await writeLog(
        `Final token usage: prompt=${accumulatedUsage.prompt_tokens}, completion=${accumulatedUsage.completion_tokens}, total=${accumulatedUsage.total_tokens}`,
      );

      // 如果整个流都没有生成任何响应，至少生成一个空响应
      if (!hasYielded && accumulatedToolCalls.length === 0) {
        await writeLog('Generating empty response (no content received)');

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
        }

        yield generateContentResponse;
      }

      await writeLog('===== OPENAI STREAMING END =====');
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
    const contents = convertToOpenAIMessages(request.contents);
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
