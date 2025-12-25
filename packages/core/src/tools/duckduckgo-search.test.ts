/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DuckDuckGoSearchTool, FetchPageTool } from './duckduckgo-search.js';
import type {
  DuckDuckGoSearchParams,
  FetchPageParams,
} from './duckduckgo-search.js';
import type { Config } from '../config/config.js';
import { ToolErrorType } from './tool-error.js';

describe('DuckDuckGoSearchTool', () => {
  const abortSignal = new AbortController().signal;
  let mockConfig: Config;
  let tool: DuckDuckGoSearchTool;

  beforeEach(() => {
    mockConfig = {
      getProxy: () => undefined,
    } as unknown as Config;
    tool = new DuckDuckGoSearchTool(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('build', () => {
    it('should return an invocation for a valid query', () => {
      const params: DuckDuckGoSearchParams = { query: 'test query' };
      const invocation = tool.build(params);
      expect(invocation).toBeDefined();
      expect(invocation.params).toEqual(params);
    });

    it('should throw an error for an empty query', () => {
      const params: DuckDuckGoSearchParams = { query: '' };
      expect(() => tool.build(params)).toThrow("'query' 参数不能为空");
    });

    it('should throw an error for a query with only whitespace', () => {
      const params: DuckDuckGoSearchParams = { query: '   ' };
      expect(() => tool.build(params)).toThrow("'query' 参数不能为空");
    });

    it('should throw an error for invalid limit', () => {
      const params: DuckDuckGoSearchParams = { query: 'test', limit: 15 };
      expect(() => tool.build(params)).toThrow('params/limit must be <= 10');
    });
  });

  describe('getDescription', () => {
    it('should return a description of the search', () => {
      const params: DuckDuckGoSearchParams = { query: 'test query' };
      const invocation = tool.build(params);
      expect(invocation.getDescription()).toBe(
        '在 DuckDuckGo 上搜索: "test query" (限制: 5 个结果)',
      );
    });

    it('should include custom limit in description', () => {
      const params: DuckDuckGoSearchParams = { query: 'test query', limit: 3 };
      const invocation = tool.build(params);
      expect(invocation.getDescription()).toBe(
        '在 DuckDuckGo 上搜索: "test query" (限制: 3 个结果)',
      );
    });
  });

  describe('execute', () => {
    it('should return search results for a successful query', async () => {
      const params: DuckDuckGoSearchParams = { query: 'successful query' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <div id="links">
                <div class="result">
                  <a class="result__a" href="https://example.com/test">Test Title</a>
                  <div class="result__snippet">Test description content</div>
                </div>
                <div class="result">
                  <a class="result__a" href="https://example.com/test2">Another Title</a>
                  <div class="result__snippet">Another description</div>
                </div>
              </div>
            </body>
          </html>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('DuckDuckGo 搜索结果');
      expect(result.llmContent).toContain('Test Title');
      expect(result.llmContent).toContain('https://example.com/test');
      expect(result.returnDisplay).toBe('找到 2 个搜索结果');
    });

    it('should handle no search results found', async () => {
      const params: DuckDuckGoSearchParams = { query: 'no results query' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve('<html><body><div id="links"></div></body></html>'),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toBe('未找到搜索结果: "no results query"');
      expect(result.returnDisplay).toBe('无搜索结果');
    });

    it('should return a WEB_SEARCH_FAILED error on failure', async () => {
      const params: DuckDuckGoSearchParams = { query: 'error query' };
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
      const params: DuckDuckGoSearchParams = { query: 'http error' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.error?.type).toBe(ToolErrorType.WEB_SEARCH_FAILED);
      expect(result.llmContent).toContain('请求失败: 500');
      expect(result.returnDisplay).toBe('搜索失败');
    });

    it('should correctly format results with titles and snippets', async () => {
      const params: DuckDuckGoSearchParams = { query: 'test query' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <div id="links">
                <div class="result">
                  <a class="result__a" href="https://example.com/article1">Article 1 Title</a>
                  <div class="result__snippet">This is the description for article 1.</div>
                </div>
                <div class="result">
                  <a class="result__a" href="https://example.com/article2">Article 2 Title</a>
                  <div class="result__snippet">This is the description for article 2.</div>
                </div>
              </div>
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
      const params: DuckDuckGoSearchParams = { query: 'no snippet query' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <div id="links">
                <div class="result">
                  <a class="result__a" href="https://example.com/no-snippet">Title Without Snippet</a>
                </div>
              </div>
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
      const params: DuckDuckGoSearchParams = { query: 'limit test', limit: 2 };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <div id="links">
                <div class="result">
                  <a class="result__a" href="https://example.com/1">Result 1</a>
                </div>
                <div class="result">
                  <a class="result__a" href="https://example.com/2">Result 2</a>
                </div>
                <div class="result">
                  <a class="result__a" href="https://example.com/3">Result 3</a>
                </div>
              </div>
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

    it('should decode duckduckgo redirect links', async () => {
      const params: DuckDuckGoSearchParams = { query: 'redirect test' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
            <body>
              <div id="links">
                <div class="result">
                  <a class="result__a" href="//duckduckgo.com/l/?uddg=https://www.example.com/real-page">Redirect Title</a>
                  <div class="result__snippet">Real URL description</div>
                </div>
              </div>
            </body>
          </html>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('Redirect Title');
      expect(result.llmContent).toContain('https://www.example.com/real-page');
      expect(result.returnDisplay).toBe('找到 1 个搜索结果');
    });
  });
});

describe('FetchPageTool', () => {
  const abortSignal = new AbortController().signal;
  let mockConfig: Config;
  let tool: FetchPageTool;

  beforeEach(() => {
    mockConfig = {
      getProxy: () => undefined,
    } as unknown as Config;
    tool = new FetchPageTool(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('build', () => {
    it('should return an invocation for a valid URL', () => {
      const params: FetchPageParams = { url: 'https://example.com/page' };
      const invocation = tool.build(params);
      expect(invocation).toBeDefined();
      expect(invocation.params).toEqual(params);
    });

    it('should throw an error for an empty URL', () => {
      const params: FetchPageParams = { url: '' };
      expect(() => tool.build(params)).toThrow(
        'params/url must match format "uri"',
      );
    });

    it('should throw an error for an invalid URL format', () => {
      const params: FetchPageParams = { url: 'not-a-valid-url' };
      expect(() => tool.build(params)).toThrow(
        'params/url must match format "uri"',
      );
    });
  });

  describe('getDescription', () => {
    it('should return a description of the page fetch', () => {
      const params: FetchPageParams = { url: 'https://example.com/page' };
      const invocation = tool.build(params);
      expect(invocation.getDescription()).toBe(
        '获取页面内容: https://example.com/page',
      );
    });
  });

  describe('execute', () => {
    it('should return page content for a successful fetch', async () => {
      const params: FetchPageParams = { url: 'https://example.com/page' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Example Page Title</title>
          </head>
          <body>
            <header>Header content</header>
            <main>
              <h1>Main Heading</h1>
              <p>This is the main content of the page.</p>
            </main>
            <footer>Footer content</footer>
          </body>
          </html>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.returnDisplay).toBe('页面获取成功');
      expect(result.title).toBe('Example Page Title');
      expect(result.url).toBe('https://example.com/page');
      expect(result.content).toContain('Main Heading');
      expect(result.content).toContain('This is the main content');
    });

    it('should handle fetch failure', async () => {
      const params: FetchPageParams = { url: 'https://example.com/page' };
      const testError = new Error('Network Failure');

      global.fetch = vi.fn().mockRejectedValue(testError);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.error?.type).toBe(ToolErrorType.WEB_SEARCH_FAILED);
      expect(result.llmContent).toContain('错误:');
      expect(result.llmContent).toContain('Network Failure');
      expect(result.returnDisplay).toBe('获取失败');
    });

    it('should handle HTTP errors', async () => {
      const params: FetchPageParams = { url: 'https://example.com/page' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.error?.type).toBe(ToolErrorType.WEB_SEARCH_FAILED);
      expect(result.llmContent).toContain('请求失败: 404');
      expect(result.returnDisplay).toBe('获取失败');
    });

    it('should remove scripts and styles from content', async () => {
      const params: FetchPageParams = { url: 'https://example.com/page' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
          <head>
            <title>Test Page</title>
            <script>alert('hello');</script>
            <style>body { color: red; }</style>
          </head>
          <body>
            <p>This is the actual content that should be extracted.</p>
          </body>
          </html>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.content).not.toContain('alert');
      expect(result.content).not.toContain('color: red');
      expect(result.content).toContain(
        'This is the actual content that should be extracted',
      );
    });

    it('should fallback to h1 if title not found', async () => {
      const params: FetchPageParams = { url: 'https://example.com/page' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <html>
          <head></head>
          <body>
            <h1>Fallback Heading</h1>
            <p>Content without title tag.</p>
          </body>
          </html>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.title).toBe('Fallback Heading');
    });
  });
});
