import { describe, test, expect } from 'vitest';
import {
  identifyCarryOverTasks,
  mergeTasksWithoutDuplicates,
  isTaskNonCarriable,
  CARRY_OVER_ESCALATION_THRESHOLD,
} from '../../src/engines/planner/carryOver';
import type { Task } from '../../src/types';

// ---------------------------------------------------------------------------
// Test fixture factory
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? 'task-1',
    blockId: overrides.blockId ?? 'block-1',
    title: overrides.title ?? 'Sample Task',
    description: overrides.description,
    estDuration: overrides.estDuration ?? 60,
    priority: overrides.priority ?? 'Medium',
    difficulty: overrides.difficulty ?? 'Medium',
    status: overrides.status ?? 'Todo',
    tags: overrides.tags ?? [],
    attachments: overrides.attachments ?? [],
    notes: overrides.notes,
    resources: overrides.resources ?? [],
    roadmapRefId: overrides.roadmapRefId,
    aiSuggestions: overrides.aiSuggestions,
    progress: overrides.progress ?? 0,
    checklist: overrides.checklist ?? [],
    subtasks: overrides.subtasks,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    carryOverCount: overrides.carryOverCount,
    carriedSince: overrides.carriedSince,
    consecutiveCarryOvers: overrides.consecutiveCarryOvers,
  };
}

// ---------------------------------------------------------------------------
// CARRY_OVER_ESCALATION_THRESHOLD export
// ---------------------------------------------------------------------------

describe('CARRY_OVER_ESCALATION_THRESHOLD', () => {
  test('is a positive integer', () => {
    expect(typeof CARRY_OVER_ESCALATION_THRESHOLD).toBe('number');
    expect(CARRY_OVER_ESCALATION_THRESHOLD).toBeGreaterThan(0);
    expect(Number.isInteger(CARRY_OVER_ESCALATION_THRESHOLD)).toBe(true);
  });

  test('equals 3 (the spec-mandated escalation point)', () => {
    expect(CARRY_OVER_ESCALATION_THRESHOLD).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// isTaskNonCarriable helper
// ---------------------------------------------------------------------------

describe('isTaskNonCarriable', () => {
  test('returns true for Completed tasks', () => {
    expect(isTaskNonCarriable(makeTask({ status: 'Completed' }))).toBe(true);
  });

  test('returns true for tasks tagged as archived (case-insensitive)', () => {
    expect(isTaskNonCarriable(makeTask({ tags: ['Archived'] }))).toBe(true);
    expect(isTaskNonCarriable(makeTask({ tags: ['ARCHIVED'] }))).toBe(true);
    expect(isTaskNonCarriable(makeTask({ tags: ['archived'] }))).toBe(true);
  });

  test('returns true for tasks tagged as cancelled (case-insensitive)', () => {
    expect(isTaskNonCarriable(makeTask({ tags: ['cancelled'] }))).toBe(true);
    expect(isTaskNonCarriable(makeTask({ tags: ['Cancelled'] }))).toBe(true);
  });

  test('returns false for Todo tasks', () => {
    expect(isTaskNonCarriable(makeTask({ status: 'Todo' }))).toBe(false);
  });

  test('returns false for In Progress tasks', () => {
    expect(isTaskNonCarriable(makeTask({ status: 'In Progress' }))).toBe(false);
  });

  test('returns false for Backlog tasks', () => {
    expect(isTaskNonCarriable(makeTask({ status: 'Backlog' }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// identifyCarryOverTasks — empty list
// ---------------------------------------------------------------------------

describe('identifyCarryOverTasks — empty input', () => {
  test('returns an empty array when given no tasks', () => {
    const result = identifyCarryOverTasks([]);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// identifyCarryOverTasks — filtering
// ---------------------------------------------------------------------------

describe('identifyCarryOverTasks — filtering terminal-state tasks', () => {
  test('excludes completed tasks', () => {
    const completed = makeTask({ id: 'done', status: 'Completed' });
    const result = identifyCarryOverTasks([completed]);
    expect(result).toHaveLength(0);
  });

  test('excludes tasks tagged archived', () => {
    const archived = makeTask({ id: 'arc', tags: ['archived'] });
    const result = identifyCarryOverTasks([archived]);
    expect(result).toHaveLength(0);
  });

  test('excludes tasks tagged cancelled', () => {
    const cancelled = makeTask({ id: 'can', tags: ['cancelled'] });
    const result = identifyCarryOverTasks([cancelled]);
    expect(result).toHaveLength(0);
  });

  test('includes unfinished tasks (Todo)', () => {
    const todo = makeTask({ id: 'todo', status: 'Todo' });
    const result = identifyCarryOverTasks([todo]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('todo');
  });

  test('includes In Progress tasks', () => {
    const inProgress = makeTask({ id: 'wip', status: 'In Progress' });
    const result = identifyCarryOverTasks([inProgress]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('wip');
  });

  test('includes Backlog tasks', () => {
    const backlog = makeTask({ id: 'bl', status: 'Backlog' });
    const result = identifyCarryOverTasks([backlog]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('bl');
  });

  test('filters mixed list — only unfinished tasks survive', () => {
    const tasks = [
      makeTask({ id: 't1', status: 'Todo' }),
      makeTask({ id: 't2', status: 'Completed' }),
      makeTask({ id: 't3', status: 'In Progress' }),
      makeTask({ id: 't4', tags: ['archived'] }),
      makeTask({ id: 't5', status: 'Backlog' }),
    ];
    const result = identifyCarryOverTasks(tasks);
    expect(result.map(t => t.id)).toEqual(['t1', 't3', 't5']);
  });
});

// ---------------------------------------------------------------------------
// identifyCarryOverTasks — carry-over metadata
// ---------------------------------------------------------------------------

describe('identifyCarryOverTasks — metadata tracking', () => {
  test('sets carryOverCount to 1 on first carry-over', () => {
    const task = makeTask({ status: 'Todo' });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.carryOverCount).toBe(1);
  });

  test('increments carryOverCount on subsequent carry-overs', () => {
    const task = makeTask({ status: 'Todo', carryOverCount: 4 });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.carryOverCount).toBe(5);
  });

  test('sets consecutiveCarryOvers to 1 on first carry-over', () => {
    const task = makeTask({ status: 'Todo' });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.consecutiveCarryOvers).toBe(1);
  });

  test('increments consecutiveCarryOvers on every call', () => {
    const task = makeTask({ status: 'Todo', consecutiveCarryOvers: 2 });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.consecutiveCarryOvers).toBe(3);
  });

  test('sets carriedSince to today when first carried', () => {
    const task = makeTask({ status: 'Todo' });
    const today = new Date().toISOString().split('T')[0];
    const [result] = identifyCarryOverTasks([task]);
    expect(result.carriedSince).toBe(today);
  });

  test('preserves existing carriedSince on subsequent carry-overs', () => {
    const originalDate = '2026-07-10';
    const task = makeTask({ status: 'Todo', carriedSince: originalDate });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.carriedSince).toBe(originalDate);
  });
});

// ---------------------------------------------------------------------------
// identifyCarryOverTasks — priority bumping
// ---------------------------------------------------------------------------

describe('identifyCarryOverTasks — priority bumping', () => {
  test('bumps Low priority to Medium on first carry-over', () => {
    const task = makeTask({ status: 'Todo', priority: 'Low' });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.priority).toBe('Medium');
  });

  test('bumps Medium priority to High on first carry-over', () => {
    const task = makeTask({ status: 'Todo', priority: 'Medium' });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.priority).toBe('High');
  });

  test('keeps High priority at High on first carry-over', () => {
    const task = makeTask({ status: 'Todo', priority: 'High' });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.priority).toBe('High');
  });
});

// ---------------------------------------------------------------------------
// identifyCarryOverTasks — escalation after 3 consecutive days
// ---------------------------------------------------------------------------

describe('identifyCarryOverTasks — escalation after threshold days', () => {
  test('does NOT escalate when consecutiveCarryOvers is below threshold', () => {
    // After this call consecutiveCarryOvers will be 2 (< 3)
    const task = makeTask({ status: 'Todo', priority: 'Low', consecutiveCarryOvers: 1 });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.consecutiveCarryOvers).toBe(2);
    expect(result.priority).toBe('Medium'); // normal bump, not forced High
    expect(result.aiSuggestions).not.toMatch(/escalated to High priority/i);
  });

  test('escalates to High priority when consecutiveCarryOvers reaches threshold', () => {
    // consecutiveCarryOvers will become 3 after this call → escalation
    const task = makeTask({ status: 'Todo', priority: 'Low', consecutiveCarryOvers: 2 });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.consecutiveCarryOvers).toBe(3);
    expect(result.priority).toBe('High');
    expect(result.aiSuggestions).toMatch(/escalated to High priority/i);
  });

  test('escalates even when original priority was already High', () => {
    const task = makeTask({ status: 'Todo', priority: 'High', consecutiveCarryOvers: 2 });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.priority).toBe('High');
    expect(result.aiSuggestions).toMatch(/escalated to High priority/i);
  });

  test('includes consecutive-day count in escalation message', () => {
    const task = makeTask({ status: 'Todo', consecutiveCarryOvers: 4 });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.aiSuggestions).toContain('5'); // 4 + 1
  });

  test('escalation message includes original carriedSince date', () => {
    const originalDate = '2026-07-01';
    const task = makeTask({
      status: 'Todo',
      consecutiveCarryOvers: 2,
      carriedSince: originalDate,
    });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.aiSuggestions).toContain(originalDate);
  });

  test('non-escalated task gets prefix carry-over aiSuggestion', () => {
    const task = makeTask({
      status: 'Todo',
      consecutiveCarryOvers: 0,
      aiSuggestions: 'Study graphs deeply.',
    });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.aiSuggestions).toBe('Carry-over: Study graphs deeply.');
  });

  test('non-escalated task without existing suggestion gets default message', () => {
    const task = makeTask({ status: 'Todo', consecutiveCarryOvers: 0, aiSuggestions: undefined });
    const [result] = identifyCarryOverTasks([task]);
    expect(result.aiSuggestions).toBe('Carry-over from yesterday.');
  });
});

// ---------------------------------------------------------------------------
// identifyCarryOverTasks — immutability
// ---------------------------------------------------------------------------

describe('identifyCarryOverTasks — immutable return values', () => {
  test('does not mutate the input task objects', () => {
    const task = makeTask({ status: 'Todo', priority: 'Low' });
    const originalPriority = task.priority;
    const originalCount = task.carryOverCount;

    identifyCarryOverTasks([task]);

    // Original task should be unchanged
    expect(task.priority).toBe(originalPriority);
    expect(task.carryOverCount).toBe(originalCount);
  });

  test('returned objects are frozen (Object.isFrozen)', () => {
    const task = makeTask({ status: 'Todo' });
    const [result] = identifyCarryOverTasks([task]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  test('mutating returned object throws in strict mode', () => {
    const task = makeTask({ status: 'Todo' });
    const [result] = identifyCarryOverTasks([task]);
    expect(() => {
      // Double-cast through unknown to satisfy strict TS while still exercising
      // the runtime frozen-object constraint.
      (result as unknown as Record<string, unknown>)['priority'] = 'Low';
    }).toThrow();
  });
});

// ---------------------------------------------------------------------------
// identifyCarryOverTasks — multiple carry-over days simulation
// ---------------------------------------------------------------------------

describe('identifyCarryOverTasks — multi-day simulation', () => {
  test('progressively increments metadata across 3 calls', () => {
    let task = makeTask({ status: 'In Progress', priority: 'Low' });

    // Day 1
    [task] = identifyCarryOverTasks([task]) as Task[];
    expect(task.carryOverCount).toBe(1);
    expect(task.consecutiveCarryOvers).toBe(1);
    expect(task.priority).toBe('Medium');

    // Day 2 (task is now unfrozen for test simulation by re-spreading)
    [task] = identifyCarryOverTasks([{ ...task }]) as Task[];
    expect(task.carryOverCount).toBe(2);
    expect(task.consecutiveCarryOvers).toBe(2);
    expect(task.priority).toBe('High');

    // Day 3 — escalation kicks in
    [task] = identifyCarryOverTasks([{ ...task }]) as Task[];
    expect(task.carryOverCount).toBe(3);
    expect(task.consecutiveCarryOvers).toBe(3);
    expect(task.priority).toBe('High');
    expect(task.aiSuggestions).toMatch(/escalated to High priority/i);
  });
});

// ---------------------------------------------------------------------------
// mergeTasksWithoutDuplicates
// ---------------------------------------------------------------------------

describe('mergeTasksWithoutDuplicates', () => {
  test('returns all carry-over tasks when newTasks is empty', () => {
    const carryOver = [makeTask({ id: 'co-1' }), makeTask({ id: 'co-2' })];
    const result = mergeTasksWithoutDuplicates(carryOver, []);
    expect(result.map(t => t.id)).toEqual(['co-1', 'co-2']);
  });

  test('returns all new tasks when carryOver is empty', () => {
    const newTasks = [makeTask({ id: 'n-1' }), makeTask({ id: 'n-2' })];
    const result = mergeTasksWithoutDuplicates([], newTasks);
    expect(result.map(t => t.id)).toEqual(['n-1', 'n-2']);
  });

  test('returns empty array when both inputs are empty', () => {
    expect(mergeTasksWithoutDuplicates([], [])).toEqual([]);
  });

  test('places carry-over tasks before new tasks', () => {
    const carryOver = [makeTask({ id: 'co-1' })];
    const newTasks = [makeTask({ id: 'n-1' })];
    const result = mergeTasksWithoutDuplicates(carryOver, newTasks);
    expect(result[0].id).toBe('co-1');
    expect(result[1].id).toBe('n-1');
  });

  test('drops duplicate IDs — carry-over wins over new tasks', () => {
    const carryTask = makeTask({ id: 'shared', priority: 'High', consecutiveCarryOvers: 2 });
    const newTask = makeTask({ id: 'shared', priority: 'Low', consecutiveCarryOvers: 0 });
    const result = mergeTasksWithoutDuplicates([carryTask], [newTask]);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('High'); // carry-over version kept
  });

  test('does not mutate either input array', () => {
    const carryOver = [makeTask({ id: 'co-1' })];
    const newTasks = [makeTask({ id: 'n-1' })];
    const coLen = carryOver.length;
    const ntLen = newTasks.length;
    mergeTasksWithoutDuplicates(carryOver, newTasks);
    expect(carryOver).toHaveLength(coLen);
    expect(newTasks).toHaveLength(ntLen);
  });

  test('handles large lists without duplicates correctly', () => {
    const carryOver = Array.from({ length: 50 }, (_, i) => makeTask({ id: `co-${i}` }));
    const newTasks = Array.from({ length: 50 }, (_, i) => makeTask({ id: `n-${i}` }));
    const result = mergeTasksWithoutDuplicates(carryOver, newTasks);
    expect(result).toHaveLength(100);
    const ids = new Set(result.map(t => t.id));
    expect(ids.size).toBe(100);
  });

  test('handles list where all new tasks are duplicates', () => {
    const carryOver = [makeTask({ id: 'a' }), makeTask({ id: 'b' })];
    const newTasks = [makeTask({ id: 'a' }), makeTask({ id: 'b' })];
    const result = mergeTasksWithoutDuplicates(carryOver, newTasks);
    expect(result).toHaveLength(2);
  });
});
