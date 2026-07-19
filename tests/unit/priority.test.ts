import { describe, it, expect } from 'vitest';
import { calculateTopicPriority } from '../../src/engines/planner/priority';
import { RoadmapItem } from '../../src/types';

describe('calculateTopicPriority', () => {
  const baseItem: RoadmapItem = {
    id: 'test-item-1',
    roadmapId: 'test-roadmap',
    parentId: null,
    title: 'Test Topic',
    difficulty: 'Medium',
    estimatedHours: 2,
    prerequisites: [],
    resources: [],
    practiceQuestions: [],
    interviewQuestions: [],
    revisionFrequency: 'Weekly',
    completionState: 'In Progress',
    orderIndex: 0,
    revisionCount: 1,
    confidenceScore: 3,
    weaknessScore: 50, // 50% weakness
    mistakeCount: 2,
    interviewReadiness: 50
  };

  it('should calculate priority score within [0, 100]', () => {
    const score = calculateTopicPriority(baseItem, 10, 3);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should increase priority if weakness score increases', () => {
    const itemLowWeakness = { ...baseItem, weaknessScore: 10 };
    const itemHighWeakness = { ...baseItem, weaknessScore: 90 };

    const scoreLow = calculateTopicPriority(itemLowWeakness, 10, 3);
    const scoreHigh = calculateTopicPriority(itemHighWeakness, 10, 3);

    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });

  it('should increase priority as job interview draws closer', () => {
    const scoreFar = calculateTopicPriority(baseItem, 30, 3);
    const scoreNear = calculateTopicPriority(baseItem, 2, 3);

    expect(scoreNear).toBeGreaterThan(scoreFar);
  });

  it('should increase priority if topic importance level is higher', () => {
    const scoreLowImportance = calculateTopicPriority(baseItem, 10, 1); // Importance 1
    const scoreHighImportance = calculateTopicPriority(baseItem, 10, 5); // Importance 5

    expect(scoreHighImportance).toBeGreaterThan(scoreLowImportance);
  });
});
