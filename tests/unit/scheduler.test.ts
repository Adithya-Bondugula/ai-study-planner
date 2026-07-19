import { describe, it, expect } from 'vitest';
import { scheduleTasksIntoBlocks } from '../../src/engines/planner/scheduler';
import { StudyBlock, Task } from '../../src/types';

describe('scheduleTasksIntoBlocks', () => {
  const mockBlocks: StudyBlock[] = [
    {
      id: 'block-1',
      title: 'Morning Block',
      priority: 'High',
      estHours: 2, // 120 minutes capacity
      orderIndex: 0,
      isCollapsed: false,
      tasks: []
    },
    {
      id: 'block-2',
      title: 'Evening Block',
      priority: 'Medium',
      estHours: 1.5, // 90 minutes capacity
      orderIndex: 1,
      isCollapsed: false,
      tasks: []
    }
  ];

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      blockId: '',
      title: 'High Priority Task 1',
      estDuration: 60,
      priority: 'High',
      difficulty: 'Medium',
      status: 'Todo',
      tags: [],
      attachments: [],
      checklist: [],
      createdAt: new Date().toISOString(),
      progress: 0
    },
    {
      id: 'task-2',
      blockId: '',
      title: 'High Priority Task 2',
      estDuration: 90,
      priority: 'High',
      difficulty: 'Medium',
      status: 'Todo',
      tags: [],
      attachments: [],
      checklist: [],
      createdAt: new Date().toISOString(),
      progress: 0
    },
    {
      id: 'task-3',
      blockId: '',
      title: 'Medium Priority Task 3',
      estDuration: 45,
      priority: 'Medium',
      difficulty: 'Easy',
      status: 'Todo',
      tags: [],
      attachments: [],
      checklist: [],
      createdAt: new Date().toISOString(),
      progress: 0
    }
  ];

  it('should allocate tasks into blocks prioritizing high-priority tasks', () => {
    // 4 hours available (240 minutes)
    const result = scheduleTasksIntoBlocks(4, mockBlocks, mockTasks);

    // block-1 (Morning, 120m limit) should have Task-2 (90m) or Task-1 (60m).
    // The sorting orders High priority tasks first, then by duration descending:
    // Sorted list: Task-2 (High, 90m), Task-1 (High, 60m), Task-3 (Medium, 45m).
    // Fill block-1 (120m limit):
    // - Task-2 fits (90m, remaining block = 30m)
    // - Task-1 does NOT fit (60m > 30m)
    // - Task-3 does NOT fit (45m > 30m)
    // Block-1 has: Task-2
    // Fill block-2 (90m limit):
    // - Task-1 fits (60m, remaining block = 30m)
    // - Task-3 does NOT fit (45m > 30m)
    // Block-2 has: Task-1
    // Unscheduled: Task-3

    expect(result[0].tasks).toHaveLength(1);
    expect(result[0].tasks?.[0].id).toBe('task-2');

    expect(result[1].tasks).toHaveLength(1);
    expect(result[1].tasks?.[0].id).toBe('task-1');
  });

  it('should truncate scheduling when availableHours limit is reached', () => {
    // Only 1 hour (60 minutes) available globally
    const result = scheduleTasksIntoBlocks(1, mockBlocks, mockTasks);

    // Sorted queue: Task-2 (High, 90m), Task-1 (High, 60m)...
    // Task-2: duration is capped to remaining global limit (60m)
    // Task-2 fits in block-1 (60m <= 120m capacity)
    // Remaining global hours = 0. No other tasks can be scheduled.

    const allScheduledTasks = result.flatMap(b => b.tasks || []);
    expect(allScheduledTasks).toHaveLength(1);
    expect(allScheduledTasks[0].id).toBe('task-2');
    expect(allScheduledTasks[0].estDuration).toBe(60); // check truncation
  });
});
