/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { BatchTaskInput } from './task-manager.js';
import { TaskManagerService, VALID_TRANSITIONS } from './task-manager.js';
import * as fs from 'node:fs';
import { Storage } from '../config/storage.js';

describe('TaskManagerService', () => {
  let service: TaskManagerService;

  beforeEach(async () => {
    const filePath = Storage.getTasksFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    service = new TaskManagerService();
  });

  describe('VALID_TRANSITIONS', () => {
    it('should define valid transitions for each status', () => {
      expect(VALID_TRANSITIONS['todo']).toContain('doing');
      expect(VALID_TRANSITIONS['todo']).toContain('abandoned');
      expect(VALID_TRANSITIONS['doing']).toContain('todo');
      expect(VALID_TRANSITIONS['doing']).toContain('blocked');
      expect(VALID_TRANSITIONS['doing']).toContain('done');
      expect(VALID_TRANSITIONS['doing']).toContain('abandoned');
      expect(VALID_TRANSITIONS['blocked']).toContain('todo');
      expect(VALID_TRANSITIONS['blocked']).toContain('doing');
      expect(VALID_TRANSITIONS['blocked']).toContain('abandoned');
      expect(VALID_TRANSITIONS['done']).toContain('todo');
      expect(VALID_TRANSITIONS['abandoned']).toContain('todo');
    });

    it('should not allow blocked to transition to done', () => {
      expect(VALID_TRANSITIONS['blocked']).not.toContain('done');
    });

    it('should not allow done to transition to doing', () => {
      expect(VALID_TRANSITIONS['done']).not.toContain('doing');
    });
  });

  describe('manageTask - add action', () => {
    it('should add a new task with default priority', async () => {
      const result = await service.manageTask({
        action: 'add',
        content: 'Test task content',
      });

      expect(result.status).toBe('success');
      expect(result.task).toBeDefined();
      expect(result.task!.content).toBe('Test task content');
      expect(result.task!.priority).toBe(3);
      expect(result.task!.status).toBe('todo');
    });

    it('should add a task with custom priority', async () => {
      const result = await service.manageTask({
        action: 'add',
        content: 'High priority task',
        priority: 5,
      });

      expect(result.status).toBe('success');
      expect(result.task!.priority).toBe(5);
    });

    it('should add a task with linked thought', async () => {
      const result = await service.manageTask({
        action: 'add',
        content: 'Linked task',
        linkedThought: 42,
      });

      expect(result.status).toBe('success');
      expect(result.task!.linkedThought).toBe(42);
    });

    it('should reject empty content', async () => {
      const result = await service.manageTask({
        action: 'add',
        content: '',
      });

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('empty');
    });

    it('should reject content that is only whitespace', async () => {
      const result = await service.manageTask({
        action: 'add',
        content: '   ',
      });

      expect(result.status).toBe('error');
    });
  });

  describe('manageTask - add_batch action', () => {
    it('should add multiple tasks at once', async () => {
      const tasks: BatchTaskInput[] = [
        { content: 'Batch task 1' },
        { content: 'Batch task 2', priority: 4 },
        { content: 'Batch task 3', linkedThought: 1 },
      ];

      const result = await service.manageTask({
        action: 'add_batch',
        tasks,
      });

      expect(result.status).toBe('success');
      expect(result.tasks).toHaveLength(3);
      expect(result.llmContent).toContain('Added 3 tasks');
    });

    it('should reject empty batch', async () => {
      const result = await service.manageTask({
        action: 'add_batch',
        tasks: [],
      });

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('empty');
    });

    it('should reject batch with empty content', async () => {
      const result = await service.manageTask({
        action: 'add_batch',
        tasks: [{ content: 'Valid task' }, { content: '' }],
      });

      expect(result.status).toBe('error');
    });
  });

  describe('manageTask - status transitions', () => {
    it('should transition from todo to doing', async () => {
      const addResult = await service.manageTask({
        action: 'add',
        content: 'Test task',
      });

      const result = await service.manageTask({
        action: 'do',
        taskId: addResult.task!.id,
      });

      expect(result.status).toBe('success');
      expect(result.task!.status).toBe('doing');
    });

    it('should transition from doing to done', async () => {
      const addResult = await service.manageTask({
        action: 'add',
        content: 'Test task',
      });

      await service.manageTask({ action: 'do', taskId: addResult.task!.id });

      const result = await service.manageTask({
        action: 'complete',
        taskId: addResult.task!.id,
      });

      expect(result.status).toBe('success');
      expect(result.task!.status).toBe('done');
      expect(result.task!.completedAt).toBeDefined();
    });

    it('should transition from doing to blocked', async () => {
      const addResult = await service.manageTask({
        action: 'add',
        content: 'Test task',
      });

      await service.manageTask({ action: 'do', taskId: addResult.task!.id });

      const result = await service.manageTask({
        action: 'block',
        taskId: addResult.task!.id,
        reason: 'Waiting for API',
      });

      expect(result.status).toBe('success');
      expect(result.task!.status).toBe('blocked');
      expect(result.task!.metadata.blockedReason).toBe('Waiting for API');
    });

    it('should transition from blocked to doing', async () => {
      const addResult = await service.manageTask({
        action: 'add',
        content: 'Test task',
      });

      await service.manageTask({ action: 'do', taskId: addResult.task!.id });
      await service.manageTask({ action: 'block', taskId: addResult.task!.id });

      const result = await service.manageTask({
        action: 'do',
        taskId: addResult.task!.id,
      });

      expect(result.status).toBe('success');
      expect(result.task!.status).toBe('doing');
    });

    it('should transition from todo to abandoned', async () => {
      const addResult = await service.manageTask({
        action: 'add',
        content: 'Test task',
      });

      const result = await service.manageTask({
        action: 'abandon',
        taskId: addResult.task!.id,
      });

      expect(result.status).toBe('success');
      expect(result.task!.status).toBe('abandoned');
    });

    it('should transition from abandoned back to todo', async () => {
      const addResult = await service.manageTask({
        action: 'add',
        content: 'Test task',
      });

      await service.manageTask({
        action: 'abandon',
        taskId: addResult.task!.id,
      });

      const result = await service.manageTask({
        action: 'reopen',
        taskId: addResult.task!.id,
      });

      expect(result.status).toBe('success');
      expect(result.task!.status).toBe('todo');
    });

    it('should reject invalid transitions', async () => {
      const addResult = await service.manageTask({
        action: 'add',
        content: 'Test task',
      });

      const result = await service.manageTask({
        action: 'complete',
        taskId: addResult.task!.id,
      });

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('Invalid transition');
    });

    it('should reject blocked to done transition', async () => {
      const addResult = await service.manageTask({
        action: 'add',
        content: 'Test task',
      });

      await service.manageTask({ action: 'do', taskId: addResult.task!.id });
      await service.manageTask({ action: 'block', taskId: addResult.task!.id });

      const result = await service.manageTask({
        action: 'complete',
        taskId: addResult.task!.id,
      });

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('Invalid transition');
    });
  });

  describe('manageTask - update action', () => {
    it('should update task content', async () => {
      const addResult = await service.manageTask({
        action: 'add',
        content: 'Original content',
      });

      const result = await service.manageTask({
        action: 'update',
        taskId: addResult.task!.id,
        content: 'Updated content',
      });

      expect(result.status).toBe('success');
      expect(result.task!.content).toBe('Updated content');
    });

    it('should update task priority', async () => {
      const addResult = await service.manageTask({
        action: 'add',
        content: 'Test task',
        priority: 3,
      });

      const result = await service.manageTask({
        action: 'update',
        taskId: addResult.task!.id,
        priority: 5,
      });

      expect(result.status).toBe('success');
      expect(result.task!.priority).toBe(5);
    });

    it('should return error for non-existent task', async () => {
      const result = await service.manageTask({
        action: 'update',
        taskId: 'non-existent',
        content: 'New content',
      });

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('not found');
    });
  });

  describe('manageTask - clear action', () => {
    it('should clear all tasks', async () => {
      await service.manageTask({ action: 'add', content: 'Task 1' });
      await service.manageTask({ action: 'add', content: 'Task 2' });
      await service.manageTask({ action: 'add', content: 'Task 3' });

      const boardBefore = service.getTaskBoard();
      expect(boardBefore.taskCount).toBe(3);

      const result = await service.manageTask({ action: 'clear' });

      expect(result.status).toBe('success');
      expect(result.llmContent).toContain('Cleared 3 tasks');

      const boardAfter = service.getTaskBoard();
      expect(boardAfter.taskCount).toBe(0);
    });

    it('should handle empty task list when clearing', async () => {
      const result = await service.manageTask({ action: 'clear' });

      expect(result.status).toBe('success');
      expect(result.llmContent).toContain('Cleared 0 tasks');
    });
  });

  describe('manageTask - delete action', () => {
    it('should delete a task', async () => {
      const addResult = await service.manageTask({
        action: 'add',
        content: 'Task to delete',
      });

      const result = await service.manageTask({
        action: 'delete',
        taskId: addResult.task!.id,
      });

      expect(result.status).toBe('success');

      const board = service.getTaskBoard({});
      expect(board.taskCount).toBe(0);
    });
  });

  describe('manageTask - complete_batch action', () => {
    it('should complete multiple tasks', async () => {
      const task1 = await service.manageTask({
        action: 'add',
        content: 'Task 1',
      });

      const task2 = await service.manageTask({
        action: 'add',
        content: 'Task 2',
      });

      const task3 = await service.manageTask({
        action: 'add',
        content: 'Task 3',
      });

      await service.manageTask({ action: 'do', taskId: task1.task!.id });
      await service.manageTask({ action: 'do', taskId: task2.task!.id });
      await service.manageTask({ action: 'do', taskId: task3.task!.id });

      const result = await service.manageTask({
        action: 'complete_batch',
        taskIds: [task1.task!.id, task2.task!.id, task3.task!.id],
      });

      expect(result.status).toBe('success');
      expect(result.llmContent).toContain('Completed 3 tasks');
    });
  });

  describe('manageTask - start action', () => {
    it('should start task with focus files', async () => {
      const addResult = await service.manageTask({
        action: 'add',
        content: 'Test task',
      });

      const result = await service.manageTask({
        action: 'start',
        taskId: addResult.task!.id,
        focusFiles: ['src/index.ts', 'src/utils.ts'],
      });

      expect(result.status).toBe('success');
      expect(result.task!.status).toBe('doing');
      expect(result.task!.focusFiles).toContain('src/index.ts');
      expect(result.task!.startedAt).toBeDefined();
    });
  });

  describe('getTaskBoard', () => {
    beforeEach(async () => {
      await service.manageTask({
        action: 'add',
        content: 'Task 1',
        priority: 2,
      });
      await service.manageTask({
        action: 'add',
        content: 'Task 2',
        priority: 4,
      });
      await service.manageTask({
        action: 'add',
        content: 'Task 3',
        priority: 1,
      });
      await service.manageTask({
        action: 'add',
        content: 'Task 4',
        priority: 3,
      });
    });

    it('should return tasks array', () => {
      const result = service.getTaskBoard();

      expect(result.tasks).toBeDefined();
      expect(Array.isArray(result.tasks)).toBe(true);
      expect(result.taskCount).toBe(4);
    });

    it('should return tasks in todo status by default', () => {
      const result = service.getTaskBoard();

      expect(result.tasks.length).toBe(4);
      expect(result.tasks.every((t) => t.status === 'todo')).toBe(true);
    });

    it('should filter by status', async () => {
      const task = await service.manageTask({
        action: 'add',
        content: 'Doing task',
      });
      await service.manageTask({ action: 'do', taskId: task.task!.id });

      const result = service.getTaskBoard({
        filterByStatus: ['doing'],
      });

      expect(result.taskCount).toBe(1);
      expect(result.tasks[0].content).toBe('Doing task');
    });

    it('should filter by thought number', async () => {
      await service.manageTask({
        action: 'add',
        content: 'Thought 1 task',
        linkedThought: 1,
      });
      await service.manageTask({
        action: 'add',
        content: 'Thought 2 task',
        linkedThought: 2,
      });

      const result = service.getTaskBoard({
        filterByThought: 1,
      });

      expect(result.taskCount).toBe(1);
      expect(result.tasks[0].content).toBe('Thought 1 task');
    });

    it('should filter by content', () => {
      const result = service.getTaskBoard({
        filterByContent: 'Task 1',
      });

      expect(result.taskCount).toBe(1);
      expect(result.tasks[0].content).toBe('Task 1');
    });

    it('should hide completed tasks when showCompleted is false', async () => {
      const task = await service.manageTask({
        action: 'add',
        content: 'Complete me',
      });
      await service.manageTask({ action: 'do', taskId: task.task!.id });
      await service.manageTask({ action: 'complete', taskId: task.task!.id });

      const result = service.getTaskBoard({
        showCompleted: false,
      });

      expect(result.taskCount).toBe(4);
    });

    it('should show correct stats', () => {
      const result = service.getTaskBoard();

      expect(result.stats).toEqual({
        todo: 4,
        doing: 0,
        blocked: 0,
        done: 0,
        abandoned: 0,
      });
    });
  });

  describe('error handling', () => {
    it('should handle unknown action', async () => {
      const result = await service.manageTask({
        action: 'unknown' as
          | 'add'
          | 'add_batch'
          | 'do'
          | 'complete'
          | 'block'
          | 'abandon'
          | 'reopen'
          | 'update'
          | 'clear'
          | 'delete'
          | 'complete_batch'
          | 'start',
        taskId: 'test',
      });

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('Unknown action');
    });

    it('should handle task not found for status change', async () => {
      const result = await service.manageTask({
        action: 'complete',
        taskId: 'non-existent',
      });

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('not found');
    });
  });

  describe('WIP limit', () => {
    it('should reject more than 10 doing tasks', async () => {
      for (let i = 0; i < 10; i++) {
        const addResult = await service.manageTask({
          action: 'add',
          content: `Task ${i}`,
        });
        await service.manageTask({ action: 'do', taskId: addResult.task!.id });
      }

      const addResult = await service.manageTask({
        action: 'add',
        content: 'Task 11',
      });

      const result = await service.manageTask({
        action: 'do',
        taskId: addResult.task!.id,
      });

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('WIP limit');
    });
  });
});
