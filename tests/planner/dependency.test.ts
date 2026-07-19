
import { describe, test, expect } from 'vitest';
import {
  getBlockedTopics,
  getEligibleTopics,
  validateRoadmapDependencies,
  detectCircularDependencies,
} from '../../src/engines/planner/dependency';
import type { RoadmapItem } from '../../src/types';

function makeItem(overrides: Partial<RoadmapItem> = {}): RoadmapItem {
  return {
    id: overrides.id ?? 'item1',
    roadmapId: overrides.roadmapId ?? 'road1',
    parentId: overrides.parentId ?? null,
    title: overrides.title ?? 'Sample',
    difficulty: overrides.difficulty ?? 'Easy',
    estimatedHours: overrides.estimatedHours ?? 1,
    prerequisites: overrides.prerequisites ?? [],
    resources: [],
    practiceQuestions: [],
    interviewQuestions: [],
    revisionFrequency: 'Weekly',
    completionState: overrides.completionState ?? 'Not Started',
    orderIndex: overrides.orderIndex ?? 0,
    lastStudied: undefined,
    revisionCount: 0,
    quizScore: undefined,
    confidenceScore: 0,
    weaknessScore: 0,
    mistakeCount: 0,
    interviewReadiness: 0,
    ...overrides,
  } as RoadmapItem;
}

describe('Dependency Engine', () => {
  test('empty roadmap', () => {
    const items: RoadmapItem[] = [];
    expect(getEligibleTopics(items)).toEqual([]);
    expect(getBlockedTopics(items)).toEqual([]);
    const validation = validateRoadmapDependencies(items);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Roadmap is empty');
    expect(detectCircularDependencies(items)).toEqual([]);
  });

  test('single node without prerequisites', () => {
    const item = makeItem({ id: 'a' });
    const items = [item];
    expect(getEligibleTopics(items)).toEqual([item]);
    expect(getBlockedTopics(items)).toEqual([]);
    const validation = validateRoadmapDependencies(items);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(detectCircularDependencies(items)).toEqual([]);
  });

  test('simple dependency satisfied', () => {
    const prereq = makeItem({ id: 'b', completionState: 'Completed' });
    const dependent = makeItem({ id: 'a', prerequisites: ['b'] });
    const items = [prereq, dependent];
    expect(getEligibleTopics(items)).toContainEqual(dependent);
    expect(getBlockedTopics(items)).toEqual([]);
    const validation = validateRoadmapDependencies(items);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    const cycles = detectCircularDependencies(items);
    expect(cycles).toEqual([]);
  });

  test('simple dependency blocked', () => {
    const prereq = makeItem({ id: 'b' }); // not completed
    const dependent = makeItem({ id: 'a', prerequisites: ['b'] });
    const items = [prereq, dependent];
    expect(getEligibleTopics(items)).not.toContainEqual(dependent);
    const blocked = getBlockedTopics(items);
    expect(blocked).toHaveLength(1);
    expect(blocked[0].itemId).toBe('a');
    expect(blocked[0].missingPrerequisites).toContain('b');
    const validation = validateRoadmapDependencies(items);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  test('multiple prerequisites', () => {
    const p1 = makeItem({ id: 'p1', completionState: 'Completed' });
    const p2 = makeItem({ id: 'p2', completionState: 'Completed' });
    const target = makeItem({ id: 't', prerequisites: ['p1', 'p2'] });
    const items = [p1, p2, target];
    expect(getEligibleTopics(items)).toContainEqual(target);
    expect(getBlockedTopics(items)).toEqual([]);
  });

  test('missing prerequisite detection', () => {
    const item = makeItem({ id: 'a', prerequisites: ['missing'] });
    const items = [item];
    const validation = validateRoadmapDependencies(items);
    expect(validation.valid).toBe(false);
    expect(validation.missingPrerequisites?.[0].itemId).toBe('a');
    expect(validation.missingPrerequisites?.[0].missing).toContain('missing');
  });

  test('duplicate prerequisite detection', () => {
    const item = makeItem({ id: 'a', prerequisites: ['b', 'b'] });
    const prereq = makeItem({ id: 'b' });
    const items = [item, prereq];
    const validation = validateRoadmapDependencies(items);
    expect(validation.valid).toBe(false);
    expect(validation.duplicatePrerequisites?.[0].itemId).toBe('a');
    expect(validation.duplicatePrerequisites?.[0].duplicates).toContain('b');
  });

  test('self dependency detection', () => {
    const item = makeItem({ id: 'a', prerequisites: ['a'] });
    const items = [item];
    const validation = validateRoadmapDependencies(items);
    expect(validation.valid).toBe(false);
    expect(validation.selfDependencies).toContain('a');
  });

  test('circular dependency detection', () => {
    const a = makeItem({ id: 'a', prerequisites: ['b'] });
    const b = makeItem({ id: 'b', prerequisites: ['a'] });
    const items = [a, b];
    const cycles = detectCircularDependencies(items);
    expect(cycles.length).toBeGreaterThan(0);
    const validation = validateRoadmapDependencies(items);
    expect(validation.valid).toBe(false);
    expect(validation.circularDependencies?.length).toBeGreaterThan(0);
  });

  test('multiple cycles detection', () => {
    const a = makeItem({ id: 'a', prerequisites: ['b'] });
    const b = makeItem({ id: 'b', prerequisites: ['a'] });
    const c = makeItem({ id: 'c', prerequisites: ['d'] });
    const d = makeItem({ id: 'd', prerequisites: ['c'] });
    const items = [a, b, c, d];
    const cycles = detectCircularDependencies(items);
    expect(cycles.length).toBe(2);
  });

  test('topological sort respects dependencies', () => {
    const a = makeItem({ id: 'a' });
    const b = makeItem({ id: 'b', prerequisites: ['a'] });
    const c = makeItem({ id: 'c', prerequisites: ['b'] });
    const items = [c, a, b];
    const aCompleted = { ...a, completionState: 'Completed' } as RoadmapItem;
    const bCompleted = { ...b, completionState: 'Completed' } as RoadmapItem;
    const itemsStep1 = [aCompleted, b, c];
    expect(getEligibleTopics(itemsStep1).map(i => i.id)).toContain('b');
    const itemsStep2 = [aCompleted, bCompleted, c];
    expect(getEligibleTopics(itemsStep2).map(i => i.id)).toContain('c');
  });
});
