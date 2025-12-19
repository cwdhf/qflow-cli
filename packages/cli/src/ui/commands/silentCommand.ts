/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SlashCommand } from './types.js';
import { CommandKind } from './types.js';

export const silentCommand: SlashCommand = {
  name: 'silent',
  description: 'Toggle silent mode to skip DiffRenderer rendering',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: async (context, _args) => {
    const config = context.services.config;

    // Toggle silent mode
    const currentSilentMode = config?.getSilentMode() || false;
    const newSilentMode = !currentSilentMode;

    if (config) {
      config.setSilentMode(newSilentMode);
      context.ui.setDebugMessage(
        `Silent mode ${newSilentMode ? 'enabled' : 'disabled'}`,
      );
    }
  },
};
