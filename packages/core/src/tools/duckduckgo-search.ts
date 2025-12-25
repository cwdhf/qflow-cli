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
const PAGE_FETCH_TIMEOUT_MS = 15000;
const MAX_PAGE_CONTENT_LENGTH = 1500000;

export interface DuckDuckGoSearchResult {
  url: string;
  title?: string;
  snippet?: string;
}

export interface DuckDuckGoSearchParams {
  query: string;
  limit?: number;
}

export interface DuckDuckGoSearchResultType extends ToolResult {
  results?: DuckDuckGoSearchResult[];
}

export interface FetchPageParams {
  url: string;
}

export interface FetchPageResultType extends ToolResult {
  content?: string;
  title?: string;
  url?: string;
}

function normalizeDuckLink(rawHref: string): string {
  if (!rawHref) return '';

  try {
    const href = rawHref.startsWith('//') ? `https:${rawHref}` : rawHref;
    const u = new URL(href);

    // 处理 DuckDuckGo 跳转链接
    if (u.hostname.includes('duckduckgo.com')) {
      // 提取 uddg 参数
      const uddg = u.searchParams.get('uddg');
      if (uddg) return decodeURIComponent(uddg);

      // 处理新的跳转格式
      if (u.pathname.startsWith('/y.js')) {
        const rl = u.searchParams.get('rl');
        if (rl) return decodeURIComponent(rl);
      }
    }

    return href;
  } catch (e) {
    console.warn('解析链接失败:', rawHref, e);
    return rawHref;
  }
}

class DuckDuckGoSearchToolInvocation extends BaseToolInvocation<
  DuckDuckGoSearchParams,
  DuckDuckGoSearchResultType
> {
  constructor(
    config: Config,
    params: DuckDuckGoSearchParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  override getDescription(): string {
    const limit = this.params.limit ?? 10;
    return `在 DuckDuckGo 上搜索: "${this.params.query}" (限制: ${limit} 个结果)`;
  }

  private parseDuckDuckGoResults(
    html: string,
    maxCount: number,
  ): DuckDuckGoSearchResult[] {
    const results: DuckDuckGoSearchResult[] = [];

    try {
      const $ = cheerio.load(html);

      const anchors = $('#links .result__a, .result a');
      anchors.each((_, element) => {
        if (results.length >= maxCount) return;

        const $a = $(element);
        const href = $a.attr('href') || '';
        const title = $a.text().trim();

        if (href && title) {
          const normalizedUrl = normalizeDuckLink(href);
          const $result = $a.closest('.result, tr.result');
          const snippet = $result
            .find('.result__snippet, .result__description')
            .text()
            .trim();

          results.push({
            url: normalizedUrl,
            title,
            snippet: snippet || undefined,
          });
        }
      });

      if (results.length === 0) {
        const resultLinks = $('.result__a');
        resultLinks.each((_, element) => {
          if (results.length >= maxCount) return;

          const $a = $(element);
          const href = $a.attr('href') || '';
          const title = $a.text().trim();

          if (href && title) {
            const normalizedUrl = normalizeDuckLink(href);
            results.push({
              url: normalizedUrl,
              title,
            });
          }
        });
      }
    } catch (error) {
      console.error('解析 DuckDuckGo 搜索结果时出错:', error);
    }

    return results;
  }

  async execute(_signal: AbortSignal): Promise<DuckDuckGoSearchResultType> {
    const limit = this.params.limit ?? 5;
    const encodedQuery = encodeURIComponent(this.params.query);
    const searchUrls = [
      `https://duckduckgo.com/html/?q=${encodedQuery}&kl=us-en`,
      `https://html.duckduckgo.com/html/?q=${encodedQuery}&kl=us-en`,
    ];

    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      for (const searchUrl of searchUrls) {
        try {
          const response = await fetchWithTimeout(
            searchUrl,
            SEARCH_TIMEOUT_MS,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                Connection: 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
              },
              redirect: 'follow',
              credentials: 'omit',
            },
          );

          if (!response.ok) {
            throw new Error(
              `请求失败: ${response.status} ${response.statusText}`,
            );
          }

          const html = await response.text();
          const results = this.parseDuckDuckGoResults(html, limit);

          if (results.length === 0) {
            continue; // 尝试下一个 URL
          }

          let formattedResults = `DuckDuckGo 搜索结果: "${this.params.query}"\n\n`;

          results.forEach((result, index) => {
            formattedResults += `${index + 1}. ${result.title}\n`;
            formattedResults += `   URL: ${result.url}\n`;
            if (result.snippet) {
              formattedResults += `   ${result.snippet}\n`;
            }
            formattedResults += '\n';
          });

          return {
            llmContent: formattedResults,
            returnDisplay: `找到 ${results.length} 个搜索结果`,
            results,
          };
        } catch (error: unknown) {
          lastError = error as Error;
          console.warn(
            `尝试 ${attempt + 1}/${maxRetries} 失败 (URL: ${searchUrl}): ${getErrorMessage(error)}`,
          );
        }
      }
      // 等待一段时间后重试
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }

    // 所有重试失败
    const errorMessage = `DuckDuckGo 搜索失败 (尝试 ${maxRetries} 次): ${getErrorMessage(lastError)}`;
    console.error(errorMessage, lastError);
    return {
      llmContent: `错误: ${errorMessage}`,
      returnDisplay: '搜索失败',
      error: {
        message: errorMessage,
        type: ToolErrorType.WEB_SEARCH_FAILED,
      },
    };
  }
}

class FetchPageToolInvocation extends BaseToolInvocation<
  FetchPageParams,
  FetchPageResultType
> {
  constructor(
    config: Config,
    params: FetchPageParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  override getDescription(): string {
    return `获取页面内容: ${this.params.url}`;
  }

  private cleanContent(html: string): string {
    try {
      const $ = cheerio.load(html);

      $('script').remove();
      $('style').remove();
      $('nav').remove();
      $('header').remove();
      $('footer').remove();
      $('aside').remove();
      $('.ad').remove();
      $('.advertisement').remove();
      $('.social-share').remove();
      $('[role="banner"]').remove();
      $('[role="navigation"]').remove();
      $('[role="complementary"]').remove();

      const mainContent = $('main, article, .content, #content, .post, .entry');
      if (mainContent.length > 0) {
        return mainContent.text().trim();
      }

      const paragraphs = $('p');
      if (paragraphs.length > 0) {
        const textParts: string[] = [];
        paragraphs.each((_, p) => {
          const text = $(p).text().trim();
          if (text.length > 20) {
            textParts.push(text);
          }
        });
        return textParts.join('\n\n');
      }

      return $('body').text().trim();
    } catch {
      return html;
    }
  }

  async execute(_signal: AbortSignal): Promise<FetchPageResultType> {
    const maxRetries = 2;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(
          this.params.url,
          PAGE_FETCH_TIMEOUT_MS,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              Connection: 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'cross-site',
              'Cache-Control': 'max-age=0',
            },
            redirect: 'follow',
            credentials: 'omit',
          },
        );

        if (!response.ok) {
          throw new Error(
            `请求失败: ${response.status} ${response.statusText}`,
          );
        }

        const html = await response.text();
        const truncatedHtml = html.substring(0, MAX_PAGE_CONTENT_LENGTH);
        const content = this.cleanContent(truncatedHtml);

        const $ = cheerio.load(html);
        const title = $('title').text().trim() || $('h1').first().text().trim();

        return {
          llmContent: `页面内容 (${this.params.url}):\n\n${content}`,
          returnDisplay: '页面获取成功',
          content,
          title: title || undefined,
          url: this.params.url,
        };
      } catch (error: unknown) {
        lastError = error as Error;
        console.warn(
          `获取页面尝试 ${attempt + 1}/${maxRetries} 失败: ${getErrorMessage(error)}`,
        );
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1)),
          );
        }
      }
    }

    const errorMessage = `获取页面失败 (尝试 ${maxRetries} 次): ${getErrorMessage(lastError)}`;
    console.error(errorMessage, lastError);
    return {
      llmContent: `错误: ${errorMessage}`,
      returnDisplay: '获取失败',
      error: {
        message: errorMessage,
        type: ToolErrorType.WEB_SEARCH_FAILED,
      },
    };
  }
}

export class DuckDuckGoSearchTool extends BaseDeclarativeTool<
  DuckDuckGoSearchParams,
  DuckDuckGoSearchResultType
> {
  static readonly Name = 'duckduckgo_search';

  constructor(
    private readonly config: Config,
    messageBus?: MessageBus,
  ) {
    super(
      DuckDuckGoSearchTool.Name,
      'DuckDuckGoSearch',
      '在 DuckDuckGo 上执行搜索并返回结果。此工具用于在互联网上查找信息，不需要 API Key。',
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
    params: DuckDuckGoSearchParams,
  ): string | null {
    if (!params.query || params.query.trim() === '') {
      return "'query' 参数不能为空";
    }
    if (params.limit !== undefined && (params.limit < 1 || params.limit > 10)) {
      return "'limit' 参数必须在 1 到 10 之间";
    }
    return null;
  }

  protected createInvocation(
    params: DuckDuckGoSearchParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<DuckDuckGoSearchParams, DuckDuckGoSearchResultType> {
    return new DuckDuckGoSearchToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}

export class FetchPageTool extends BaseDeclarativeTool<
  FetchPageParams,
  FetchPageResultType
> {
  static readonly Name = 'fetch_page';

  constructor(
    private readonly config: Config,
    messageBus?: MessageBus,
  ) {
    super(
      FetchPageTool.Name,
      'FetchPage',
      '获取指定 URL 的页面内容并提取可读文本。此工具用于获取网页的正文内容。',
      Kind.Other,
      {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: '要获取的页面 URL',
            format: 'uri',
          },
        },
        required: ['url'],
      },
      true,
      false,
      messageBus,
    );
  }

  protected override validateToolParamValues(
    params: FetchPageParams,
  ): string | null {
    if (!params.url || params.url.trim() === '') {
      return "'url' 参数不能为空";
    }
    try {
      new URL(params.url);
      return null;
    } catch {
      return "'url' 参数必须是有效的 URL 格式";
    }
  }

  protected createInvocation(
    params: FetchPageParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<FetchPageParams, FetchPageResultType> {
    return new FetchPageToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
