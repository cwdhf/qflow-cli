/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * OpenAI函数定义
 */
export interface OpenAIFunction {
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
export interface OpenAITool {
  type: 'function';
  function: OpenAIFunction;
}

/**
 * OpenAI工具调用
 */
export interface OpenAIToolCall {
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
export interface OpenAIContentItem {
  type: 'text';
  text: string;
}

/**
 * OpenAI消息（支持工具调用）
 */
export interface OpenAIMessageWithTools {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | OpenAIContentItem[] | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

/**
 * OpenAI聊天完成响应（支持工具调用）
 */
export interface OpenAICompletionResponse {
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
export interface OpenAIEmbeddingRequest {
  model: string;
  input: string | string[];
}

/**
 * OpenAI Embedding响应
 */
export interface OpenAIEmbeddingResponse {
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
export interface OpenAIStreamToolCallDelta {
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
export interface OpenAIStreamChunk {
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
