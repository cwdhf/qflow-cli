/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';

import type { AgentCard, Message, Part, Task, TextPart } from '@a2a-js/sdk';
import type { TaskStore, RequestContext } from '@a2a-js/sdk/server';
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
  DefaultExecutionEventBus,
  type AgentExecutionEvent,
  UnauthenticatedUser,
  ServerCallContext,
} from '@a2a-js/sdk/server';
import {
  A2AExpressApp,
  restHandler,
  UserBuilder,
} from '@a2a-js/sdk/server/express'; // Import server components
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { AgentSettings, PersistedStateMetadata } from '../types.js';
import { CoderAgentEvent } from '../types.js';
import { GCSTaskStore, CustomInMemoryTaskStore } from '../persistence/gcs.js';
import { CoderAgentExecutor } from '../agent/executor.js';
import { requestStorage } from './requestStorage.js';
import { loadConfig, loadEnvironment, setTargetDir } from '../config/config.js';
import { loadSettings } from '../config/settings.js';
import { loadExtensions } from '../config/extension.js';
import { commandRegistry } from '../commands/command-registry.js';
import { SimpleExtensionLoader } from '@google/gemini-cli-core';
import type { Command, CommandArgument } from '../commands/types.js';
import { GitService } from '@google/gemini-cli-core';

type CommandResponse = {
  name: string;
  description: string;
  arguments: CommandArgument[];
  subCommands: CommandResponse[];
};

const coderAgentCard: AgentCard = {
  name: 'Qflow SDLC Agent',
  description:
    'A comprehensive AI agent for software development lifecycle tasks. Supports code generation, file operations, shell commands, MCP tool integration, and interactive development workflows with real-time streaming updates.',
  url: 'http://localhost:41242/',
  provider: {
    organization: 'Qflow',
    url: 'https://qflow.ai',
  },
  protocolVersion: '0.3.0',
  version: '0.0.3',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true,
    extensions: [
      {
        uri: 'https://github.com/google-gemini/gemini-cli/blob/main/docs/a2a/developer-profile/v0/spec.md',
        description:
          'Development-tool extension for interactive development tasks, enabling code generation, tool usage, file operations, shell commands, MCP integration, and real-time status updates with user confirmation workflows.',
        required: true,
      },
    ],
  },
  securitySchemes: undefined,
  security: undefined,
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  skills: [
    {
      id: 'code_generation',
      name: 'Code Generation',
      description:
        'Generates code snippets or complete files based on user requests, streaming the results. Supports multiple programming languages and frameworks.',
      tags: ['code', 'development', 'programming', 'generation'],
      examples: [
        'Write a python function to calculate fibonacci numbers.',
        'Create an HTML file with a basic button that alerts "Hello!" when clicked.',
        'Generate a React component for a user profile card.',
      ],
      inputModes: ['text'],
      outputModes: ['text'],
    },
    {
      id: 'file_operations',
      name: 'File Operations',
      description:
        'Performs file system operations including reading, writing, editing, and searching files. Supports diff-based editing with user confirmation.',
      tags: ['file', 'filesystem', 'edit', 'search'],
      examples: [
        'Read the contents of package.json',
        'Replace the version number in README.md',
        'Search for all TypeScript files containing "interface"',
      ],
      inputModes: ['text'],
      outputModes: ['text'],
    },
    {
      id: 'shell_commands',
      name: 'Shell Command Execution',
      description:
        'Executes shell commands with real-time output streaming. Supports command confirmation and working directory specification.',
      tags: ['shell', 'terminal', 'command', 'execution'],
      examples: [
        'Run npm install to install dependencies',
        'Execute tests with npm test',
        'Build the project using webpack',
      ],
      inputModes: ['text'],
      outputModes: ['text'],
    },
    {
      id: 'mcp_tools',
      name: 'MCP Tool Integration',
      description:
        'Integrates with Model Context Protocol (MCP) servers to access external tools and services. Supports dynamic tool discovery and execution.',
      tags: ['mcp', 'integration', 'external-tools', 'api'],
      examples: [
        'Query database using MCP database server',
        'Fetch weather information via MCP weather service',
        'Access GitHub API through MCP GitHub integration',
      ],
      inputModes: ['text'],
      outputModes: ['text'],
    },
    {
      id: 'slash_commands',
      name: 'Slash Commands',
      description:
        'Supports custom slash commands for specialized operations. Commands can be discovered dynamically via the /listCommands endpoint.',
      tags: ['commands', 'workflow', 'automation'],
      examples: [
        '/memory add - Save context to memory',
        '/restore - Restore from a checkpoint',
        '/help - Show available commands',
      ],
      inputModes: ['text'],
      outputModes: ['text'],
    },
    {
      id: 'interactive_development',
      name: 'Interactive Development',
      description:
        'Provides interactive development workflows with real-time status updates, tool call confirmations, and streaming progress. Supports state tracking and resumption.',
      tags: ['interactive', 'workflow', 'streaming', 'confirmation'],
      examples: [
        'Refactor the authentication module with step-by-step confirmation',
        'Debug the failing API endpoint with interactive troubleshooting',
        'Implement a new feature with iterative development',
      ],
      inputModes: ['text'],
      outputModes: ['text'],
    },
  ],
  supportsAuthenticatedExtendedCard: false,
};

export function updateCoderAgentCardUrl(port: number) {
  coderAgentCard.url = `http://localhost:${port}/`;
}

async function handleExecuteCommand(
  req: express.Request,
  res: express.Response,
  context: {
    config: Awaited<ReturnType<typeof loadConfig>>;
    git: GitService | undefined;
    agentExecutor: CoderAgentExecutor;
  },
) {
  logger.info('[CoreAgent] Received /executeCommand request: ', req.body);
  const { command, args } = req.body;
  try {
    if (typeof command !== 'string') {
      return res.status(400).json({ error: 'Invalid "command" field.' });
    }

    if (args && !Array.isArray(args)) {
      return res.status(400).json({ error: '"args" field must be an array.' });
    }

    const commandToExecute = commandRegistry.get(command);

    if (commandToExecute?.requiresWorkspace) {
      if (!process.env['CODER_AGENT_WORKSPACE_PATH']) {
        return res.status(400).json({
          error: `Command "${command}" requires a workspace, but CODER_AGENT_WORKSPACE_PATH is not set.`,
        });
      }
    }

    if (!commandToExecute) {
      return res.status(404).json({ error: `Command not found: ${command}` });
    }

    if (commandToExecute.streaming) {
      const eventBus = new DefaultExecutionEventBus();
      res.setHeader('Content-Type', 'text/event-stream');
      const eventHandler = (event: AgentExecutionEvent) => {
        const jsonRpcResponse = {
          jsonrpc: '2.0',
          id: 'taskId' in event ? event.taskId : (event as Message).messageId,
          result: event,
        };
        res.write(`data: ${JSON.stringify(jsonRpcResponse)}\n`);
      };
      eventBus.on('event', eventHandler);

      await commandToExecute.execute({ ...context, eventBus }, args ?? []);

      eventBus.off('event', eventHandler);
      eventBus.finished();
      return res.end(); // Explicit return for streaming path
    } else {
      const result = await commandToExecute.execute(context, args ?? []);
      logger.info('[CoreAgent] Sending /executeCommand response: ', result);
      return res.status(200).json(result);
    }
  } catch (e) {
    logger.error(
      `Error executing /executeCommand: ${command} with args: ${JSON.stringify(
        args,
      )}`,
      e,
    );
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error executing command';
    return res.status(500).json({ error: errorMessage });
  }
}

export async function createApp() {
  try {
    // Load the server configuration once on startup.
    const workspaceRoot = setTargetDir(undefined);
    loadEnvironment();
    const settings = loadSettings(workspaceRoot);
    const extensions = loadExtensions(workspaceRoot);
    const config = await loadConfig(
      settings,
      new SimpleExtensionLoader(extensions),
      'a2a-server',
    );

    let git: GitService | undefined;
    if (config.getCheckpointingEnabled()) {
      git = new GitService(config.getTargetDir(), config.storage);
      await git.initialize();
    }

    // loadEnvironment() is called within getConfig now
    const bucketName = process.env['GCS_BUCKET_NAME'];
    let taskStoreForExecutor: TaskStore;
    let taskStoreForHandler: TaskStore;

    if (bucketName) {
      logger.info(`Using GCSTaskStore with bucket: ${bucketName}`);
      const gcsTaskStore = new GCSTaskStore(bucketName);
      taskStoreForExecutor = gcsTaskStore;
      taskStoreForHandler = gcsTaskStore;
    } else {
      logger.info('Using InMemoryTaskStore');
      const inMemoryTaskStore = new CustomInMemoryTaskStore();
      taskStoreForExecutor = inMemoryTaskStore;
      taskStoreForHandler = inMemoryTaskStore;
    }

    const agentExecutor = new CoderAgentExecutor(taskStoreForExecutor);

    const context = { config, git, agentExecutor };

    const requestHandler = new DefaultRequestHandler(
      coderAgentCard,
      taskStoreForHandler,
      agentExecutor,
    );

    let expressApp = express();
    expressApp.use((req, res, next) => {
      requestStorage.run({ req }, next);
    });

    const appBuilder = new A2AExpressApp(requestHandler);
    expressApp = appBuilder.setupRoutes(expressApp, '', [
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        if (
          (req.path === '/v1/message:stream' ||
            req.path === '/v1/message:send') &&
          req.method === 'POST'
        ) {
          const autoExecute = req.body.auto_execute ?? false;
          logger.info(
            `[CoreAgent] Processing ${req.path} with auto_execute = ${autoExecute}`,
          );
          logger.info(
            `[CoreAgent] Original message parts: ${JSON.stringify(req.body.message?.parts)}`,
          );
          if (req.body.message) {
            req.body.message.metadata = req.body.message.metadata || {};
            req.body.message.metadata.coderAgent = {
              kind: CoderAgentEvent.StateAgentSettingsEvent,
              workspacePath:
                process.env['CODER_AGENT_WORKSPACE_PATH'] || process.cwd(),
              autoExecute,
            };

            if (
              req.body.message.parts &&
              Array.isArray(req.body.message.parts)
            ) {
              req.body.message.parts = req.body.message.parts.map(
                (part: { text?: string; kind?: string }) => {
                  if (part.text && !part.kind) {
                    logger.info(
                      `[CoreAgent] Converting part without kind: ${JSON.stringify(part)}`,
                    );
                    return { kind: 'text', text: part.text };
                  }
                  return part;
                },
              );
              logger.info(
                `[CoreAgent] Modified message parts: ${JSON.stringify(req.body.message.parts)}`,
              );
            }
          }
        }
        next();
      },
    ]);

    expressApp.get('/v1/tasks/:taskId', async (req, res) => {
      try {
        const taskId = req.params.taskId;
        logger.info(
          `[CoreAgent] Custom GET /v1/tasks/${taskId} - loading full task with history and artifacts`,
        );

        const task = await taskStoreForHandler.load(taskId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        logger.info(`[CoreAgent] Loaded task ${taskId}:`);
        logger.info(
          `[CoreAgent]   - history length: ${task.history?.length || 0}`,
        );
        logger.info(
          `[CoreAgent]   - artifacts length: ${task.artifacts?.length || 0}`,
        );
        logger.info(`[CoreAgent]   - status: ${task.status?.state}`);
        logger.info(
          `[CoreAgent]   - metadata keys: ${Object.keys(task.metadata || {}).join(', ')}`,
        );
        const persistedState = task.metadata?.['__persistedState'] as
          | PersistedStateMetadata
          | undefined;
        logger.info(
          `[CoreAgent]   - metadata._taskState: ${persistedState?._taskState}`,
        );

        const response = {
          id: task.id,
          contextId: task.contextId,
          kind: task.kind,
          status: task.status,
          metadata: task.metadata,
          history: task.history || [],
          artifacts: task.artifacts || [],
        };

        logger.info(
          `[CoreAgent] Returning task ${taskId} with ${response.history.length} history items and ${response.artifacts.length} artifacts`,
        );
        return res.json(response);
      } catch (error) {
        logger.error('[CoreAgent] Error loading task:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error loading task';
        return res.status(500).json({ error: errorMessage });
      }
    });

    expressApp.post('/v1/message:send', async (req, res) => {
      try {
        const body = req.body;
        const message = body.message;
        const autoExecute = body.auto_execute ?? false;

        logger.info(
          `[CoreAgent] Custom /v1/message:send - message: ${JSON.stringify(message.parts)}`,
        );
        logger.info(
          `[CoreAgent] Custom /v1/message:send - auto_execute: ${autoExecute}`,
        );

        if (!message) {
          return res.status(400).json({ error: 'Message is required' });
        }

        const a2aMessage: Message = {
          kind: 'message',
          messageId: message.messageId || uuidv4(),
          role: message.role || 'user',
          parts: message.parts || [],
          metadata: message.metadata,
        };

        const result = await requestHandler.sendMessage(
          {
            message: a2aMessage,
            metadata: body.metadata,
          },
          new ServerCallContext(undefined, new UnauthenticatedUser()),
        );

        const isTask = (value: Message | Task): value is Task =>
          typeof value === 'object' &&
          value !== null &&
          'kind' in value &&
          value.kind === 'task';

        if (isTask(result)) {
          const taskId = result.id;
          logger.info(
            `[CoreAgent] Custom /v1/message:send - task created: ${taskId}`,
          );

          if (autoExecute) {
            logger.info(
              `[CoreAgent] Custom /v1/message:send - waiting for task execution to complete...`,
            );
            let attempts = 0;
            let task = await taskStoreForHandler.load(taskId);
            while (
              task &&
              !['completed', 'failed', 'canceled', 'input-required'].includes(
                task.status?.state || '',
              ) &&
              attempts < 50
            ) {
              await new Promise((resolve) => setTimeout(resolve, 100));
              task = await taskStoreForHandler.load(taskId);
              attempts++;
            }
            logger.info(
              `[CoreAgent] Custom /v1/message:send - task state after wait: ${task?.status?.state}, artifacts: ${task?.artifacts?.length}`,
            );
          }

          const finalTask = await taskStoreForHandler.load(taskId);
          if (finalTask) {
            logger.info(
              `[CoreAgent] Custom /v1/message:send - returning task with ${finalTask.history?.length || 0} history items and ${finalTask.artifacts?.length || 0} artifacts`,
            );
            return res.json({
              id: finalTask.id,
              kind: finalTask.kind,
              contextId: finalTask.contextId,
              status: finalTask.status,
              metadata: finalTask.metadata,
              history: finalTask.history || [],
              artifacts: finalTask.artifacts || [],
            });
          }
        }

        return res.json(result);
      } catch (error) {
        logger.error('[CoreAgent] Custom /v1/message:send error:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({ error: errorMessage });
      }
    });

    expressApp.use(
      restHandler({
        requestHandler,
        userBuilder: UserBuilder.noAuthentication,
      }),
    );

    expressApp.post('/tasks', async (req, res) => {
      try {
        const taskId = uuidv4();
        const agentSettings = req.body.agentSettings as
          | AgentSettings
          | undefined;
        const contextId = req.body.contextId || uuidv4();
        const autoExecute =
          req.body.auto_execute ?? agentSettings?.autoExecute ?? false;
        const message = req.body.message;
        const finalAgentSettings: AgentSettings = agentSettings
          ? { ...agentSettings, autoExecute }
          : {
              kind: CoderAgentEvent.StateAgentSettingsEvent,
              workspacePath:
                process.env['CODER_AGENT_WORKSPACE_PATH'] || process.cwd(),
              autoExecute,
            };

        const wrapper = await agentExecutor.createTask(
          taskId,
          contextId,
          finalAgentSettings,
        );

        if (autoExecute && message) {
          logger.info(
            `[CoreAgent] Auto-executing task ${taskId} with user message`,
          );
          const eventBus = new DefaultExecutionEventBus();
          const requestContext: RequestContext = {
            userMessage: {
              kind: 'message',
              role: message.role || 'user',
              parts: message.parts || [],
              messageId: uuidv4(),
              taskId,
              contextId,
              metadata: {
                coderAgent: finalAgentSettings,
              },
            },
            taskId,
            contextId,
          };

          const executionPromise = agentExecutor.execute(
            requestContext,
            eventBus,
          );

          eventBus.on('event', (event: AgentExecutionEvent) => {
            logger.info(`[CoreAgent] Task ${taskId} event: ${event.kind}`);
          });

          await executionPromise;
          logger.info(
            `[CoreAgent] Task ${taskId} execution completed, loading final state from store`,
          );

          const finalTask = await taskStoreForExecutor.load(taskId);
          if (finalTask) {
            res.status(201).json({ id: taskId });
          } else {
            logger.warn(
              `[CoreAgent] Task ${taskId} not found in store after execution, using wrapper`,
            );
            const sdkTask = wrapper.toSDKTask();
            await taskStoreForExecutor.save(sdkTask);
            res.status(201).json({ id: wrapper.id });
          }
        } else {
          const sdkTask = wrapper.toSDKTask();
          await taskStoreForExecutor.save(sdkTask);
          res.status(201).json({ id: wrapper.id });
        }
      } catch (error) {
        logger.error('[CoreAgent] Error creating task:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown error creating task';
        res.status(500).send({ error: errorMessage });
      }
    });

    expressApp.post('/executeCommand', (req, res) => {
      void handleExecuteCommand(req, res, context);
    });

    expressApp.get('/listCommands', (req, res) => {
      try {
        const transformCommand = (
          command: Command,
          visited: string[],
        ): CommandResponse | undefined => {
          const commandName = command.name;
          if (visited.includes(commandName)) {
            console.warn(
              `Command ${commandName} already inserted in the response, skipping`,
            );
            return undefined;
          }

          return {
            name: command.name,
            description: command.description,
            arguments: command.arguments ?? [],
            subCommands: (command.subCommands ?? [])
              .map((subCommand) =>
                transformCommand(subCommand, visited.concat(commandName)),
              )
              .filter(
                (subCommand): subCommand is CommandResponse => !!subCommand,
              ),
          };
        };

        const commands = commandRegistry
          .getAllCommands()
          .filter((command) => command.topLevel)
          .map((command) => transformCommand(command, []));

        return res.status(200).json({ commands });
      } catch (e) {
        logger.error('Error executing /listCommands:', e);
        const errorMessage =
          e instanceof Error ? e.message : 'Unknown error listing commands';
        return res.status(500).json({ error: errorMessage });
      }
    });

    expressApp.get('/tasks/metadata', async (req, res) => {
      // This endpoint is only meaningful if the task store is in-memory.
      if (!(taskStoreForExecutor instanceof InMemoryTaskStore)) {
        res.status(501).send({
          error:
            'Listing all task metadata is only supported when using InMemoryTaskStore.',
        });
      }
      try {
        const wrappers = agentExecutor.getAllTasks();
        if (wrappers && wrappers.length > 0) {
          const tasksMetadata = await Promise.all(
            wrappers.map((wrapper) => wrapper.task.getMetadata()),
          );
          res.status(200).json(tasksMetadata);
        } else {
          res.status(204).send();
        }
      } catch (error) {
        logger.error('[CoreAgent] Error getting all task metadata:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown error getting task metadata';
        res.status(500).send({ error: errorMessage });
      }
    });

    expressApp.get('/tasks/:taskId/metadata', async (req, res) => {
      const taskId = req.params.taskId;
      let wrapper = agentExecutor.getTask(taskId);
      if (!wrapper) {
        const sdkTask = await taskStoreForExecutor.load(taskId);
        if (sdkTask) {
          wrapper = await agentExecutor.reconstruct(sdkTask);
        }
      }
      if (!wrapper) {
        res.status(404).send({ error: 'Task not found' });
        return;
      }
      res.json({ metadata: await wrapper.task.getMetadata() });
    });

    expressApp.post('/chat/completions', async (req, res) => {
      try {
        const {
          model,
          messages,
          stream = false,
          auto_execute: autoExecute = false,
        } = req.body;

        logger.info(
          `[CoreAgent] /chat/completions called with auto_execute = ${autoExecute}`,
        );

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          return res.status(400).json({
            error: {
              message: 'messages is required and must be a non-empty array',
              type: 'invalid_request_error',
            },
          });
        }

        const lastMessage = messages[messages.length - 1];
        const messageId = uuidv4();

        const a2aMessage = {
          kind: 'message' as const,
          messageId,
          role: lastMessage.role || 'user',
          parts: [
            {
              kind: 'text' as const,
              text: lastMessage.content || '',
            },
          ],
        };

        const agentSettings: AgentSettings = {
          kind: CoderAgentEvent.StateAgentSettingsEvent,
          workspacePath:
            process.env['CODER_AGENT_WORKSPACE_PATH'] || process.cwd(),
          autoExecute: typeof autoExecute === 'boolean' ? autoExecute : false,
        };

        if (stream) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.flushHeaders();

          const streamResult = requestHandler.sendMessageStream(
            {
              message: a2aMessage,
              metadata: {
                coderAgent: agentSettings,
              },
            },
            new ServerCallContext(undefined, new UnauthenticatedUser()),
          );

          try {
            for await (const event of streamResult) {
              if (event.kind === 'status-update' && event.status.message) {
                const content = event.status.message.parts
                  .filter((p: Part): p is TextPart => p.kind === 'text')
                  .map((p: TextPart) => p.text)
                  .join('');

                const chunk = {
                  id: `chatcmpl-${messageId}`,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: model || 'qflow',
                  choices: [
                    {
                      index: 0,
                      delta: {
                        content,
                      },
                      finish_reason: null,
                    },
                  ],
                };

                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              } else if (
                event.kind === 'status-update' &&
                event.status.state === 'completed'
              ) {
                const finalChunk = {
                  id: `chatcmpl-${messageId}`,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: model || 'qflow',
                  choices: [
                    {
                      index: 0,
                      delta: {},
                      finish_reason: 'stop',
                    },
                  ],
                };
                res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
                res.write('data: [DONE]\n\n');
                break;
              }
            }
          } catch (streamError) {
            logger.error('[CoreAgent] Stream error:', streamError);
          } finally {
            res.end();
          }
          return;
        } else {
          const result = await requestHandler.sendMessage(
            {
              message: a2aMessage,
              metadata: {
                coderAgent: agentSettings,
              },
            },
            new ServerCallContext(undefined, new UnauthenticatedUser()),
          );

          const isTask = (value: Message | Task): value is Task =>
            typeof value === 'object' &&
            value !== null &&
            'kind' in value &&
            value.kind === 'task';

          let taskId: string | undefined;
          let finalResult = result;

          if (isTask(result)) {
            taskId = result.id;
            logger.info(
              `[CoreAgent] sendMessage returned task ${taskId}, reloading from store to get final state`,
            );
            const reloadedTask = await taskStoreForHandler.load(taskId);
            if (reloadedTask) {
              finalResult = reloadedTask;
              logger.info(
                `[CoreAgent] Reloaded task ${taskId}: state=${reloadedTask.status?.state}, artifacts length=${reloadedTask.artifacts?.length}`,
              );
            }
          }

          const content =
            isTask(finalResult) && finalResult.history
              ? finalResult.history
                  .filter((m: Message): m is Message => m.role === 'agent')
                  .map((m: Message): string =>
                    m.parts
                      .filter((p: Part): p is TextPart => p.kind === 'text')
                      .map((p: TextPart) => p.text)
                      .join(''),
                  )
                  .join('')
              : '';

          const response = {
            id: `chatcmpl-${messageId}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: model || 'qflow',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content,
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0,
            },
          };

          res.json(response);
          return;
        }
      } catch (error) {
        logger.error('[CoreAgent] Error in /chat/completions:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
          error: {
            message: errorMessage,
            type: 'server_error',
          },
        });
        return;
      }
    });

    return expressApp;
  } catch (error) {
    logger.error('[CoreAgent] Error during startup:', error);
    process.exit(1);
  }
}

export async function main() {
  try {
    const expressApp = await createApp();
    const port = process.env['CODER_AGENT_PORT'] || 41242;

    const server = expressApp.listen(port, () => {
      const address = server.address();
      let actualPort;
      if (process.env['CODER_AGENT_PORT']) {
        actualPort = process.env['CODER_AGENT_PORT'];
      } else if (address && typeof address === 'string') {
        actualPort = port;
      } else if (address && typeof address !== 'string') {
        actualPort = address.port;
      } else {
        actualPort = port;
      }
      updateCoderAgentCardUrl(Number(actualPort));
      logger.info(
        `[CoreAgent] Agent Server started on http://localhost:${actualPort}`,
      );
      logger.info(
        `[CoreAgent] Agent Card: http://localhost:${actualPort}/.well-known/agent-card.json`,
      );
      logger.info('[CoreAgent] Press Ctrl+C to stop the server');
    });
  } catch (error) {
    logger.error('[CoreAgent] Error during startup:', error);
    process.exit(1);
  }
}
