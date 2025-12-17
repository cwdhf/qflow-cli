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
  Part,
  Candidate,
  ContentEmbedding,
  ContentListUnion,
  PartUnion,
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
 * OpenAI API消息格式
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI聊天完成请求
 */
interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

/**
 * OpenAI聊天完成响应
 */
interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
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
    };
    finish_reason: string | null;
  }>;
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
   * 将Gemini内容格式转换为OpenAI消息格式
   */
  private convertToOpenAIMessages(contents: ContentListUnion): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];

    // 辅助函数：从 PartUnion 提取文本
    const extractTextFromPartUnion = (part: PartUnion): string => {
      if (typeof part === 'string') {
        return part;
      }
      return part.text || '';
    };

    // 处理 ContentListUnion 类型
    if (typeof contents === 'string') {
      // 字符串
      messages.push({
        role: 'user',
        content: contents,
      });
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
          if (item.role === 'user') {
            messages.push({
              role: 'user',
              content: this.extractTextFromParts(item.parts),
            });
          } else if (item.role === 'model') {
            messages.push({
              role: 'assistant',
              content: this.extractTextFromParts(item.parts),
            });
          }
        } else if (item && typeof item === 'object') {
          // Part 类型
          messages.push({
            role: 'user',
            content: extractTextFromPartUnion(item as Part),
          });
        }
      }
    } else if (contents && typeof contents === 'object' && 'role' in contents) {
      // Content 类型
      if (contents.role === 'user') {
        messages.push({
          role: 'user',
          content: this.extractTextFromParts(contents.parts),
        });
      } else if (contents.role === 'model') {
        messages.push({
          role: 'assistant',
          content: this.extractTextFromParts(contents.parts),
        });
      }
    } else if (contents && typeof contents === 'object') {
      // Part 类型
      messages.push({
        role: 'user',
        content: extractTextFromPartUnion(contents as Part),
      });
    }

    return messages;
  }

  /**
   * 从parts中提取文本
   */
  private extractTextFromParts(parts: Part[] | undefined): string {
    if (!parts || !Array.isArray(parts)) {
      return '';
    }

    return parts
      .map((part: Part) => part.text || '')
      .filter((text: string) => text.trim())
      .join('\n');
  }

  /**
   * 生成内容
   */
  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const messages = this.convertToOpenAIMessages(request.contents);

    // 提取生成配置
    const generationConfig = request.config;

    const completionRequest: OpenAICompletionRequest = {
      model: this.model,
      messages,
      temperature: generationConfig?.temperature,
      max_tokens: generationConfig?.maxOutputTokens,
      top_p: generationConfig?.topP,
      stream: false,
    };

    const response = await this.makeRequest<OpenAICompletionResponse>(
      `${this.endpoint}/chat/completions`,
      completionRequest,
    );

    // 转换为Gemini格式的响应
    return this.convertToGenerateContentResponse(response);
  }

  /**
   * 生成流式内容
   */
  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const messages = this.convertToOpenAIMessages(request.contents);

    // 提取生成配置
    const generationConfig = request.config;

    const completionRequest: OpenAICompletionRequest = {
      model: this.model,
      messages,
      temperature: generationConfig?.temperature,
      max_tokens: generationConfig?.maxOutputTokens,
      top_p: generationConfig?.topP,
      stream: true,
    };

    const stream = await this.makeStreamRequest(
      `${this.endpoint}/chat/completions`,
      completionRequest,
    );

    async function* generate(): AsyncGenerator<GenerateContentResponse> {
      for await (const chunk of stream) {
        const candidate: Candidate = {
          content: {
            role: 'model',
            parts: [
              {
                text: chunk.choices[0]?.delta?.content || '',
              },
            ],
          },
          finishReason:
            (chunk.choices[0]?.finish_reason as FinishReason) ||
            FinishReason.STOP,
          index: 0,
        };

        const generateContentResponse = new GenerateContentResponse();
        generateContentResponse.candidates = [candidate];
        generateContentResponse.modelVersion = chunk.model;

        yield generateContentResponse;
      }
    }

    return generate();
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
   * 发送流式HTTP请求
   */
  private async makeStreamRequest(
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
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                return;
              }
              try {
                const parsed = JSON.parse(data);
                yield parsed;
              } catch (e) {
                console.error('Failed to parse stream chunk:', e);
              }
            }
          }
        }
      } finally {
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
    const candidate: Candidate = {
      content: {
        role: 'model',
        parts: [
          {
            text: response.choices[0]?.message?.content || '',
          },
        ],
      },
      finishReason:
        (response.choices[0]?.finish_reason as FinishReason) ||
        FinishReason.STOP,
      index: 0,
    };

    const generateContentResponse = new GenerateContentResponse();
    generateContentResponse.candidates = [candidate];
    generateContentResponse.modelVersion = response.model;

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
