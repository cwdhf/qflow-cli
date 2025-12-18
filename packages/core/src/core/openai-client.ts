/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { OpenAICompatibleConfig } from './openAICompatibleContentGenerator.js';
import type { OpenAIStreamChunk } from './openai-types.js';

/**
 * OpenAI API客户端
 * 处理与OpenAI兼容API的通信
 */
export class OpenAIClient {
  readonly endpoint: string;
  private apiKey: string;
  private organization?: string;
  private project?: string;

  constructor(config: OpenAICompatibleConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.organization = config.organization;
    this.project = config.project;
  }

  /**
   * 发送HTTP请求
   */
  async makeRequest<T>(url: string, body: unknown): Promise<T> {
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
  async makeStreamRequestExperimental(
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
}
