/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaiduSearchTool } from './baidu-search.js';
import type { BaiduSearchToolParams } from './baidu-search.js';
import type { Config } from '../config/config.js';
import { ToolErrorType } from './tool-error.js';

describe('BaiduSearchTool', () => {
  const abortSignal = new AbortController().signal;
  let mockConfig: Config;
  let tool: BaiduSearchTool;

  beforeEach(() => {
    mockConfig = {
      getProxy: () => undefined,
    } as unknown as Config;
    tool = new BaiduSearchTool(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('build', () => {
    it('should return an invocation for a valid query', () => {
      const params: BaiduSearchToolParams = { query: 'test query' };
      const invocation = tool.build(params);
      expect(invocation).toBeDefined();
      expect(invocation.params).toEqual(params);
    });

    it('should throw an error for an empty query', () => {
      const params: BaiduSearchToolParams = { query: '' };
      expect(() => tool.build(params)).toThrow("'query' 参数不能为空");
    });

    it('should throw an error for a query with only whitespace', () => {
      const params: BaiduSearchToolParams = { query: '   ' };
      expect(() => tool.build(params)).toThrow("'query' 参数不能为空");
    });
  });

  describe('getDescription', () => {
    it('should return a description of the search', () => {
      const params: BaiduSearchToolParams = { query: 'test query' };
      const invocation = tool.build(params);
      expect(invocation.getDescription()).toBe('在百度上搜索: "test query"');
    });
  });

  describe('execute', () => {
    it('should return search results for a successful query', async () => {
      const params: BaiduSearchToolParams = { query: 'successful query' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <div id="content_left">
            <div class="result" data-click="{...}">
              <h3 class="t"><a href="https://example.com/test">Test Title</a></h3>
              <div class="c-abstract">Test description content</div>
            </div>
            <div class="result" data-click="{...}">
              <h3 class="t"><a href="https://example.com/test2">Another Title</a></h3>
              <div class="c-abstract">Another description</div>
            </div>
          </div>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('百度搜索结果');
      expect(result.llmContent).toContain('Test Title');
      expect(result.llmContent).toContain('Test description content');
      expect(result.returnDisplay).toBe('找到 2 个搜索结果');
    });

    it('should handle no search results found', async () => {
      const params: BaiduSearchToolParams = { query: 'no results query' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<div id="content_left"></div>'),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toBe('未找到搜索结果: "no results query"');
      expect(result.returnDisplay).toBe('无搜索结果');
    });

    it('should return a WEB_SEARCH_FAILED error on failure', async () => {
      const params: BaiduSearchToolParams = { query: 'error query' };
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
      const params: BaiduSearchToolParams = { query: 'http error' };

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

    it('should correctly format results with titles and descriptions', async () => {
      const params: BaiduSearchToolParams = { query: 'test query' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <div id="content_left">
            <div class="result" data-click="{...}">
              <h3 class="t"><a href="https://example.com/article1">Article 1 Title</a></h3>
              <div class="c-abstract">This is the description for article 1.</div>
            </div>
            <div class="result" data-click="{...}">
              <h3 class="t"><a href="https://example.com/article2">Article 2 Title</a></h3>
              <div class="c-abstract">This is the description for article 2.</div>
            </div>
            <div class="result" data-click="{...}">
              <h3 class="t"><a href="https://example.com/article3">Article 3 Title</a></h3>
              <div class="c-abstract">This is the description for article 3.</div>
            </div>
          </div>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      const expectedLlmContent = `百度搜索结果: "test query"\n\n1. Article 1 Title\n   This is the description for article 1.\n   https://example.com/article1\n\n2. Article 2 Title\n   This is the description for article 2.\n   https://example.com/article2\n\n3. Article 3 Title\n   This is the description for article 3.\n   https://example.com/article3\n\n`;

      expect(result.llmContent).toBe(expectedLlmContent);
      expect(result.returnDisplay).toBe('找到 3 个搜索结果');
    });

    it('should handle results without descriptions', async () => {
      const params: BaiduSearchToolParams = { query: 'no description query' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <div id="content_left">
            <div class="result" data-click="{...}">
              <h3 class="t"><a href="https://example.com/no-desc">Title Without Description</a></h3>
            </div>
          </div>
        `),
      } as Response);

      const invocation = tool.build(params);
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('Title Without Description');
      expect(result.llmContent).toContain('https://example.com/no-desc');
      expect(result.returnDisplay).toBe('找到 1 个搜索结果');
    });

    it('should extract real URL from data-url attribute for baidu redirect links', async () => {
      const params: BaiduSearchToolParams = { query: 'redirect test' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(`
          <div id="content_left">
            <div class="result" data-click="{...}">
              <h3 class="t"><a href="http://www.baidu.com/link?url=abc123">Redirect Title</a></h3>
              <div class="c-abstract" data-url="https://www.example.com/real-page">Real URL description</div>
            </div>
          </div>
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
