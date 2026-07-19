import { describe, test, expect } from 'vitest';


import { calculateTopicPriority } from '../../src/engines/planner/priority';
import type { RoadmapItem } from '../../src/types';

function baseItem(): RoadmapItem {
  return {
    id: 'r1',
    roadmapId: 'road1',
    parentId: null,
    title: 'Sample Topic',
    difficulty: 'Medium',
    estimatedHours: 2,
    prerequisites: [],
    resources: [],
    practiceQuestions: [],
    interviewQuestions: [],
    revisionFrequency: 'Weekly',
    completionState: 'Not Started',
    orderIndex: 0,
    confidenceScore: 3,
    weaknessScore: 0,
    mistakeCount: 0,
    interviewReadiness: 0,
    lastStudied: undefined,
    revisionCount: 0,
    quizScore: undefined,
  };
}

describe('calculateTopicPriority', () => {
  test('returns number between 0 and 100', () => {
    const item = baseItem();
    const score = calculateTopicPriority({ ...item, weaknessScore: 50 }, 10, 3);
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('higher weakness increases priority', () => {
    const low = calculateTopicPriority({ ...baseItem(), weaknessScore: 20 }, 15, 3);
    const high = calculateTopicPriority({ ...baseItem(), weaknessScore: 80 }, 15, 3);
    expect(high).toBeGreaterThan(low);
  });

  test('closer interview date yields higher priority', () => {
    const far = calculateTopicPriority(baseItem(), 30, 3);
    const near = calculateTopicPriority(baseItem(), 2, 3);
    expect(near).toBeGreaterThan(far);
  });
});
