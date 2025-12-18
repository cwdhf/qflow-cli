/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useCallback, useContext, useMemo } from 'react';
import { Box, Text } from 'ink';
import {
  PREVIEW_GEMINI_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
  DEFAULT_GEMINI_MODEL_AUTO,
  GEMINI_MODEL_ALIAS_FLASH,
  GEMINI_MODEL_ALIAS_FLASH_LITE,
  GEMINI_MODEL_ALIAS_PRO,
  DEFAULT_OPENAI_MODEL,
  DEEEPSEEK_V32,
  DOUBAO_SEED_18,
  KIMI_K2,
  ModelSlashCommandEvent,
  logModelSlashCommand,
  AuthType,
} from '@google/gemini-cli-core';
import { useKeypress } from '../hooks/useKeypress.js';
import { theme } from '../semantic-colors.js';
import { DescriptiveRadioButtonSelect } from './shared/DescriptiveRadioButtonSelect.js';
import { ConfigContext } from '../contexts/ConfigContext.js';
import { ThemedGradient } from './ThemedGradient.js';

interface ModelDialogProps {
  onClose: () => void;
}

export function ModelDialog({ onClose }: ModelDialogProps): React.JSX.Element {
  const config = useContext(ConfigContext);

  // Determine the Preferred Model (read once when the dialog opens).
  const preferredModel = config?.getModel() || DEFAULT_GEMINI_MODEL_AUTO;

  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        onClose();
      }
    },
    { isActive: true },
  );

  // Check if using OpenAI authentication
  const isUsingOpenAI = useMemo(() => {
    const generatorConfig = config?.getContentGeneratorConfig?.();
    const authType = generatorConfig?.authType;
    return authType === AuthType.USE_OPENAI || process.env['OPENAI_API_KEY'];
  }, [config]);

  const options = useMemo(() => {
    if (isUsingOpenAI) {
      // OpenAI model options
      const openaiModels = [
        {
          value: DOUBAO_SEED_18,
          title: 'doubao-seed-v1.8',
          description: '豆包1.8·深度思考模型',
          key: DOUBAO_SEED_18,
        },
        {
          value: DEEEPSEEK_V32,
          title: 'deepseek-v3.2',
          description:
            'DSA稀疏注意力机制 | 可扩展的强化学习框架 | 思考融入工具调用',
          key: DEEEPSEEK_V32,
        },
        {
          value: KIMI_K2,
          title: 'kimi-k2-thinking',
          description:
            'Kimi-K2 是一款Moonshot AI推出的具备超强代码和 Agent 能力的 MoE 架构基础模型，总参数 1T，激活参数 32B',
          key: KIMI_K2,
        },
      ];

      // Add custom model from environment if specified
      const customModel = process.env['OPENAI_MODEL'];
      if (customModel && !openaiModels.some((m) => m.value === customModel)) {
        openaiModels.unshift({
          value: customModel,
          title: `Custom (${customModel})`,
          description: 'Your configured OpenAI compatible model',
          key: customModel,
        });
      }

      return openaiModels;
    } else {
      // Hanfeng model options
      return [
        {
          value: DEFAULT_GEMINI_MODEL_AUTO,
          title: 'Auto',
          description: 'Let the system choose the best model for your task.',
          key: DEFAULT_GEMINI_MODEL_AUTO,
        },
        {
          value: GEMINI_MODEL_ALIAS_PRO,
          title: config?.getPreviewFeatures()
            ? `Pro (${PREVIEW_GEMINI_MODEL}, ${DEFAULT_GEMINI_MODEL})`
            : `Pro (${DEFAULT_GEMINI_MODEL})`,
          description:
            'For complex tasks that require deep reasoning and creativity',
          key: GEMINI_MODEL_ALIAS_PRO,
        },
        {
          value: GEMINI_MODEL_ALIAS_FLASH,
          title: `Flash (${DEFAULT_GEMINI_FLASH_MODEL})`,
          description: 'For tasks that need a balance of speed and reasoning',
          key: GEMINI_MODEL_ALIAS_FLASH,
        },
        {
          value: GEMINI_MODEL_ALIAS_FLASH_LITE,
          title: `Flash-Lite (${DEFAULT_GEMINI_FLASH_LITE_MODEL})`,
          description: 'For simple tasks that need to be done quickly',
          key: GEMINI_MODEL_ALIAS_FLASH_LITE,
        },
      ];
    }
  }, [config, isUsingOpenAI]);

  // Calculate the initial index based on the preferred model.
  const initialIndex = useMemo(() => {
    if (isUsingOpenAI) {
      // For OpenAI, get the current model from environment or default
      const currentModel = process.env['OPENAI_MODEL'] || DEFAULT_OPENAI_MODEL;
      return options.findIndex((option) => option.value === currentModel);
    } else {
      // For Gemini, use the existing logic
      return options.findIndex((option) => option.value === preferredModel);
    }
  }, [preferredModel, options, isUsingOpenAI]);

  // Handle selection internally (Autonomous Dialog).
  const handleSelect = useCallback(
    async (model: string) => {
      if (config) {
        if (isUsingOpenAI) {
          // For OpenAI, we need to update the config and refresh authentication
          try {
            // Log the model change
            console.log(`Switching to OpenAI model: ${model}`);

            // Update the config to trigger UI updates and set environment variable
            // This ensures the footer displays the correct model
            config.setModel(model);

            // Refresh authentication to apply the new model
            // This will recreate the content generator with the new model
            void config.refreshAuth(AuthType.USE_OPENAI);

            // Log the model change event
            const event = new ModelSlashCommandEvent(model);
            logModelSlashCommand(config, event);

            console.log(`✅ OpenAI model changed to: ${model}`);
          } catch (error) {
            console.error(`Failed to switch OpenAI model: ${error}`);
          }
        } else {
          // For Gemini, use the existing config.setModel
          config.setModel(model);
          const event = new ModelSlashCommandEvent(model);
          logModelSlashCommand(config, event);
        }
      }
      onClose();
    },
    [config, onClose, isUsingOpenAI],
  );

  const header = isUsingOpenAI
    ? 'Select OpenAI Model'
    : config?.getPreviewFeatures()
      ? 'Gemini 3 is now enabled.'
      : 'Gemini 3 is now available.';

  const subheader = isUsingOpenAI
    ? `You are using OpenAI compatible API. Models can also be configured via OPENAI_MODEL environment variable.`
    : config?.getPreviewFeatures()
      ? `To disable Gemini 3, disable "Preview features" in /settings.\nLearn more at https://goo.gle/enable-preview-features\n\nWhen you select Auto or Pro, Gemini CLI will attempt to use ${PREVIEW_GEMINI_MODEL} first, before falling back to ${DEFAULT_GEMINI_MODEL}.`
      : `To use Gemini 3, enable "Preview features" in /settings.\nLearn more at https://goo.gle/enable-preview-features`;

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.default}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Select Model</Text>

      <Box marginTop={1} marginBottom={1} flexDirection="column">
        <ThemedGradient>
          <Text>{header}</Text>
        </ThemedGradient>
        <Text>{subheader}</Text>
      </Box>

      <Box marginTop={1}>
        <DescriptiveRadioButtonSelect
          items={options}
          onSelect={(model) => void handleSelect(model)}
          initialIndex={initialIndex}
          showNumbers={true}
        />
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.text.secondary}>
          {isUsingOpenAI
            ? 'To use a specific OpenAI model on startup, set the OPENAI_MODEL environment variable.'
            : 'To use a specific Hanfeng model on startup, use the --model flag.'}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.text.secondary}>(Press Esc to close)</Text>
      </Box>
    </Box>
  );
}
