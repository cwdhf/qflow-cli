/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const PREVIEW_GEMINI_MODEL = 'gemini-3-pro-preview';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';

export const VALID_GEMINI_MODELS = new Set([
  PREVIEW_GEMINI_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
]);

export const DEFAULT_GEMINI_MODEL_AUTO = 'auto';

// Model aliases for user convenience.
export const GEMINI_MODEL_ALIAS_PRO = 'pro';
export const GEMINI_MODEL_ALIAS_FLASH = 'flash';
export const GEMINI_MODEL_ALIAS_FLASH_LITE = 'flash-lite';

export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

// OpenAI model constants
export const DEFAULT_OPENAI_MODEL = 'doubao-seed-1-8-251215"';
export const DEFAULT_OPENAI_EMBEDDING_MODEL = 'doubao-embedding-vision-250615';

// Common OpenAI models
export const DEEEPSEEK_V32 = 'deepseek-v3-2-251201';
export const DOUBAO_SEED_18 = 'doubao-seed-1-8-251215"';
export const KIMI_K2 = 'kimi-k2-thinking-251104';
// OpenAI model aliases for user convenience
export const OPENAI_MODEL_ALIAS_STANDARD = 'standard';
export const OPENAI_MODEL_ALIAS_TURBO = 'turbo';
export const OPENAI_MODEL_ALIAS_PRO = 'pro';
export const OPENAI_MODEL_ALIAS_MULTIMODAL = 'multimodal';

// Valid OpenAI models
export const VALID_OPENAI_MODELS = new Set([
  DOUBAO_SEED_18,
  DEEEPSEEK_V32,
  KIMI_K2,
]);

// Cap the thinking at 8192 to prevent run-away thinking loops.
export const DEFAULT_THINKING_MODE = 8192;

/**
 * Resolves the requested model alias (e.g., 'auto', 'pro', 'flash', 'flash-lite')
 * to a concrete model name, considering preview features.
 *
 * @param requestedModel The model alias or concrete model name requested by the user.
 * @param previewFeaturesEnabled A boolean indicating if preview features are enabled.
 * @returns The resolved concrete model name.
 */
export function resolveModel(
  requestedModel: string,
  previewFeaturesEnabled: boolean | undefined,
): string {
  switch (requestedModel) {
    case DEFAULT_GEMINI_MODEL_AUTO:
    case GEMINI_MODEL_ALIAS_PRO: {
      return previewFeaturesEnabled
        ? PREVIEW_GEMINI_MODEL
        : DEFAULT_GEMINI_MODEL;
    }
    case GEMINI_MODEL_ALIAS_FLASH: {
      return DEFAULT_GEMINI_FLASH_MODEL;
    }
    case GEMINI_MODEL_ALIAS_FLASH_LITE: {
      return DEFAULT_GEMINI_FLASH_LITE_MODEL;
    }
    default: {
      return requestedModel;
    }
  }
}

/**
 * Determines the effective model to use, applying fallback logic if necessary.
 *
 * When fallback mode is active, this function enforces the use of the standard
 * fallback model. However, it makes an exception for "lite" models (any model
 * with "lite" in its name), allowing them to be used to preserve cost savings.
 * This ensures that "pro" models are always downgraded, while "lite" model
 * requests are honored.
 *
 * @param isInFallbackMode Whether the application is in fallback mode.
 * @param requestedModel The model that was originally requested.
 * @param previewFeaturesEnabled A boolean indicating if preview features are enabled.
 * @returns The effective model name.
 */
export function getEffectiveModel(
  isInFallbackMode: boolean,
  requestedModel: string,
  previewFeaturesEnabled: boolean | undefined,
): string {
  const resolvedModel = resolveModel(requestedModel, previewFeaturesEnabled);

  // If we are not in fallback mode, simply use the resolved model.
  if (!isInFallbackMode) {
    return resolvedModel;
  }

  // If a "lite" model is requested, honor it. This allows for variations of
  // lite models without needing to list them all as constants.
  if (resolvedModel.includes('lite')) {
    return resolvedModel;
  }

  // Default fallback for Gemini CLI.
  return DEFAULT_GEMINI_FLASH_MODEL;
}

/**
 * Checks if the model is a Gemini 2.x model.
 *
 * @param model The model name to check.
 * @returns True if the model is a Gemini-2.x model.
 */
export function isGemini2Model(model: string): boolean {
  return /^gemini-2(\.|$)/.test(model);
}

/**
 * Checks if the model supports multimodal function responses (multimodal data nested within function response).
 * This is supported in Gemini 3.
 *
 * @param model The model name to check.
 * @returns True if the model supports multimodal function responses.
 */
export function supportsMultimodalFunctionResponse(model: string): boolean {
  return model.startsWith('gemini-3-');
}

/**
 * Resolves OpenAI model alias to concrete model name.
 *
 * @param requestedModel The model alias or concrete model name requested by the user.
 * @returns The resolved concrete model name.
 */
export function resolveOpenAIModel(requestedModel: string): string {
  switch (requestedModel) {
    case OPENAI_MODEL_ALIAS_STANDARD:
    case OPENAI_MODEL_ALIAS_TURBO:
      return DEEEPSEEK_V32;
    case OPENAI_MODEL_ALIAS_PRO:
      return DOUBAO_SEED_18;
    case OPENAI_MODEL_ALIAS_MULTIMODAL:
      return KIMI_K2;
    default:
      // Check if it's a valid OpenAI model
      if (VALID_OPENAI_MODELS.has(requestedModel)) {
        return requestedModel;
      }
      // If not a known OpenAI model, assume it's a custom model (like qwen3-max-preview)
      return requestedModel;
  }
}

/**
 * Checks if a model is an OpenAI compatible model.
 *
 * @param model The model name to check.
 * @returns True if the model is an OpenAI compatible model.
 */
export function isOpenAIModel(model: string): boolean {
  // Check if it's a known OpenAI model
  if (VALID_OPENAI_MODELS.has(model)) {
    return true;
  }

  // Check if it's a custom model that might be OpenAI compatible
  // This includes models like qwen3-max-preview, deepseek-chat, etc.
  // We assume any model not starting with 'gemini-' is OpenAI compatible
  return !model.startsWith('gemini-');
}

/**
 * Gets the default OpenAI model based on environment variable or default.
 *
 * @returns The default OpenAI model to use.
 */
export function getDefaultOpenAIModel(): string {
  return process.env['OPENAI_MODEL'] || DEFAULT_OPENAI_MODEL;
}

/**
 * Gets the default OpenAI embedding model based on environment variable or default.
 *
 * @returns The default OpenAI embedding model to use.
 */
export function getDefaultOpenAIEmbeddingModel(): string {
  return (
    process.env['OPENAI_EMBEDDING_MODEL'] || DEFAULT_OPENAI_EMBEDDING_MODEL
  );
}
