/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IdeClient,
  IdeConnectionEvent,
  IdeConnectionType,
  logIdeConnection,
  type Config,
  StartSessionEvent,
  logCliConfiguration,
  startupProfiler,
  AuthType,
} from '@google/gemini-cli-core';
import { type LoadedSettings } from '../config/settings.js';
import { performInitialAuth } from './auth.js';
import { validateTheme } from './theme.js';
import { SettingScope } from '../config/settings.js';

export interface InitializationResult {
  authError: string | null;
  themeError: string | null;
  shouldOpenAuthDialog: boolean;
  geminiMdFileCount: number;
}

/**
 * Orchestrates the application's startup initialization.
 * This runs BEFORE the React UI is rendered.
 * @param config The application config.
 * @param settings The loaded application settings.
 * @returns The results of the initialization.
 */
export async function initializeApp(
  config: Config,
  settings: LoadedSettings,
): Promise<InitializationResult> {
  // Auto-detect authentication type from environment variables
  let effectiveAuthType = settings.merged.security?.auth?.selectedType;

  // If no auth type is selected, try to auto-detect from environment
  if (!effectiveAuthType) {
    if (process.env['OPENAI_API_KEY']) {
      effectiveAuthType = AuthType.USE_OPENAI;
      // Automatically set the auth type in settings
      settings.setValue(
        SettingScope.User,
        'security.auth.selectedType',
        effectiveAuthType,
      );
    } else if (process.env['GEMINI_API_KEY']) {
      effectiveAuthType = AuthType.USE_GEMINI;
      settings.setValue(
        SettingScope.User,
        'security.auth.selectedType',
        effectiveAuthType,
      );
    } else if (process.env['GOOGLE_GENAI_USE_GCA'] === 'true') {
      effectiveAuthType = AuthType.LOGIN_WITH_GOOGLE;
      settings.setValue(
        SettingScope.User,
        'security.auth.selectedType',
        effectiveAuthType,
      );
    } else if (process.env['GOOGLE_GENAI_USE_VERTEXAI'] === 'true') {
      effectiveAuthType = AuthType.USE_VERTEX_AI;
      settings.setValue(
        SettingScope.User,
        'security.auth.selectedType',
        effectiveAuthType,
      );
    }
  }

  const authHandle = startupProfiler.start('authenticate');
  const authError = await performInitialAuth(config, effectiveAuthType);
  authHandle?.end();
  const themeError = validateTheme(settings);

  const shouldOpenAuthDialog = effectiveAuthType === undefined || !!authError;

  logCliConfiguration(
    config,
    new StartSessionEvent(config, config.getToolRegistry()),
  );

  if (config.getIdeMode()) {
    const ideClient = await IdeClient.getInstance();
    await ideClient.connect();
    logIdeConnection(config, new IdeConnectionEvent(IdeConnectionType.START));
  }

  return {
    authError,
    themeError,
    shouldOpenAuthDialog,
    geminiMdFileCount: config.getGeminiMdFileCount(),
  };
}
