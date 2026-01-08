/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { debugLogger } from './debugLogger.js';

export interface StreamChunk {
  index: number;
  timestamp: number;
  data: unknown;
}

export interface StreamSummary {
  startTime: number;
  endTime: number;
  duration: number;
  totalChunks: number;
  chunks: StreamChunk[];
  hasToolCalls: boolean;
  hasContent: boolean;
  model?: string;
  finishReason?: string;
}

export class StreamLogger {
  private static instances: Map<string, StreamLogger> = new Map();
  private chunks: StreamChunk[] = [];
  private startTime: number = 0;
  private endTime: number = 0;
  private hasToolCalls: boolean = false;
  private hasContent: boolean = false;
  private model?: string;
  private finishReason?: string;
  private enabled: boolean;

  constructor(private streamId: string) {
    this.enabled = this.isStreamLoggingEnabled();
    this.startTime = Date.now();
    StreamLogger.instances.set(streamId, this);
  }

  private isStreamLoggingEnabled(): boolean {
    const env = process.env['GEMINI_STREAM_LOGGING'];
    if (!env) return false;
    const lowerEnv = env.trim().toLowerCase();
    return lowerEnv !== '0' && lowerEnv !== 'false';
  }

  static getInstance(streamId: string): StreamLogger | undefined {
    return StreamLogger.instances.get(streamId);
  }

  static removeInstance(streamId: string): void {
    StreamLogger.instances.delete(streamId);
  }

  addChunk(chunk: unknown, index: number): void {
    if (!this.enabled) return;

    const chunkData: StreamChunk = {
      index,
      timestamp: Date.now(),
      data: chunk,
    };

    this.chunks.push(chunkData);

    const chunkObj = chunk as {
      model?: string;
      choices?: Array<{
        finish_reason?: string;
        delta?: { content?: string; tool_calls?: unknown[] };
      }>;
    };
    if (chunkObj['model']) {
      this.model = chunkObj['model'];
    }

    if (chunkObj['choices'] && Array.isArray(chunkObj['choices'])) {
      const choice = chunkObj['choices'][0];
      if (choice && choice['finish_reason']) {
        this.finishReason = choice['finish_reason'];
      }
      if (choice && choice['delta']) {
        const delta = choice['delta'];
        if (delta['content'] && delta['content'] !== '') {
          this.hasContent = true;
        }
        if (delta['tool_calls'] && Array.isArray(delta['tool_calls'])) {
          this.hasToolCalls = true;
        }
      }
    }
  }

  finish(): StreamSummary | undefined {
    if (!this.enabled) return undefined;

    this.endTime = Date.now();
    const summary: StreamSummary = {
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.endTime - this.startTime,
      totalChunks: this.chunks.length,
      chunks: this.chunks,
      hasToolCalls: this.hasToolCalls,
      hasContent: this.hasContent,
      model: this.model,
      finishReason: this.finishReason,
    };

    this.logSummary(summary);
    return summary;
  }

  private logSummary(summary: StreamSummary): void {
    debugLogger.log('\n' + '='.repeat(80));
    debugLogger.log('STREAM LOG SUMMARY');
    debugLogger.log('='.repeat(80));
    debugLogger.log(`Stream ID: ${this.streamId}`);
    debugLogger.log(`Start Time: ${new Date(summary.startTime).toISOString()}`);
    debugLogger.log(`End Time: ${new Date(summary.endTime).toISOString()}`);
    debugLogger.log(`Duration: ${summary.duration}ms`);
    debugLogger.log(`Total Chunks: ${summary.totalChunks}`);
    debugLogger.log(`Model: ${summary.model || 'unknown'}`);
    debugLogger.log(`Finish Reason: ${summary.finishReason || 'unknown'}`);
    debugLogger.log(`Has Content: ${summary.hasContent}`);
    debugLogger.log(`Has Tool Calls: ${summary.hasToolCalls}`);
    debugLogger.log('='.repeat(80));

    if (summary.chunks.length > 0) {
      debugLogger.log('\nALL CHUNKS:');
      debugLogger.log('='.repeat(80));

      for (const chunk of summary.chunks) {
        debugLogger.log(
          `\nChunk #${chunk.index} [${new Date(chunk.timestamp).toISOString()}]:`,
        );
        debugLogger.log(JSON.stringify(chunk.data, null, 2));
      }

      debugLogger.log('\n' + '='.repeat(80));
    }

    debugLogger.log('END STREAM LOG SUMMARY');
    debugLogger.log('='.repeat(80) + '\n');
  }

  getChunks(): StreamChunk[] {
    return this.chunks;
  }

  getSummary(): Partial<StreamSummary> {
    return {
      startTime: this.startTime,
      endTime: this.endTime || Date.now(),
      duration: (this.endTime || Date.now()) - this.startTime,
      totalChunks: this.chunks.length,
      hasToolCalls: this.hasToolCalls,
      hasContent: this.hasContent,
      model: this.model,
      finishReason: this.finishReason,
    };
  }
}
