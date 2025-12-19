# Silent Mode Documentation

## Overview

The /silent command allows users to toggle silent mode, which skips DiffRenderer
rendering to prevent stack overflow errors for large diffs.

## Files Modified

### 1. `/Volumes/lp/code/gemini-cli/packages/cli/src/ui/commands/silentCommand.ts`

Implements the /silent command to toggle silent mode.

```typescript
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
```

### 2. `/Volumes/lp/code/gemini-cli/packages/core/src/config/config.ts`

Adds silent mode state management to the Config class.

```typescript
export class Config {
  // ... existing fields ...
  private silentMode: boolean = false;

  // ... existing methods ...

  getSilentMode(): boolean {
    return this.silentMode;
  }

  setSilentMode(silentMode: boolean): void {
    this.silentMode = silentMode;
  }
}
```

### 3. `/Volumes/lp/code/gemini-cli/packages/cli/src/services/BuiltinCommandLoader.ts`

Registers the silent command in the built-in commands list.

```typescript
import { silentCommand } from '../ui/commands/silentCommand.js';

// ... within loadCommands method ...
const allDefinitions: Array<SlashCommand | null> = [
  // ... existing commands ...
  silentCommand,
];
```

### 4. `/Volumes/lp/code/gemini-cli/packages/cli/src/ui/components/messages/DiffRenderer.tsx`

Adds silent mode prop and conditional rendering logic.

```typescript
interface DiffRendererProps {
  diffContent: string;
  filename?: string;
  tabWidth?: number;
  availableTerminalHeight?: number;
  terminalWidth: number;
  theme?: Theme;
  silentMode?: boolean;
}

export const DiffRenderer: React.FC<DiffRendererProps> = ({
  diffContent,
  filename,
  tabWidth = DEFAULT_TAB_WIDTH,
  availableTerminalHeight,
  terminalWidth,
  theme,
  silentMode = false,
}) => {
  // ... existing code ...

  const renderedOutput = useMemo(() => {
    if (silentMode) {
      return <Text color={semanticTheme.text.secondary}>Diff rendering skipped (silent mode enabled).</Text>;
    }

    // ... existing rendering logic ...
  }, [
    // ... existing dependencies ...
    silentMode,
  ]);

  // ... rest of component ...
}
```

### 5. `/Volumes/lp/code/gemini-cli/packages/cli/src/ui/components/messages/ToolResultDisplay.tsx`

Passes the silent mode prop from config to DiffRenderer.

```typescript
import { useConfig } from '../../contexts/ConfigContext.js';

export const ToolResultDisplay: React.FC<ToolResultDisplayProps> = ({
  resultDisplay,
  availableTerminalHeight,
  terminalWidth,
  renderOutputAsMarkdown = true,
}) => {
  // ... existing code ...
  const config = useConfig();

  // ... within return statement ...
  <DiffRenderer
    diffContent={(truncatedResultDisplay as FileDiffResult).fileDiff}
    filename={(truncatedResultDisplay as FileDiffResult).fileName}
    availableTerminalHeight={availableHeight}
    terminalWidth={childWidth}
    silentMode={config?.getSilentMode()}
  />
}
```

### 6. `/Volumes/lp/code/gemini-cli/packages/cli/src/ui/components/Footer.tsx`

Adds UI indicator for silent mode status in the footer.

```typescript
export const Footer: React.FC = () => {
  // ... existing code ...
  const silentMode = config.getSilentMode();

  // ... within return statement ...
  {silentMode && (
    <Box paddingLeft={1} flexDirection="row">
      <Text>
        <Text color={theme.ui.symbol}>| </Text>
        <Text color={theme.status.warning}>silent</Text>
      </Text>
    </Box>
  )}
}
```

## Command Functionality

- **Usage**: `/silent`
- **Behavior**: Toggles silent mode on/off
- **UI Indicator**: Shows "silent" in the footer when enabled
- **Effect**: DiffRenderer skips rendering when silent mode is enabled,
  preventing stack overflow errors for large diffs

## Integration with DiffRenderer

When silent mode is enabled:

1. DiffRenderer displays a message indicating diff rendering is skipped
2. The recursive rendering process that caused stack overflow is bypassed
3. Users can still see the diff content in raw text format

## UI Indicator

The silent mode status is displayed in the footer:

- When enabled: Shows "silent" in warning color
- When disabled: Not displayed

The indicator is positioned before the corgi mode indicator and error count
summary.
