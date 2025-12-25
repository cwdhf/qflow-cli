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

const BAIDU_SEARCH_TIMEOUT_MS = 15000;
const MAX_RESULTS = 10;
const MAX_CONTENT_LENGTH = 1000000;

export interface BaiduSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface BaiduSearchToolParams {
  query: string;
}

export interface BaiduSearchToolResult extends ToolResult {
  results?: BaiduSearchResult[];
}

class BaiduSearchToolInvocation extends BaseToolInvocation<
  BaiduSearchToolParams,
  BaiduSearchToolResult
> {
  constructor(
    config: Config,
    params: BaiduSearchToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  override getDescription(): string {
    return `在百度上搜索: "${this.params.query}"`;
  }

  private parseBaiduResults(
    html: string,
    maxCount: number,
  ): BaiduSearchResult[] {
    const results: BaiduSearchResult[] = [];

    try {
      const $ = cheerio.load(html);

      const resultElements = $('.result');
      for (
        let i = 0;
        i < resultElements.length && results.length < maxCount;
        i++
      ) {
        const $elem = resultElements.eq(i);

        const $title = $elem.find('h3.t a, h3 a').first();
        const title = $title.text().trim();
        let url = $title.attr('href') || '';

        if (url.includes('baidu.com/link')) {
          const dataUrl = $elem.find('[data-url]').attr('data-url');
          if (dataUrl) {
            url = dataUrl;
          }
        }

        let description = $elem
          .find('.c-abstract, .c-span9, .content-right_8Zs40')
          .first()
          .text()
          .trim();

        if (!description) {
          description = $elem.find('.c-font-normal').text().trim();
        }

        description = description.replace(/\s+/g, ' ');

        let source = '';
        const $source = $elem.find('.c-color-gray, .c-showurl');
        if ($source.length > 0) {
          source = $source.text().trim();
        }

        if (title && url) {
          results.push({
            title,
            url,
            snippet: description || source || '暂无描述',
          });
        }
      }

      if (results.length === 0) {
        const divElements = $('#content_left > div');
        for (
          let i = 0;
          i < divElements.length && results.length < maxCount;
          i++
        ) {
          const $elem = divElements.eq(i);
          const $link = $elem.find('a').first();
          const title = $link.text().trim();
          const url = $link.attr('href') || '';
          const description = $elem.find('div').last().text().trim();

          if (title && url && !url.includes('javascript:')) {
            results.push({
              title,
              url,
              snippet: description || '暂无描述',
            });
          }
        }
      }
    } catch (error) {
      console.error('解析百度搜索结果时出错:', error);
    }

    return results;
  }

  async execute(_signal: AbortSignal): Promise<BaiduSearchToolResult> {
    const encodedQuery = encodeURIComponent(this.params.query);
    const baiduUrl = `https://www.baidu.com/s?wd=${encodedQuery}&rn=${MAX_RESULTS}`;

    try {
      const response = await fetchWithTimeout(
        baiduUrl,
        BAIDU_SEARCH_TIMEOUT_MS,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            Connection: 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const truncatedHtml = html.substring(0, MAX_CONTENT_LENGTH);

      const results = this.parseBaiduResults(truncatedHtml, MAX_RESULTS);

      if (results.length === 0) {
        return {
          llmContent: `未找到搜索结果: "${this.params.query}"`,
          returnDisplay: '无搜索结果',
        };
      }

      let formattedResults = `百度搜索结果: "${this.params.query}"\n\n`;

      results.forEach((result, index) => {
        formattedResults += `${index + 1}. ${result.title}\n`;
        formattedResults += `   ${result.snippet}\n`;
        formattedResults += `   ${result.url}\n\n`;
      });

      return {
        llmContent: formattedResults,
        returnDisplay: `找到 ${results.length} 个搜索结果`,
        results,
      };
    } catch (error: unknown) {
      const errorMessage = `百度搜索失败: ${getErrorMessage(error)}`;
      console.error(errorMessage, error);
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
}

export class BaiduSearchTool extends BaseDeclarativeTool<
  BaiduSearchToolParams,
  BaiduSearchToolResult
> {
  static readonly Name = 'baidu_search';

  constructor(
    private readonly config: Config,
    messageBus?: MessageBus,
  ) {
    super(
      BaiduSearchTool.Name,
      'BaiduSearch',
      '在百度上执行搜索并返回结果。此工具用于在互联网上查找信息，不需要 API Key。',
      Kind.Search,
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '要搜索的查询词',
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
    params: BaiduSearchToolParams,
  ): string | null {
    if (!params.query || params.query.trim() === '') {
      return "'query' 参数不能为空";
    }
    return null;
  }

  protected createInvocation(
    params: BaiduSearchToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<BaiduSearchToolParams, BaiduSearchToolResult> {
    return new BaiduSearchToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
