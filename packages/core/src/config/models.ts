/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface OpenAIModelConfig {
  value: string;
  title: string;
  description: string;
  key: string;
}

export interface OpenAIModelsConfig {
  defaultModel: string;
  defaultEmbeddingModel: string;
  models: OpenAIModelConfig[];
  aliases: Record<string, string>;
}

let openAIModelsConfig: OpenAIModelsConfig | null = null;

export function loadOpenAIModelsConfig(): OpenAIModelsConfig {
  if (openAIModelsConfig) {
    return openAIModelsConfig;
  }

  const modelsEnv = process.env['OPENAI_MODELS'];
  const aliasesEnv = process.env['OPENAI_MODEL_ALIASES'];

  if (modelsEnv) {
    try {
      const models = JSON.parse(modelsEnv) as OpenAIModelConfig[];
      const aliases = aliasesEnv
        ? (JSON.parse(aliasesEnv) as Record<string, string>)
        : {};
      openAIModelsConfig = {
        defaultModel:
          process.env['OPENAI_DEFAULT_MODEL'] || models[0]?.value || '',
        defaultEmbeddingModel:
          process.env['OPENAI_DEFAULT_EMBEDDING_MODEL'] || '',
        models,
        aliases,
      };
      console.log(
        `[OpenAI Models] Loaded config from environment variables with ${models.length} models`,
      );
      return openAIModelsConfig;
    } catch (error) {
      console.warn(
        '[OpenAI Models] Failed to parse OPENAI_MODELS env var:',
        error,
      );
    }
  }

  const defaultConfigPath = path.join(process.cwd(), 'openai-models.json');
  console.log(
    `[OpenAI Models] Attempting to load config from: ${defaultConfigPath}`,
  );

  try {
    const configContent = fs.readFileSync(defaultConfigPath, 'utf-8');
    openAIModelsConfig = JSON.parse(configContent) as OpenAIModelsConfig;
    console.log(
      `[OpenAI Models] Successfully loaded config with ${openAIModelsConfig.models.length} models`,
    );
    return openAIModelsConfig;
  } catch (error) {
    console.warn(
      `[OpenAI Models] Failed to load config from ${defaultConfigPath}, using defaults:`,
      error,
    );
    openAIModelsConfig = getDefaultOpenAIModelsConfig();
    return openAIModelsConfig;
  }
}

export function getDefaultOpenAIModelsConfig(): OpenAIModelsConfig {
  return {
    defaultModel: '',
    defaultEmbeddingModel: '',
    models: [],
    aliases: {},
  };
}

export function getOpenAIModelsConfig(): OpenAIModelsConfig {
  return openAIModelsConfig || getDefaultOpenAIModelsConfig();
}

export function getOpenAIModelsList(): OpenAIModelConfig[] {
  return getOpenAIModelsConfig().models;
}

export const PREVIEW_GEMINI_MODEL = 'gemini-3-pro-preview';
export const PREVIEW_GEMINI_FLASH_MODEL = 'gemini-3-flash-preview';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_LITE_MODEL =
  getOpenAIModelsConfig().defaultModel;

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

// OpenAI model aliases for user convenience
export const OPENAI_MODEL_ALIAS_PRO = 'pro';
export const OPENAI_MODEL_ALIAS_MULTIMODAL = 'multimodal';

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
  const config = getOpenAIModelsConfig();

  switch (requestedModel) {
    case 'standard':
    case 'turbo':
      return config.aliases['standard'];
    case 'pro':
      return config.aliases['pro'];
    case 'multimodal':
      return config.aliases['multimodal'];
    default: {
      const validModels = new Set(config.models.map((m) => m.value));
      if (validModels.has(requestedModel)) {
        return requestedModel;
      }
      return requestedModel;
    }
  }
}

/**
 * Checks if a model is an OpenAI compatible model.
 *
 * @param model The model name to check.
 * @returns True if the model is an OpenAI compatible model.
 */
export function isOpenAIModel(model: string): boolean {
  const config = getOpenAIModelsConfig();
  const validModels = new Set(config.models.map((m) => m.value));

  if (validModels.has(model)) {
    return true;
  }

  return !model.startsWith('gemini-');
}

/**
 * Gets the default OpenAI model based on environment variable or default.
 *
 * @returns The default OpenAI model to use.
 */
export function getDefaultOpenAIModel(): string {
  const config = getOpenAIModelsConfig();
  if (process.env['OPENAI_MODEL']) {
    return process.env['OPENAI_MODEL'];
  }
  return config.defaultModel || config.models[0]?.value || '';
}

/**
 * Gets the default OpenAI embedding model based on environment variable or default.
 *
 * @returns The default OpenAI embedding model to use.
 */
export function getDefaultOpenAIEmbeddingModel(): string {
  const config = getOpenAIModelsConfig();
  if (process.env['OPENAI_EMBEDDING_MODEL']) {
    return process.env['OPENAI_EMBEDDING_MODEL'];
  }
  return config.defaultEmbeddingModel || config.models[0]?.value || '';
}
