/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { encode } from 'gpt-tokenizer';

export interface TokenCount {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export class TokenEstimator {
  private static instance: TokenEstimator;

  private constructor() {}

  static getInstance(): TokenEstimator {
    if (!TokenEstimator.instance) {
      TokenEstimator.instance = new TokenEstimator();
    }
    return TokenEstimator.instance;
  }

  estimatePromptTokens(content: string): number {
    try {
      const tokens = encode(content);
      return tokens.length;
    } catch (error) {
      console.error('Error estimating prompt tokens:', error);
      return 0;
    }
  }

  estimateCompletionTokens(content: string): number {
    try {
      const tokens = encode(content);
      return tokens.length;
    } catch (error) {
      console.error('Error estimating completion tokens:', error);
      return 0;
    }
  }

  estimateTokens(content: string): number {
    return this.estimatePromptTokens(content);
  }

  estimateTotalTokens(
    promptContent: string,
    completionContent: string,
  ): TokenCount {
    const promptTokens = this.estimatePromptTokens(promptContent);
    const completionTokens = this.estimateCompletionTokens(completionContent);
    const totalTokens = promptTokens + completionTokens;

    return {
      promptTokens,
      completionTokens,
      totalTokens,
    };
  }
}
