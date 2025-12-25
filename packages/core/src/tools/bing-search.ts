/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { ToolErrorType } from './tool-error.js';
import { getErrorMessage } from '../utils/errors.js';
import type { Config } from '../config/config.js';
import { fetchWithTimeout } from '../utils/fetch.js';
import * as cheerio from 'cheerio';

const SEARCH_TIMEOUT_MS = 15000;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface BingSearchResult {
  title: string;
  link: string;
  snippet: string;
}

export interface BingSearchParams {
  query: string;
  limit?: number;
}

export interface BingSearchResultType extends ToolResult {
  results?: BingSearchResult[];
}

class BingSearchToolInvocation extends BaseToolInvocation<
  BingSearchParams,
  BingSearchResultType
> {
  constructor(
    config: Config,
    params: BingSearchParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  override getDescription(): string {
    const limit = this.params.limit ?? 5;
    return `在 Bing 上搜索: "${this.params.query}" (限制: ${limit} 个结果)`;
  }

  private extractBingResults(html: string): BingSearchResult[] {
    const results: BingSearchResult[] = [];

    try {
      const $ = cheerio.load(html);

      $('#b_results > li.b_algo').each((_, element) => {
        const titleElement = $(element).find('h2 a').first();
        const title = titleElement.text().trim();
        let link = titleElement.attr('href') || '';

        if (!title || !link) return;

        let snippet = '';
        const captionElement = $(element).find('.b_caption p').first();
        if (captionElement.length) {
          snippet = captionElement.text().trim();
        }

        if (!snippet) {
          const snippetElement = $(element).find('.b_snippet').first();
          if (snippetElement.length) {
            snippet = snippetElement.text().trim();
          }
        }

        if (link && !link.startsWith('http')) {
          if (link.startsWith('/')) {
            link = `https://www.bing.com${link}`;
          } else {
            link = `https://www.bing.com/${link}`;
          }
        }

        results.push({
          title,
          link,
          snippet: snippet.substring(0, 200),
        });
      });
    } catch (error) {
      console.error('解析 Bing 搜索结果时出错:', error);
    }

    return results;
  }

  async execute(_signal: AbortSignal): Promise<BingSearchResultType> {
    const query = this.params.query.trim();
    const limit = Math.min(this.params.limit ?? 5, 10);

    if (!query) {
      return {
        results: [],
        llmContent: '错误: 搜索查询不能为空',
        returnDisplay: '搜索失败',
        error: {
          type: ToolErrorType.WEB_SEARCH_FAILED,
          message: '搜索查询不能为空',
        },
      };
    }

    try {
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
      const response = await fetchWithTimeout(searchUrl, SEARCH_TIMEOUT_MS, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      });

      if (!response.ok) {
        return {
          results: [],
          llmContent: `错误: 请求失败，状态码 ${response.status}`,
          returnDisplay: '搜索失败',
          error: {
            type: ToolErrorType.WEB_SEARCH_FAILED,
            message: `请求失败: ${response.status}`,
          },
        };
      }

      const html = await response.text();
      const allResults = this.extractBingResults(html);
      const results = allResults.slice(0, limit);

      if (results.length === 0) {
        return {
          results: [],
          llmContent: `未找到搜索结果: "${query}"`,
          returnDisplay: '无搜索结果',
        };
      }

      const llmContent = results
        .map((r) => `标题: ${r.title}\n链接: ${r.link}\n描述: ${r.snippet}\n`)
        .join('\n');

      return {
        results,
        llmContent: `Bing 搜索结果 (${results.length} 个):\n\n${llmContent}`,
        returnDisplay: `找到 ${results.length} 个搜索结果`,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      return {
        results: [],
        llmContent: `错误: ${errorMessage}`,
        returnDisplay: '搜索失败',
        error: { type: ToolErrorType.WEB_SEARCH_FAILED, message: errorMessage },
      };
    }
  }
}

export class BingSearchTool extends BaseDeclarativeTool<
  BingSearchParams,
  BingSearchResultType
> {
  static readonly Name = 'bing_search';

  constructor(
    private readonly config: Config,
    messageBus?: MessageBus,
  ) {
    super(
      BingSearchTool.Name,
      'BingSearch',
      '在 Bing 上执行搜索并返回结果。此工具用于在互联网上查找信息，不需要 API Key。',
      Kind.Search,
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '要搜索的查询词',
          },
          limit: {
            type: 'number',
            description: '返回结果的最大数量 (1-10，默认 5)',
            minimum: 1,
            maximum: 10,
          },
        },
        required: ['query'],
      },
      true,
      false,
      messageBus,
    );
  }

  protected override validateToolParamValues(
    params: BingSearchParams,
  ): string | null {
    if (!params.query || params.query.trim() === '') {
      return "'query' 参数不能为空";
    }
    return null;
  }

  protected createInvocation(
    params: BingSearchParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<BingSearchParams, BingSearchResultType> {
    return new BingSearchToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
