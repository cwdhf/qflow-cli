/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BingSearchTool } from './bing-search.js';
import type { BingSearchParams } from './bing-search.js';
import type { Config } from '../config/config.js';
import { ToolErrorType } from './tool-error.js';

describe('BingSearchTool', () => {
  const abortSignal = new AbortController().signal;
  let mockConfig: Config;
  let tool: BingSearchTool;

  beforeEach(() => {
    mockConfig = {
      getProxy: () => undefined,
    } as unknown as Config;
    tool = new BingSearchTool(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('build', () => {
    it('should return an invocation for a valid query', () => {
      const params: BingSearchParams = { query: 'test query' };
      const invocation = tool.build(params);
      expect(invocation).toBeDefined();
      expect(invocation.params).toEqual(params);
    });

    it('should throw an error for an empty query', () => {
      const params: BingSearchParams = { query: '' };
      expect(() => tool.build(params)).toThrow("'query' 参数不能为空");
    });

    it('should throw an error for a query with only whitespace', () => {
      const params: BingSearchParams = { query: '   ' };
      expect(() => tool.build(params)).toThrow("'query' 参数不能为空");
    });

    it('should throw an error for invalid limit', () => {
      const params: BingSearchParams = { query: 'test', limit: 15 };
      expect(() => tool.build(params)).toThrow('params/limit must be <= 10');
    });
  });

  describe('getDescription', () => {
    it('should return a description of the search', () => {
      const params: BingSearchParams = { query: 'test query' };
      const invocation = tool.build(params);
      expect(invocation.getDescription()).toBe(
        '在 Bing 上搜索: "test query" (限制: 5 个结果)',
      );
    });

    it('should include custom limit in description', () => {
      const params: BingSearchParams = { query: 'test query', limit: 3 };
      const invocation = tool.build(params);
      expect(invocation.getDescription()).toBe(
        '在 Bing 上搜索: "test query" (限制: 3 个结果)',
      );
    });
  });

  describe('execute', () => {
    it('should return search results for a successful query', async () => {
      const params: BingSearchParams = { query: 'successful query' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <ul id="b_results">
                <li class="b_algo">
                  <h2><a href="https://example.com/test">Test Title</a></h2>
                  <div class="b_caption">
                    <p>Test description content</p>
                  </div>
                </li>
                <li class="b_algo">
                  <h2><a href="https://example.com/test2">Another Title</a></h2>
                  <div class="b_caption">
                    <p>Another description</p>
                  </div>
                </li>
              </ul>
            </body>
          </html>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('Bing 搜索结果');
      expect(result.llmContent).toContain('Test Title');
      expect(result.llmContent).toContain('https://example.com/test');
      expect(result.returnDisplay).toBe('找到 2 个搜索结果');
    });

    it('should handle no search results found', async () => {
      const params: BingSearchParams = { query: 'no results query' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve('<html><body><ul id="b_results"></ul></body></html>'),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toBe('未找到搜索结果: "no results query"');
      expect(result.returnDisplay).toBe('无搜索结果');
    });

    it('should return a WEB_SEARCH_FAILED error on failure', async () => {
      const params: BingSearchParams = { query: 'error query' };
      const testError = new Error('Network Failure');

      global.fetch = vi.fn().mockRejectedValue(testError);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.error?.type).toBe(ToolErrorType.WEB_SEARCH_FAILED);
      expect(result.llmContent).toContain('错误:');
      expect(result.llmContent).toContain('Network Failure');
      expect(result.returnDisplay).toBe('搜索失败');
    });

    it('should handle HTTP errors', async () => {
      const params: BingSearchParams = { query: 'http error' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.error?.type).toBe(ToolErrorType.WEB_SEARCH_FAILED);
      expect(result.llmContent).toContain('请求失败，状态码 500');
      expect(result.returnDisplay).toBe('搜索失败');
    });

    it('should correctly format results with titles and snippets', async () => {
      const params: BingSearchParams = { query: 'test query' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <ul id="b_results">
                <li class="b_algo">
                  <h2><a href="https://example.com/article1">Article 1 Title</a></h2>
                  <div class="b_caption">
                    <p>This is the description for article 1.</p>
                  </div>
                </li>
                <li class="b_algo">
                  <h2><a href="https://example.com/article2">Article 2 Title</a></h2>
                  <div class="b_caption">
                    <p>This is the description for article 2.</p>
                  </div>
                </li>
              </ul>
            </body>
          </html>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('Article 1 Title');
      expect(result.llmContent).toContain(
        'This is the description for article 1.',
      );
      expect(result.llmContent).toContain('https://example.com/article1');
      expect(result.returnDisplay).toBe('找到 2 个搜索结果');
    });

    it('should handle results without snippets', async () => {
      const params: BingSearchParams = { query: 'no snippet query' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <ul id="b_results">
                <li class="b_algo">
                  <h2><a href="https://example.com/no-snippet">Title Without Snippet</a></h2>
                </li>
              </ul>
            </body>
          </html>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('Title Without Snippet');
      expect(result.llmContent).toContain('https://example.com/no-snippet');
      expect(result.returnDisplay).toBe('找到 1 个搜索结果');
    });

    it('should limit results to specified count', async () => {
      const params: BingSearchParams = { query: 'limit test', limit: 2 };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <ul id="b_results">
                <li class="b_algo">
                  <h2><a href="https://example.com/1">Result 1</a></h2>
                </li>
                <li class="b_algo">
                  <h2><a href="https://example.com/2">Result 2</a></h2>
                </li>
                <li class="b_algo">
                  <h2><a href="https://example.com/3">Result 3</a></h2>
                </li>
              </ul>
            </body>
          </html>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.returnDisplay).toBe('找到 2 个搜索结果');
      expect(result.llmContent).toContain('Result 1');
      expect(result.llmContent).toContain('Result 2');
      expect(result.llmContent).not.toContain('Result 3');
    });

    it('should handle b_snippet fallback when b_caption not present', async () => {
      const params: BingSearchParams = { query: 'snippet fallback test' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <ul id="b_results">
                <li class="b_algo">
                  <h2><a href="https://example.com/fallback">Fallback Title</a></h2>
                  <div class="b_snippet">Snippet from b_snippet element</div>
                </li>
              </ul>
            </body>
          </html>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('Fallback Title');
      expect(result.llmContent).toContain('Snippet from b_snippet element');
    });

    it('should normalize relative URLs to absolute', async () => {
      const params: BingSearchParams = { query: 'relative url test' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <ul id="b_results">
                <li class="b_algo">
                  <h2><a href="/url?q=target">Relative URL Title</a></h2>
                  <div class="b_caption">
                    <p>Description for relative URL</p>
                  </div>
                </li>
              </ul>
            </body>
          </html>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('Relative URL Title');
      expect(result.llmContent).toContain('https://www.bing.com/url?q=target');
    });

    it('should truncate long snippets to 200 characters', async () => {
      const params: BingSearchParams = { query: 'long snippet test' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <ul id="b_results">
                <li class="b_algo">
                  <h2><a href="https://example.com/long">Long Snippet Title</a></h2>
                  <div class="b_caption">
                    <p>This is a very long snippet that exceeds two hundred characters and should be truncated to exactly two hundred characters to ensure consistent result formatting across different search queries and result types.</p>
                  </div>
                </li>
              </ul>
            </body>
          </html>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      const llmContentStr =
        typeof result.llmContent === 'string'
          ? result.llmContent
          : JSON.stringify(result.llmContent);
      const lines = llmContentStr.split('\n');
      const snippetLine = lines.find((line: string) =>
        line.startsWith('描述:'),
      );
      expect(snippetLine?.length).toBeLessThanOrEqual(204);
    });

    it('should trim whitespace from query', async () => {
      const params: BingSearchParams = { query: '  trimmed query  ' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <ul id="b_results">
                <li class="b_algo">
                  <h2><a href="https://example.com/trimmed">Trimmed Title</a></h2>
                </li>
              </ul>
            </body>
          </html>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.returnDisplay).toBe('找到 1 个搜索结果');
      expect(result.llmContent).toContain('Trimmed Title');
    });
  });
});
