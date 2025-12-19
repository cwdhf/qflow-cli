/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const PREVIEW_GEMINI_MODEL = 'gemini-3-pro-preview';
export const PREVIEW_GEMINI_FLASH_MODEL = 'gemini-3-flash-preview';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';

export const VALID_GEMINI_MODELS = new Set([
  PREVIEW_GEMINI_MODEL,
  PREVIEW_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
]);

export const PREVIEW_GEMINI_MODEL_AUTO = 'auto-gemini-3';
export const DEFAULT_GEMINI_MODEL_AUTO = 'auto-gemini-2.5';

// Model aliases for user convenience.
export const GEMINI_MODEL_ALIAS_AUTO = 'auto';
export const GEMINI_MODEL_ALIAS_PRO = 'pro';
export const GEMINI_MODEL_ALIAS_FLASH = 'flash';
export const GEMINI_MODEL_ALIAS_FLASH_LITE = 'flash-lite';

export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

// OpenAI model constants
export const DEFAULT_OPENAI_MODEL = 'doubao-seed-1-8-251215';
export const DEFAULT_OPENAI_EMBEDDING_MODEL = 'doubao-embedding-vision-250615';

// Common OpenAI models
export const DEEEPSEEK_V32 = 'deepseek-v3-2-251201';
export const DOUBAO_SEED_18 = 'doubao-seed-1-8-251215';
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
  previewFeaturesEnabled: boolean = false,
): string {
  switch (requestedModel) {
    case PREVIEW_GEMINI_MODEL_AUTO: {
      return PREVIEW_GEMINI_MODEL;
    }
    case DEFAULT_GEMINI_MODEL_AUTO: {
      return DEFAULT_GEMINI_MODEL;
    }
    case GEMINI_MODEL_ALIAS_PRO: {
      return previewFeaturesEnabled
        ? PREVIEW_GEMINI_MODEL
        : DEFAULT_GEMINI_MODEL;
    }
    case GEMINI_MODEL_ALIAS_FLASH: {
      return previewFeaturesEnabled
        ? PREVIEW_GEMINI_FLASH_MODEL
        : DEFAULT_GEMINI_FLASH_MODEL;
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
 * Resolves the appropriate model based on the classifier's decision.
 *
 * @param requestedModel The current requested model (e.g. auto-gemini-2.5).
 * @param modelAlias The alias selected by the classifier ('flash' or 'pro').
 * @param previewFeaturesEnabled Whether preview features are enabled.
 * @returns The resolved concrete model name.
 */
export function resolveClassifierModel(
  requestedModel: string,
  modelAlias: string,
  previewFeaturesEnabled: boolean = false,
): string {
  if (modelAlias === GEMINI_MODEL_ALIAS_FLASH) {
    if (
      requestedModel === DEFAULT_GEMINI_MODEL_AUTO ||
      requestedModel === DEFAULT_GEMINI_MODEL
    ) {
      return DEFAULT_GEMINI_FLASH_MODEL;
    }
    if (
      requestedModel === PREVIEW_GEMINI_MODEL_AUTO ||
      requestedModel === PREVIEW_GEMINI_MODEL
    ) {
      return PREVIEW_GEMINI_FLASH_MODEL;
    }
    return resolveModel(GEMINI_MODEL_ALIAS_FLASH, previewFeaturesEnabled);
  }
  return resolveModel(requestedModel, previewFeaturesEnabled);
}

/**
 * Determines the effective model to use.
 *
 * @param requestedModel The model that was originally requested.
 * @param previewFeaturesEnabled A boolean indicating if preview features are enabled.
 * @returns The effective model name.
 */
export function getEffectiveModel(
  requestedModel: string,
  previewFeaturesEnabled: boolean | undefined,
): string {
  return resolveModel(requestedModel, previewFeaturesEnabled);
}

export function getDisplayString(
  model: string,
  previewFeaturesEnabled: boolean = false,
) {
  // Check if it's an OpenAI model
  if (isOpenAIModel(model)) {
    return `Manual (${model})`;
  }

  switch (model) {
    case PREVIEW_GEMINI_MODEL_AUTO:
      return 'Auto (Gemini 3)';
    case DEFAULT_GEMINI_MODEL_AUTO:
      return 'Auto (Gemini 2.5)';
    case GEMINI_MODEL_ALIAS_PRO:
      return `Manual (${
        previewFeaturesEnabled ? PREVIEW_GEMINI_MODEL : DEFAULT_GEMINI_MODEL
      })`;
    case GEMINI_MODEL_ALIAS_FLASH:
      return `Manual (${
        previewFeaturesEnabled
          ? PREVIEW_GEMINI_FLASH_MODEL
          : DEFAULT_GEMINI_FLASH_MODEL
      })`;
    default:
      return `Manual (${model})`;
  }
}

/**
 * Checks if the model is a preview model.
 *
 * @param model The model name to check.
 * @returns True if the model is a preview model.
 */
export function isPreviewModel(model: string): boolean {
  return (
    model === PREVIEW_GEMINI_MODEL ||
    model === PREVIEW_GEMINI_FLASH_MODEL ||
    model === PREVIEW_GEMINI_MODEL_AUTO
  );
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
