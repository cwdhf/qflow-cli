/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { ToolInvocation } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { PartListUnion } from '@google/genai';
import type { Config } from '../config/config.js';
import { nanoid } from 'nanoid';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Storage } from '../config/storage.js';

export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'abandoned';

export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['doing', 'abandoned'],
  doing: ['todo', 'blocked', 'done', 'abandoned'],
  blocked: ['todo', 'doing', 'abandoned'],
  done: ['todo', 'abandoned', 'blocked'],
  abandoned: ['todo'],
};

export type TaskPriority = 1 | 2 | 3 | 4 | 5;

export type TaskPriorityString =
  | 'low'
  | 'medium'
  | 'high'
  | 'very-high'
  | 'critical';

const PRIORITY_MAP: Record<TaskPriorityString, TaskPriority> = {
  low: 5,
  medium: 4,
  high: 3,
  'very-high': 2,
  critical: 1,
};

function parsePriority(
  priority: TaskPriority | TaskPriorityString | undefined,
): TaskPriority | undefined {
  if (priority === undefined) return undefined;
  if (typeof priority === 'number') return priority;
  return PRIORITY_MAP[priority.toLowerCase() as TaskPriorityString];
}

export type TaskEffort = 'low' | 'medium' | 'high';

export interface TaskMetadata {
  files?: string[];
  functions?: string[];
  risks?: string[];
  blockedReason?: string;
  tags?: string[];
  subtasks?: Subtask[];
  [key: string]: unknown;
}

export interface Subtask {
  id: string;
  content: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  startedAt?: string;
  timeSpent?: number;
  notes?: string;
}

export interface Task {
  id: string;
  content: string;
  status: TaskStatus;
  priority: TaskPriority;
  linkedThought?: number;
  metadata: TaskMetadata;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  dependsOn?: string[];
  estimate?: number;
  effort?: TaskEffort;
  focusFiles?: string[];
  notes?: string;
  startedAt?: string;
  timeSpent?: number;
  specId?: string;
}

export type ManageAction =
  | 'add'
  | 'add_batch'
  | 'add_subtask'
  | 'update'
  | 'delete'
  | 'get'
  | 'complete'
  | 'do'
  | 'complete_batch'
  | 'complete_subtask'
  | 'block'
  | 'start'
  | 'reopen'
  | 'abandon'
  | 'list'
  | 'clear';

export interface ManageTaskInput {
  action: ManageAction;
  taskId?: string;
  id?: string;
  task_id?: string;
  task?: string;
  taskIds?: string[];
  content?: string;
  priority?: TaskPriority | TaskPriorityString;
  linkedThought?: number;
  metadata?: Partial<TaskMetadata>;
  reason?: string;
  dependsOn?: string[];
  estimate?: number;
  effort?: TaskEffort;
  focusFiles?: string[];
  notes?: string;
  tasks?: BatchTaskInput[];
  subtaskIndex?: number;
}

export interface BatchTaskInput {
  content: string;
  priority?: TaskPriority | TaskPriorityString;
  linkedThought?: number;
  dependsOn?: string[];
  estimate?: number;
  effort?: TaskEffort;
  metadata?: Partial<TaskMetadata>;
  focusFiles?: string[];
  notes?: string;
}

export interface ManageTaskResult {
  status: 'success' | 'error';
  llmContent: PartListUnion;
  returnDisplay: string;
  task?: Task;
  tasks?: Task[];
  errorMessage?: string;
  systemAdvice?: string;
}

export interface TaskBoardInput {
  filterByStatus?: TaskStatus[];
  filterByThought?: number;
  filterByTags?: string[];
  filterByContent?: string;
  showCompleted?: boolean;
}

export interface TaskBoardResult {
  tasks: Task[];
  taskCount: number;
  llmContent: PartListUnion;
  returnDisplay: string;
  stats: {
    todo: number;
    doing: number;
    blocked: number;
    done: number;
    abandoned: number;
  };
  systemAdvice?: string;
}

const TASK_LIMITS = {
  maxContentLength: 5000,
  idLength: 10,
};

class TaskManagerService {
  private tasks: Task[] = [];

  constructor() {
    this.loadTasks();
  }

  private loadTasks(): void {
    try {
      const filePath = Storage.getTasksFilePath();
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        this.tasks = JSON.parse(data);
      }
    } catch {
      this.tasks = [];
    }
  }

  private saveTasks(): void {
    try {
      const filePath = Storage.getTasksFilePath();
      const data = JSON.stringify(this.tasks, null, 2);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, data, 'utf8');
    } catch {
      console.error('Failed to save tasks');
    }
  }

  private generateId(): string {
    return nanoid(TASK_LIMITS.idLength);
  }

  private getTask(taskId: string): Task | undefined {
    return this.tasks.find((t) => t.id === taskId);
  }

  private isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  async manageTask(input: ManageTaskInput): Promise<ManageTaskResult> {
    const {
      action,
      taskId,
      id,
      content,
      task,
      priority,
      linkedThought,
      metadata,
      reason,
      dependsOn,
      estimate,
      effort,
      tasks: batchTasks,
      focusFiles,
      notes,
      taskIds,
      subtaskIndex,
    } = input;

    const resolvedTaskId = taskId ?? id;
    const resolvedContent = content ?? task;

    try {
      switch (action) {
        case 'add':
          return await this.addTask(
            resolvedContent!,
            parsePriority(priority),
            linkedThought,
            metadata,
            dependsOn,
            estimate,
            effort,
            focusFiles,
            notes,
          );
        case 'add_batch':
          return await this.addBatch(batchTasks || []);
        case 'add_subtask':
          return await this.addSubtask(
            resolvedTaskId!,
            resolvedContent!,
            parsePriority(priority),
            notes,
          );
        case 'update':
          return await this.updateTask(
            resolvedTaskId!,
            resolvedContent,
            parsePriority(priority),
            linkedThought,
            metadata,
            dependsOn,
            estimate,
            effort,
            focusFiles,
            notes,
          );
        case 'delete':
          return await this.deleteTask(resolvedTaskId!);
        case 'get':
          return await this.getTaskDetail(resolvedTaskId!);
        case 'complete':
          return await this.changeStatus(resolvedTaskId!, 'done');
        case 'do':
          return await this.doTask(resolvedTaskId!);
        case 'complete_batch':
          return await this.completeBatch(taskIds || []);
        case 'complete_subtask':
          return await this.completeSubtask(resolvedTaskId!, subtaskIndex!);
        case 'block':
          return await this.changeStatus(resolvedTaskId!, 'blocked', reason);
        case 'start':
          return await this.startTask(resolvedTaskId!, focusFiles);
        case 'reopen':
          return await this.changeStatus(resolvedTaskId!, 'todo');
        case 'abandon':
          return await this.changeStatus(resolvedTaskId!, 'abandoned');
        case 'list':
          return await this.listTasks();
        case 'clear':
          return await this.clearTasks();
        default:
          return this.createErrorResult(`Unknown action: ${action}`);
      }
    } catch (err) {
      return this.createErrorResult(
        err instanceof Error ? err.message : 'Unknown error',
      );
    }
  }

  private createErrorResult(message: string): ManageTaskResult {
    return {
      status: 'error',
      llmContent: `Error: ${message}`,
      returnDisplay: 'Error',
      errorMessage: message,
    };
  }

  private createSuccessResult(task: Task, advice?: string): ManageTaskResult {
    return {
      status: 'success',
      llmContent: `Task ${task.id}: ${task.content}`,
      returnDisplay: `Task ${task.id} - ${task.status}`,
      task,
      systemAdvice: advice,
    };
  }

  private async addTask(
    content: string,
    priority?: TaskPriority,
    linkedThought?: number,
    metadata?: Partial<TaskMetadata>,
    dependsOn?: string[],
    estimate?: number,
    effort?: TaskEffort,
    focusFiles?: string[],
    notes?: string,
  ): Promise<ManageTaskResult> {
    if (!content?.trim()) {
      return this.createErrorResult('Task content cannot be empty');
    }
    if (content.length > TASK_LIMITS.maxContentLength) {
      return this.createErrorResult(
        `Content too long (${content.length}/${TASK_LIMITS.maxContentLength})`,
      );
    }

    const task: Task = {
      id: this.generateId(),
      content: content.trim(),
      status: 'todo',
      priority: priority ?? 3,
      linkedThought,
      metadata: metadata ?? {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dependsOn,
      estimate,
      effort,
      focusFiles,
      notes,
    };

    this.tasks.push(task);
    this.saveTasks();
    return this.createSuccessResult(task, this.generateAdvice());
  }

  private async addBatch(
    tasksInput: BatchTaskInput[],
  ): Promise<ManageTaskResult> {
    if (!tasksInput.length) {
      return this.createErrorResult('Batch cannot be empty');
    }

    for (const input of tasksInput) {
      if (!input.content?.trim()) {
        return this.createErrorResult('Batch contains task with empty content');
      }
    }

    const preparedTasks: Task[] = [];

    for (const input of tasksInput) {
      preparedTasks.push({
        id: this.generateId(),
        content: input.content?.trim() ?? '',
        status: 'todo',
        priority: parsePriority(input.priority) ?? 3,
        linkedThought: input.linkedThought,
        metadata: input.metadata ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dependsOn: input.dependsOn,
        estimate: input.estimate,
        effort: input.effort,
        focusFiles: input.focusFiles,
        notes: input.notes,
      });
    }

    for (const task of preparedTasks) {
      this.tasks.push(task);
    }

    this.saveTasks();
    return {
      status: 'success',
      llmContent: `Added ${preparedTasks.length} tasks`,
      returnDisplay: `Added ${preparedTasks.length} tasks`,
      tasks: preparedTasks,
      systemAdvice: this.generateAdvice(),
    };
  }

  private async updateTask(
    taskId: string,
    content?: string,
    priority?: TaskPriority,
    linkedThought?: number,
    metadata?: Partial<TaskMetadata>,
    dependsOn?: string[],
    estimate?: number,
    effort?: TaskEffort,
    focusFiles?: string[],
    notes?: string,
  ): Promise<ManageTaskResult> {
    const task = this.getTask(taskId);
    if (!task) {
      return this.createErrorResult(`Task not found: ${taskId}`);
    }

    if (content) task.content = content.trim();
    if (priority !== undefined) task.priority = priority;
    if (linkedThought !== undefined) task.linkedThought = linkedThought;
    if (metadata) task.metadata = { ...task.metadata, ...metadata };
    if (dependsOn !== undefined) task.dependsOn = dependsOn;
    if (estimate !== undefined) task.estimate = estimate;
    if (effort !== undefined) task.effort = effort;
    if (focusFiles !== undefined) task.focusFiles = focusFiles;
    if (notes !== undefined) task.notes = notes;

    task.updatedAt = new Date().toISOString();

    this.saveTasks();
    return this.createSuccessResult(task, this.generateAdvice());
  }

  private async deleteTask(taskId: string): Promise<ManageTaskResult> {
    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) {
      return this.createErrorResult(`Task not found: ${taskId}`);
    }

    this.tasks.splice(index, 1);
    this.saveTasks();
    return {
      status: 'success',
      llmContent: `Deleted task ${taskId}`,
      returnDisplay: `Deleted task ${taskId}`,
      systemAdvice: this.generateAdvice(),
    };
  }

  private async getTaskDetail(taskId: string): Promise<ManageTaskResult> {
    const task = this.getTask(taskId);
    if (!task) {
      return this.createErrorResult(`Task not found: ${taskId}`);
    }

    return {
      status: 'success',
      llmContent: `Task ${task.id}: ${task.content}`,
      returnDisplay: `Task ${task.id} - ${task.status}`,
      task,
    };
  }

  private async listTasks(): Promise<ManageTaskResult> {
    if (this.tasks.length === 0) {
      return {
        status: 'success',
        llmContent: 'No tasks found',
        returnDisplay: 'No tasks',
        tasks: [],
      };
    }

    const sortedTasks = [...this.tasks].sort((a, b) => {
      if (a.status !== b.status) {
        const statusOrder: Record<TaskStatus, number> = {
          todo: 0,
          doing: 1,
          blocked: 2,
          done: 3,
          abandoned: 4,
        };
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return a.priority - b.priority;
    });

    const taskList = sortedTasks
      .map((t) => {
        let taskLine = `- [${t.status.toUpperCase()}] ${t.id}: ${t.content} (priority: ${t.priority})`;
        if (t.metadata.subtasks && t.metadata.subtasks.length > 0) {
          const subtaskLines = t.metadata.subtasks
            .map(
              (st) =>
                `  - [${st.status.toUpperCase()}] ${st.id}: ${st.content} (priority: ${st.priority})`,
            )
            .join('\n');
          taskLine += '\n' + subtaskLines;
        }
        return taskLine;
      })
      .join('\n');

    return {
      status: 'success',
      llmContent: taskList,
      returnDisplay: `${this.tasks.length} tasks`,
      tasks: sortedTasks,
    };
  }

  private async clearTasks(): Promise<ManageTaskResult> {
    const count = this.tasks.length;
    this.tasks = [];
    this.saveTasks();
    return {
      status: 'success',
      llmContent: `Cleared ${count} tasks`,
      returnDisplay: `Cleared ${count} tasks`,
      systemAdvice: 'All tasks have been cleared.',
    };
  }

  private async changeStatus(
    taskId: string,
    newStatus: TaskStatus,
    reason?: string,
  ): Promise<ManageTaskResult> {
    const task = this.getTask(taskId);
    if (!task) {
      return this.createErrorResult(`Task not found: ${taskId}`);
    }

    if (!this.isValidTransition(task.status, newStatus)) {
      return this.createErrorResult(
        `Invalid transition: ${task.status} → ${newStatus}`,
      );
    }

    if (
      newStatus === 'done' &&
      task.metadata.subtasks &&
      task.metadata.subtasks.length > 0
    ) {
      const incompleteSubtasks = task.metadata.subtasks.filter(
        (st) => st.status !== 'done',
      );
      if (incompleteSubtasks.length > 0) {
        return this.createErrorResult(
          `Cannot complete task with ${incompleteSubtasks.length} incomplete subtask(s). ` +
            `Please complete all subtasks first.`,
        );
      }
    }

    task.status = newStatus;
    task.updatedAt = new Date().toISOString();

    if (newStatus === 'done') {
      task.completedAt = new Date().toISOString();
      task.timeSpent = task.startedAt
        ? Math.floor((Date.now() - new Date(task.startedAt).getTime()) / 60000)
        : undefined;
    }

    if (newStatus === 'blocked' && reason) {
      task.metadata.blockedReason = reason;
    }

    this.saveTasks();
    return this.createSuccessResult(task, this.generateAdvice());
  }

  private async doTask(taskId: string): Promise<ManageTaskResult> {
    const doingCount = this.tasks.filter((t) => t.status === 'doing').length;
    if (doingCount >= 10) {
      return this.createErrorResult(
        'WIP limit reached (10 tasks in doing). Complete or block some first.',
      );
    }
    return this.changeStatus(taskId, 'doing');
  }

  private async startTask(
    taskId: string,
    focusFiles?: string[],
  ): Promise<ManageTaskResult> {
    const task = this.getTask(taskId);
    if (!task) {
      return this.createErrorResult(`Task not found: ${taskId}`);
    }

    if (focusFiles) {
      task.focusFiles = focusFiles;
    }
    task.startedAt = new Date().toISOString();

    return this.changeStatus(taskId, 'doing');
  }

  private async completeBatch(taskIds: string[]): Promise<ManageTaskResult> {
    if (!taskIds.length) {
      return this.createErrorResult('No task IDs provided');
    }

    const completed: Task[] = [];

    for (const taskId of taskIds) {
      const task = this.getTask(taskId);
      if (task) {
        const result = await this.changeStatus(taskId, 'done');
        if (result.status === 'success' && result.task) {
          completed.push(result.task);
        }
      }
    }

    return {
      status: 'success',
      llmContent: `Completed ${completed.length} tasks`,
      returnDisplay: `Completed ${completed.length} tasks`,
      tasks: completed,
      systemAdvice: this.generateAdvice(),
    };
  }

  private async addSubtask(
    taskId: string,
    content: string,
    priority?: TaskPriority,
    notes?: string,
  ): Promise<ManageTaskResult> {
    const task = this.getTask(taskId);
    if (!task) {
      return this.createErrorResult(`Task not found: ${taskId}`);
    }

    if (!content?.trim()) {
      return this.createErrorResult('Subtask content cannot be empty');
    }
    if (content.length > TASK_LIMITS.maxContentLength) {
      return this.createErrorResult(
        `Content too long (${content.length}/${TASK_LIMITS.maxContentLength})`,
      );
    }

    const subtask: Subtask = {
      id: this.generateId(),
      content: content.trim(),
      status: 'todo',
      priority: priority ?? 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes,
    };

    if (!task.metadata.subtasks) {
      task.metadata.subtasks = [];
    }
    task.metadata.subtasks.push(subtask);
    task.updatedAt = new Date().toISOString();

    this.saveTasks();
    return this.createSuccessResult(task, this.generateAdvice());
  }

  private async completeSubtask(
    taskId: string,
    subtaskIndex: number,
  ): Promise<ManageTaskResult> {
    const task = this.getTask(taskId);
    if (!task) {
      return this.createErrorResult(`Task not found: ${taskId}`);
    }

    const subtasks = task.metadata.subtasks || [];
    if (subtaskIndex < 0 || subtaskIndex >= subtasks.length) {
      return this.createErrorResult(`Invalid subtask index: ${subtaskIndex}`);
    }

    subtasks[subtaskIndex].status = 'done';
    subtasks[subtaskIndex].completedAt = new Date().toISOString();
    subtasks[subtaskIndex].updatedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();

    const allDone = subtasks.every((st) => st.status === 'done');
    if (allDone && task.status === 'doing') {
      return this.changeStatus(taskId, 'done');
    }

    this.saveTasks();
    return this.createSuccessResult(task, this.generateAdvice());
  }

  private getStats(): TaskBoardResult['stats'] {
    return {
      todo: this.tasks.filter((t) => t.status === 'todo').length,
      doing: this.tasks.filter((t) => t.status === 'doing').length,
      blocked: this.tasks.filter((t) => t.status === 'blocked').length,
      done: this.tasks.filter((t) => t.status === 'done').length,
      abandoned: this.tasks.filter((t) => t.status === 'abandoned').length,
    };
  }

  getTaskBoard(input: TaskBoardInput = {}): TaskBoardResult {
    const {
      filterByStatus,
      filterByThought,
      filterByTags,
      filterByContent,
      showCompleted = true,
    } = input;

    let filteredTasks = [...this.tasks];

    if (filterByStatus?.length) {
      filteredTasks = filteredTasks.filter((t) =>
        filterByStatus.includes(t.status),
      );
    }

    if (filterByThought !== undefined) {
      filteredTasks = filteredTasks.filter(
        (t) => t.linkedThought === filterByThought,
      );
    }

    if (filterByTags?.length) {
      filteredTasks = filteredTasks.filter((t) => {
        const tags = t.metadata.tags || [];
        return filterByTags.some((tag) => tags.includes(tag));
      });
    }

    if (filterByContent) {
      const search = filterByContent.toLowerCase();
      filteredTasks = filteredTasks.filter((t) =>
        t.content.toLowerCase().includes(search),
      );
    }

    if (!showCompleted) {
      filteredTasks = filteredTasks.filter(
        (t) => t.status !== 'done' && t.status !== 'abandoned',
      );
    }

    const stats = this.getStats();

    return {
      tasks: filteredTasks,
      taskCount: filteredTasks.length,
      llmContent: `Found ${filteredTasks.length} tasks`,
      returnDisplay: `Task Board (${filteredTasks.length} tasks)`,
      stats,
      systemAdvice: this.generateAdvice(),
    };
  }

  private generateAdvice(): string {
    const doingCount = this.tasks.filter((t) => t.status === 'doing').length;
    const blockedCount = this.tasks.filter(
      (t) => t.status === 'blocked',
    ).length;
    const todoCount = this.tasks.filter((t) => t.status === 'todo').length;

    const advice: string[] = [];

    if (doingCount > 5) {
      advice.push(
        'Consider completing or blocking some doing tasks before starting new ones.',
      );
    }

    if (blockedCount > 0) {
      advice.push(
        `You have ${blockedCount} blocked task(s). Try to unblock them or abandon if no longer needed.`,
      );
    }

    if (todoCount > 10) {
      advice.push(
        'Many pending tasks. Consider prioritizing or archiving old tasks.',
      );
    }

    return advice.length > 0 ? advice.join(' ') : 'Keep up the good work!';
  }

  getAllTasks(): Task[] {
    return [...this.tasks];
  }
}

class TaskManageInvocation extends BaseToolInvocation<
  ManageTaskInput,
  ManageTaskResult
> {
  constructor(
    params: ManageTaskInput,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  override getDescription(): string {
    const params = this.params;
    const taskId = params.taskId ?? params.id;
    const content = params.content ?? params.task;
    const actionDescriptions: Record<ManageAction, string> = {
      add: `Add task: "${(content || '').substring(0, 30)}..."`,
      add_batch: `Add ${(params.tasks || []).length} tasks`,
      add_subtask: `Add subtask to task: ${taskId}`,
      update: `Update task: ${taskId}`,
      delete: `Delete task: ${taskId}`,
      get: `Get task: ${taskId}`,
      complete: `Complete task: ${taskId}`,
      do: `Start task: ${taskId}`,
      complete_batch: `Complete ${(params.taskIds || []).length} tasks`,
      complete_subtask: `Complete subtask ${params.subtaskIndex} of task ${taskId}`,
      block: `Block task: ${taskId}`,
      start: `Start task: ${taskId}`,
      reopen: `Reopen task: ${taskId}`,
      abandon: `Abandon task: ${taskId}`,
      list: 'List all tasks',
      clear: 'Clear all tasks',
    };
    return actionDescriptions[params.action] || `Task: ${params.action}`;
  }

  async execute(_signal: AbortSignal): Promise<ManageTaskResult> {
    const service = new TaskManagerService();
    return service.manageTask(this.params);
  }
}

class TaskBoardInvocation extends BaseToolInvocation<
  TaskBoardInput,
  TaskBoardResult
> {
  constructor(
    params: TaskBoardInput,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  override getDescription(): string {
    return 'View task board';
  }

  async execute(_signal: AbortSignal): Promise<TaskBoardResult> {
    const service = new TaskManagerService();
    return service.getTaskBoard(this.params);
  }
}

export { TaskManagerService };

export class TaskManagerTool extends BaseDeclarativeTool<
  ManageTaskInput,
  ManageTaskResult
> {
  static readonly Name = 'task_manager';

  constructor(_config: Config, messageBus?: MessageBus) {
    super(
      TaskManagerTool.Name,
      'TaskManager',
      `专业任务管理工具，适合需要长期跟踪、复杂状态流转和多步骤协作的项目。

      ## 持久化存储
      
      任务数据保存在 \`~/.qflow/tasks.json\` 文件中，会在多次调用之间保持状态。
      使用 \`clear\` action 可以清理所有任务。

      ## 何时使用 TaskManager vs WriteTodos

      **使用 TaskManager 的场景：**
      - 需要跟踪任务进度和状态流转（todo → doing → done）
      - 项目周期较长，需要持久化任务状态
      - 需要任务优先级、预估工时、依赖关系等元数据
      - 需要批量操作多个任务
      - 需要阻止（block）和恢复任务

      **使用 WriteTodos 的场景：**
      - 简单的单次任务列表
      - 快速头脑风暴或临时记录
      - 不需要复杂状态管理

      ## 状态流转规则

      - \`todo\` → \`doing\`, \`abandoned\`
      - \`doing\` → \`todo\`, \`blocked\`, \`done\`, \`abandoned\`
      - \`blocked\` → \`todo\`, \`doing\`, \`abandoned\`
      - \`done\` → \`todo\`, \`abandoned\`, \`blocked\` (可重新打开、放弃或阻止)
      - \`abandoned\` → \`todo\` (可恢复)

      ## 最佳实践

      - 开始任务前使用 \`start\` 标记并设置焦点文件
      - 使用 \`blocked\` 时提供原因
      - 批量操作时使用 \`add_batch\` 和 \`complete_batch\`
      - 保持 WIP (Doing 状态) 任务数不超过 10 个`,
      Kind.Other,
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: [
              'add',
              'add_batch',
              'update',
              'delete',
              'get',
              'complete',
              'do',
              'complete_batch',
              'complete_subtask',
              'block',
              'start',
              'reopen',
              'abandon',
              'list',
              'clear',
            ],
          },
          taskId: { type: 'string' },
          id: { type: 'string' },
          task_id: { type: 'string' },
          taskIds: { type: 'array', items: { type: 'string' } },
          content: { type: 'string' },
          task: { type: 'string' },
          priority: {
            oneOf: [
              { type: 'number', enum: [1, 2, 3, 4, 5] },
              {
                type: 'string',
                enum: ['low', 'medium', 'high', 'very-high', 'critical'],
              },
            ],
          },
          linkedThought: { type: 'number' },
          metadata: { type: 'object' },
          reason: { type: 'string' },
          dependsOn: { type: 'array', items: { type: 'string' } },
          estimate: { type: 'number' },
          effort: { type: 'string', enum: ['low', 'medium', 'high'] },
          focusFiles: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                priority: {
                  oneOf: [
                    { type: 'number', enum: [1, 2, 3, 4, 5] },
                    {
                      type: 'string',
                      enum: ['low', 'medium', 'high', 'very-high', 'critical'],
                    },
                  ],
                },
                linkedThought: { type: 'number' },
                dependsOn: { type: 'array', items: { type: 'string' } },
                estimate: { type: 'number' },
                effort: { type: 'string', enum: ['low', 'medium', 'high'] },
                focusFiles: { type: 'array', items: { type: 'string' } },
                notes: { type: 'string' },
                metadata: { type: 'object' },
              },
              required: ['content'],
            },
          },
          subtaskIndex: { type: 'number' },
        },
        required: ['action'],
      },
      true,
      false,
      messageBus,
    );
  }

  protected override validateToolParamValues(
    params: ManageTaskInput,
  ): string | null {
    if (!params.action) {
      return "'action' is required";
    }
    const validActions: ManageAction[] = [
      'add',
      'add_batch',
      'update',
      'delete',
      'get',
      'complete',
      'do',
      'complete_batch',
      'complete_subtask',
      'block',
      'start',
      'reopen',
      'abandon',
      'list',
      'clear',
    ];
    if (!validActions.includes(params.action)) {
      return `Invalid action: ${params.action}`;
    }

    const taskId = params.taskId ?? params.id;
    const content = params.content ?? params.task;

    const needsTaskId = [
      'update',
      'delete',
      'get',
      'complete',
      'do',
      'complete_subtask',
      'block',
      'start',
      'reopen',
      'abandon',
    ];
    if (needsTaskId.includes(params.action) && !taskId) {
      return `'taskId' is required for action: ${params.action}`;
    }

    if (params.action === 'add' && (!content || content.trim() === '')) {
      return "'content' is required for 'add' action";
    }

    return null;
  }

  protected createInvocation(
    params: ManageTaskInput,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<ManageTaskInput, ManageTaskResult> {
    return new TaskManageInvocation(
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}

export class TaskBoardTool extends BaseDeclarativeTool<
  TaskBoardInput,
  TaskBoardResult
> {
  static readonly Name = 'task_board';

  constructor(_config: Config, messageBus?: MessageBus) {
    super(
      TaskBoardTool.Name,
      'TaskBoard',
      '查看任务看板，支持看板视图、列表视图、优先级视图，可按状态、思维、标签等筛选。',
      Kind.Other,
      {
        type: 'object',
        properties: {
          filterByStatus: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['todo', 'doing', 'blocked', 'done', 'abandoned'],
            },
            description: '按状态筛选',
          },
          filterByThought: {
            type: 'number',
            description: '按关联的思维编号筛选',
          },
          filterByTags: {
            type: 'array',
            items: { type: 'string' },
            description: '按标签筛选',
          },
          filterByContent: {
            type: 'string',
            description: '按内容关键词筛选',
          },
          showCompleted: {
            type: 'boolean',
            description: '是否显示已完成的任务',
          },
        },
        required: [],
      },
      true,
      false,
      messageBus,
    );
  }

  protected override validateToolParamValues(
    _params: TaskBoardInput,
  ): string | null {
    return null;
  }

  protected createInvocation(
    params: TaskBoardInput,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<TaskBoardInput, TaskBoardResult> {
    return new TaskBoardInvocation(
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
