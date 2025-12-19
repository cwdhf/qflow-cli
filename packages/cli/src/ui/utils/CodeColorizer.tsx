/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Text, Box } from 'ink';
import { common, createLowlight } from 'lowlight';
import type {
  Root,
  Element,
  Text as HastText,
  ElementContent,
  RootContent,
} from 'hast';
import { themeManager } from '../themes/theme-manager.js';
import type { Theme } from '../themes/theme.js';
import {
  MaxSizedBox,
  MINIMUM_MAX_HEIGHT,
} from '../components/shared/MaxSizedBox.js';
import type { LoadedSettings } from '../../config/settings.js';
import { debugLogger } from '@google/gemini-cli-core';
import { isAlternateBufferEnabled } from '../hooks/useAlternateBuffer.js';

// Configure theming and parsing utilities.
const lowlight = createLowlight(common);

function renderHastNode(
  node: Root | Element | HastText | ElementContent | RootContent,
  theme: Theme,
  inheritedColor: string | undefined,
  depth: number = 0,
): React.ReactNode {
  // Prevent infinite recursion by limiting depth
  if (depth > 40000) {
    console.error('renderHastNode: Maximum depth reached');
    return null;
  }

  // Type guard for text nodes
  if (node.type === 'text') {
    const color = inheritedColor || theme.defaultColor;
    return <Text color={color}>{node.value}</Text>;
  }

  // Type guard for element nodes
  if (node.type === 'element') {
    const nodeClasses: string[] =
      (node.properties?.['className'] as string[]) || [];
    let elementColor: string | undefined = undefined;

    for (let i = nodeClasses.length - 1; i >= 0; i--) {
      const color = theme.getInkColor(nodeClasses[i]);
      if (color) {
        elementColor = color;
        break;
      }
    }

    const colorToPassDown = elementColor || inheritedColor;

    // Process only valid children that are ElementContent
    const children = node.children?.map(
      (child: ElementContent, index: number) => {
        // Only process text and element nodes to prevent infinite recursion
        if (child.type === 'text' || child.type === 'element') {
          return (
            <React.Fragment key={index}>
              {renderHastNode(child, theme, colorToPassDown, depth + 1)}
            </React.Fragment>
          );
        }
        return null;
      },
    );

    return <React.Fragment>{children}</React.Fragment>;
  }

  // Type guard for root nodes
  if (node.type === 'root') {
    if (!node.children || node.children.length === 0) {
      return null;
    }

    // Process only valid root content nodes
    return node.children?.map((child: RootContent, index: number) => {
      if (child.type === 'text' || child.type === 'element') {
        return (
          <React.Fragment key={index}>
            {renderHastNode(child, theme, inheritedColor, depth + 1)}
          </React.Fragment>
        );
      }
      return null;
    });
  }

  // Handle other node types (doctype, comment, etc.) by returning null
  return null;
}

function highlightAndRenderLine(
  line: string,
  language: string | null,
  theme: Theme,
): React.ReactNode {
  try {
    const getHighlightedLine = () =>
      !language || !lowlight.registered(language)
        ? lowlight.highlightAuto(line)
        : lowlight.highlight(language, line);

    const highlighted = getHighlightedLine();
    const renderedNode = renderHastNode(highlighted, theme, undefined);

    // Fall back to plain text if rendering fails or returns null
    return renderedNode !== null ? renderedNode : <Text>{line}</Text>;
  } catch (_error) {
    return <Text>{line}</Text>;
  }
}

export function colorizeLine(
  line: string,
  language: string | null,
  theme?: Theme,
): React.ReactNode {
  const activeTheme = theme || themeManager.getActiveTheme();
  return highlightAndRenderLine(line, language, activeTheme);
}

export interface ColorizeCodeOptions {
  code: string;
  language?: string | null;
  availableHeight?: number;
  maxWidth: number;
  theme?: Theme | null;
  settings: LoadedSettings;
  hideLineNumbers?: boolean;
}

/**
 * Renders syntax-highlighted code for Ink applications using a selected theme.
 *
 * @param options The options for colorizing the code.
 * @returns A React.ReactNode containing Ink <Text> elements for the highlighted code.
 */
export function colorizeCode({
  code,
  language = null,
  availableHeight,
  maxWidth,
  theme = null,
  settings,
  hideLineNumbers = false,
}: ColorizeCodeOptions): React.ReactNode {
  const codeToHighlight = code.replace(/\n$/, '');
  const activeTheme = theme || themeManager.getActiveTheme();
  const showLineNumbers = hideLineNumbers
    ? false
    : (settings?.merged.ui?.showLineNumbers ?? true);

  const useMaxSizedBox = !isAlternateBufferEnabled(settings);
  try {
    // Render the HAST tree using the adapted theme
    // Apply the theme's default foreground color to the top-level Text element
    let lines = codeToHighlight.split('\n');
    const padWidth = String(lines.length).length; // Calculate padding width based on number of lines

    let hiddenLinesCount = 0;

    // Optimization to avoid highlighting lines that cannot possibly be displayed.
    if (availableHeight !== undefined && useMaxSizedBox) {
      availableHeight = Math.max(availableHeight, MINIMUM_MAX_HEIGHT);
      if (lines.length > availableHeight) {
        const sliceIndex = lines.length - availableHeight;
        hiddenLinesCount = sliceIndex;
        lines = lines.slice(sliceIndex);
      }
    }

    const renderedLines = lines.map((line, index) => {
      const contentToRender = highlightAndRenderLine(
        line,
        language,
        activeTheme,
      );

      return (
        <Box key={index} minHeight={useMaxSizedBox ? undefined : 1}>
          {/* We have to render line numbers differently depending on whether we are using MaxSizeBox or not */}
          {showLineNumbers && useMaxSizedBox && (
            <Text color={activeTheme.colors.Gray}>
              {`${String(index + 1 + hiddenLinesCount).padStart(
                padWidth,
                ' ',
              )} `}
            </Text>
          )}
          {showLineNumbers && !useMaxSizedBox && (
            <Box
              minWidth={padWidth + 1}
              flexShrink={0}
              paddingRight={1}
              alignItems="flex-start"
              justifyContent="flex-end"
            >
              <Text color={activeTheme.colors.Gray}>
                {`${index + 1 + hiddenLinesCount}`}
              </Text>
            </Box>
          )}
          <Text color={activeTheme.defaultColor} wrap="wrap">
            {contentToRender}
          </Text>
        </Box>
      );
    });

    if (useMaxSizedBox) {
      return (
        <MaxSizedBox
          maxHeight={availableHeight}
          maxWidth={maxWidth}
          additionalHiddenLinesCount={hiddenLinesCount}
          overflowDirection="top"
        >
          {renderedLines}
        </MaxSizedBox>
      );
    }

    return (
      <Box flexDirection="column" width={maxWidth}>
        {renderedLines}
      </Box>
    );
  } catch (error) {
    debugLogger.warn(
      `[colorizeCode] Error highlighting code for language "${language}":`,
      error,
    );
    // Fall back to plain text with default color on error
    // Also display line numbers in fallback
    const lines = codeToHighlight.split('\n');
    const padWidth = String(lines.length).length; // Calculate padding width based on number of lines
    const fallbackLines = lines.map((line, index) => (
      <Box key={index} minHeight={useMaxSizedBox ? undefined : 1}>
        {/* We have to render line numbers differently depending on whether we are using MaxSizeBox or not */}
        {showLineNumbers && useMaxSizedBox && (
          <Text color={activeTheme.defaultColor}>
            {`${String(index + 1).padStart(padWidth, ' ')} `}
          </Text>
        )}
        {showLineNumbers && !useMaxSizedBox && (
          <Box
            minWidth={padWidth + 1}
            flexShrink={0}
            paddingRight={1}
            alignItems="flex-start"
            justifyContent="flex-end"
          >
            <Text color={activeTheme.defaultColor}>{`${index + 1}`}</Text>
          </Box>
        )}
        <Text color={activeTheme.colors.Gray}>{line}</Text>
      </Box>
    ));

    if (useMaxSizedBox) {
      return (
        <MaxSizedBox
          maxHeight={availableHeight}
          maxWidth={maxWidth}
          overflowDirection="top"
        >
          {fallbackLines}
        </MaxSizedBox>
      );
    }

    return (
      <Box flexDirection="column" width={maxWidth}>
        {fallbackLines}
      </Box>
    );
  }
}
