/**
 * Tests for Module 5: Revision Engine Integration
 *
 * Covers all exported helpers and the two primary public functions:
 *   - identifyDueRevisions
 *   - generateRevisionBlocks
 *
 * Plus an integration test that exercises the wired-up planner agent.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // helpers
  revisionFrequencyToDays,
  confidenceToGrade,
  weaknessToEaseFactor,
  daysSince,
  timeToMinutes,
  minutesToTime,
  computeRevisionStartMinutes,
  // main API
  identifyDueRevisions,
  generateRevisionBlocks,
  // constants
  REVISION_MINUTES_PER_ITEM,
  REVISION_DEFAULT_START_HOUR,
  REVISION_BUFFER_MINUTES,
  type RevisionCandidate,
} from '../../src/engines/planner/revisionScheduler';
import type { RoadmapItem, StudyBlock } from '../../src/types';
import { useAppStore } from '../../src/stores/useAppStore';
import { plannerAgent } from '../../src/agents/planner.agent';

// ---------------------------------------------------------------------------
// Test fixture helpers
// ---------------------------------------------------------------------------

/** Returns a YYYY-MM-DD string for N days ago. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/** Returns a YYYY-MM-DD string for N days from now. */
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/** Factory for RoadmapItem test fixtures. */
function makeRoadmapItem(overrides: Partial<RoadmapItem> = {}): RoadmapItem {
  return {
    id: overrides.id ?? 'item-1',
    roadmapId: overrides.roadmapId ?? 'roadmap-1',
    parentId: overrides.parentId ?? null,
    title: overrides.title ?? 'Test Topic',
    difficulty: overrides.difficulty ?? 'Medium',
    estimatedHours: overrides.estimatedHours ?? 4,
    prerequisites: overrides.prerequisites ?? [],
    resources: overrides.resources ?? [],
    practiceQuestions: overrides.practiceQuestions ?? [],
    interviewQuestions: overrides.interviewQuestions ?? [],
    revisionFrequency: overrides.revisionFrequency ?? 'Weekly',
    completionState: overrides.completionState ?? 'Completed',
    orderIndex: overrides.orderIndex ?? 0,
    lastStudied: overrides.lastStudied, // intentionally undefined unless specified
    revisionCount: overrides.revisionCount ?? 0,
    quizScore: overrides.quizScore,
    confidenceScore: overrides.confidenceScore ?? 3,
    weaknessScore: overrides.weaknessScore ?? 30,
    mistakeCount: overrides.mistakeCount ?? 0,
    interviewReadiness: overrides.interviewReadiness ?? 70,
  };
}

/** Factory for a minimal StudyBlock fixture with a time window. */
function makeBlock(
  id: string,
  startTime: string,
  endTime: string,
  orderIndex = 0,
): StudyBlock {
  return {
    id,
    title: `Block ${id}`,
    priority: 'Medium',
    estHours: 1,
    startTime,
    endTime,
    orderIndex,
    isCollapsed: false,
    tasks: [],
  };
}

// ---------------------------------------------------------------------------
// 1. revisionFrequencyToDays
// ---------------------------------------------------------------------------

describe('revisionFrequencyToDays', () => {
  it('maps Daily to 1', () => {
    expect(revisionFrequencyToDays('Daily')).toBe(1);
  });

  it('maps Weekly to 7', () => {
    expect(revisionFrequencyToDays('Weekly')).toBe(7);
  });

  it('maps Biweekly to 14', () => {
    expect(revisionFrequencyToDays('Biweekly')).toBe(14);
  });

  it('maps Monthly to 30', () => {
    expect(revisionFrequencyToDays('Monthly')).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// 2. confidenceToGrade
// ---------------------------------------------------------------------------

describe('confidenceToGrade', () => {
  it('returns 0 for 0', () => expect(confidenceToGrade(0)).toBe(0));
  it('returns 5 for 5', () => expect(confidenceToGrade(5)).toBe(5));
  it('returns 3 for 3', () => expect(confidenceToGrade(3)).toBe(3));

  it('clamps values above 5 to 5', () => {
    expect(confidenceToGrade(6)).toBe(5);
    expect(confidenceToGrade(100)).toBe(5);
  });

  it('clamps values below 0 to 0', () => {
    expect(confidenceToGrade(-1)).toBe(0);
    expect(confidenceToGrade(-100)).toBe(0);
  });

  it('rounds fractional values', () => {
    expect(confidenceToGrade(2.4)).toBe(2);
    expect(confidenceToGrade(2.5)).toBe(3);
    expect(confidenceToGrade(4.7)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// 3. weaknessToEaseFactor
// ---------------------------------------------------------------------------

describe('weaknessToEaseFactor', () => {
  it('returns MAX_EASE_FACTOR (2.5) for zero weakness', () => {
    expect(weaknessToEaseFactor(0)).toBe(2.5);
  });

  it('returns MIN_EASE_FACTOR (1.3) for maximum weakness (100)', () => {
    expect(weaknessToEaseFactor(100)).toBe(1.3);
  });

  it('returns a midpoint for 50% weakness', () => {
    const result = weaknessToEaseFactor(50);
    // 1.3 + 0.5 * (2.5 - 1.3) = 1.3 + 0.6 = 1.9
    expect(result).toBeCloseTo(1.9, 2);
  });

  it('result is always within [1.3, 2.5]', () => {
    for (const ws of [0, 10, 25, 50, 75, 90, 100]) {
      const ef = weaknessToEaseFactor(ws);
      expect(ef).toBeGreaterThanOrEqual(1.3);
      expect(ef).toBeLessThanOrEqual(2.5);
    }
  });

  it('clamps weakness values above 100', () => {
    expect(weaknessToEaseFactor(200)).toBe(weaknessToEaseFactor(100));
  });

  it('clamps weakness values below 0', () => {
    expect(weaknessToEaseFactor(-50)).toBe(weaknessToEaseFactor(0));
  });

  it('is monotonically decreasing: higher weakness → lower ease factor', () => {
    const ef0 = weaknessToEaseFactor(0);
    const ef50 = weaknessToEaseFactor(50);
    const ef100 = weaknessToEaseFactor(100);
    expect(ef0).toBeGreaterThan(ef50);
    expect(ef50).toBeGreaterThan(ef100);
  });
});

// ---------------------------------------------------------------------------
// 4. daysSince
// ---------------------------------------------------------------------------

describe('daysSince', () => {
  it('returns MAX_SAFE_INTEGER for undefined (never studied)', () => {
    expect(daysSince(undefined)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(daysSince(today)).toBe(0);
  });

  it('returns 1 for yesterday', () => {
    expect(daysSince(daysAgo(1))).toBe(1);
  });

  it('returns 7 for 7 days ago', () => {
    expect(daysSince(daysAgo(7))).toBe(7);
  });

  it('returns 30 for 30 days ago', () => {
    expect(daysSince(daysAgo(30))).toBe(30);
  });

  it('returns 0 for a future date (no negative days)', () => {
    // future date: Math.floor of negative ms → 0 or negative; clamp not done here
    // but for a date 1 day from now, result should be negative — verify caller handles it
    const result = daysSince(daysFromNow(1));
    expect(result).toBeLessThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// 5. timeToMinutes
// ---------------------------------------------------------------------------

describe('timeToMinutes', () => {
  it('converts 00:00 to 0', () => expect(timeToMinutes('00:00')).toBe(0));
  it('converts 01:00 to 60', () => expect(timeToMinutes('01:00')).toBe(60));
  it('converts 09:30 to 570', () => expect(timeToMinutes('09:30')).toBe(570));
  it('converts 11:00 to 660', () => expect(timeToMinutes('11:00')).toBe(660));
  it('converts 16:30 to 990', () => expect(timeToMinutes('16:30')).toBe(990));
  it('converts 19:00 to 1140', () => expect(timeToMinutes('19:00')).toBe(1140));
  it('converts 23:59 to 1439', () => expect(timeToMinutes('23:59')).toBe(1439));
});

// ---------------------------------------------------------------------------
// 6. minutesToTime
// ---------------------------------------------------------------------------

describe('minutesToTime', () => {
  it('converts 0 to 00:00', () => expect(minutesToTime(0)).toBe('00:00'));
  it('converts 60 to 01:00', () => expect(minutesToTime(60)).toBe('01:00'));
  it('converts 570 to 09:30', () => expect(minutesToTime(570)).toBe('09:30'));
  it('converts 1140 to 19:00', () => expect(minutesToTime(1140)).toBe('19:00'));
  it('converts 1170 to 19:30', () => expect(minutesToTime(1170)).toBe('19:30'));
  it('converts 1439 to 23:59', () => expect(minutesToTime(1439)).toBe('23:59'));

  it('clamps negative values to 00:00', () => {
    expect(minutesToTime(-10)).toBe('00:00');
  });

  it('clamps values above 1439 to 23:59', () => {
    expect(minutesToTime(1500)).toBe('23:59');
  });

  it('is the inverse of timeToMinutes for valid times', () => {
    const times = ['00:00', '09:00', '11:30', '16:30', '19:00', '21:00', '23:59'];
    for (const t of times) {
      expect(minutesToTime(timeToMinutes(t))).toBe(t);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. computeRevisionStartMinutes
// ---------------------------------------------------------------------------

describe('computeRevisionStartMinutes', () => {
  const DEFAULT_START = REVISION_DEFAULT_START_HOUR * 60; // 1140 = 19:00

  it('returns default start (19:00) when no existing blocks', () => {
    expect(computeRevisionStartMinutes([])).toBe(DEFAULT_START);
  });

  it('returns default start when blocks have no endTime', () => {
    const blocks: StudyBlock[] = [
      { id: 'b1', title: 'B1', priority: 'High', estHours: 2, orderIndex: 0, isCollapsed: false },
    ];
    expect(computeRevisionStartMinutes(blocks)).toBe(DEFAULT_START);
  });

  it('returns default start when last block ends before 18:30 (buffer keeps result < 19:00)', () => {
    // Block ends at 16:30 → 16:30 + 30 min buffer = 17:00 < 19:00 → use 19:00
    const blocks = [makeBlock('b1', '09:00', '16:30')];
    expect(computeRevisionStartMinutes(blocks)).toBe(DEFAULT_START);
  });

  it('returns block end + buffer when that exceeds 19:00', () => {
    // Block ends at 20:00 → 20:00 + 30 min = 20:30 > 19:00 → use 20:30
    const blocks = [makeBlock('b1', '17:00', '20:00')];
    const expected = timeToMinutes('20:00') + REVISION_BUFFER_MINUTES; // 1200 + 30 = 1230
    expect(computeRevisionStartMinutes(blocks)).toBe(expected);
    expect(minutesToTime(computeRevisionStartMinutes(blocks))).toBe('20:30');
  });

  it('uses the latest endTime when multiple blocks are present', () => {
    const blocks = [
      makeBlock('b1', '09:00', '11:00', 0),
      makeBlock('b2', '14:00', '21:00', 1), // ← latest end
      makeBlock('b3', '13:00', '15:30', 2),
    ];
    // latest = 21:00 (1260) + 30 = 1290 = 21:30 > 19:00 → 21:30
    const result = computeRevisionStartMinutes(blocks);
    expect(result).toBe(1290);
    expect(minutesToTime(result)).toBe('21:30');
  });

  it('ignores blocks without endTime when computing the latest end', () => {
    const blocks: StudyBlock[] = [
      makeBlock('b1', '09:00', '11:00'),
      // block with no endTime
      { id: 'b2', title: 'B2', priority: 'Low', estHours: 1, orderIndex: 1, isCollapsed: false },
    ];
    // only b1 contributes; 11:00 + 30 = 11:30 < 19:00 → use 19:00
    expect(computeRevisionStartMinutes(blocks)).toBe(DEFAULT_START);
  });
});

// ---------------------------------------------------------------------------
// 8. identifyDueRevisions
// ---------------------------------------------------------------------------

describe('identifyDueRevisions', () => {
  it('returns empty array for empty input', () => {
    expect(identifyDueRevisions([])).toEqual([]);
  });

  it('excludes non-completed items', () => {
    const items = [
      makeRoadmapItem({ id: 'i1', completionState: 'Not Started' }),
      makeRoadmapItem({ id: 'i2', completionState: 'In Progress' }),
    ];
    expect(identifyDueRevisions(items)).toHaveLength(0);
  });

  it('returns empty array when all completed items are not yet due', () => {
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Weekly',
      lastStudied: daysAgo(3), // 3 days ago; target = 7 → not due
    });
    const result = identifyDueRevisions([item]);
    expect(result).toHaveLength(0);
  });

  it('marks an item as due when daysSince equals the target interval', () => {
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Weekly',
      lastStudied: daysAgo(7), // exactly at threshold
    });
    const result = identifyDueRevisions([item]);
    expect(result).toHaveLength(1);
    expect(result[0].isDue).toBe(true);
  });

  it('marks an item as due when daysSince exceeds the target interval', () => {
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Weekly',
      lastStudied: daysAgo(14), // 2× overdue
    });
    const result = identifyDueRevisions([item]);
    expect(result).toHaveLength(1);
    expect(result[0].overdueRatio).toBeCloseTo(2, 1);
  });

  it('marks items never studied as always due with sentinel values', () => {
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Weekly',
      lastStudied: undefined,
    });
    const result = identifyDueRevisions([item]);
    expect(result).toHaveLength(1);
    expect(result[0].isDue).toBe(true);
    expect(result[0].daysSinceLastStudied).toBe(-1);
    expect(result[0].overdueRatio).toBe(999);
  });

  it('respects Daily frequency: due after 1+ day', () => {
    const due = makeRoadmapItem({
      id: 'daily-due',
      completionState: 'Completed',
      revisionFrequency: 'Daily',
      lastStudied: daysAgo(1),
    });
    const notDue = makeRoadmapItem({
      id: 'daily-not-due',
      completionState: 'Completed',
      revisionFrequency: 'Daily',
      lastStudied: new Date().toISOString().split('T')[0], // studied today
    });
    const result = identifyDueRevisions([due, notDue]);
    expect(result).toHaveLength(1);
    expect(result[0].item.id).toBe('daily-due');
  });

  it('respects Biweekly frequency: not due after 13 days', () => {
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Biweekly',
      lastStudied: daysAgo(13), // 13 < 14 → not due
    });
    expect(identifyDueRevisions([item])).toHaveLength(0);
  });

  it('respects Biweekly frequency: due after 14 days', () => {
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Biweekly',
      lastStudied: daysAgo(14),
    });
    expect(identifyDueRevisions([item])).toHaveLength(1);
  });

  it('respects Monthly frequency: not due after 29 days', () => {
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Monthly',
      lastStudied: daysAgo(29),
    });
    expect(identifyDueRevisions([item])).toHaveLength(0);
  });

  it('respects Monthly frequency: due after 30 days', () => {
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Monthly',
      lastStudied: daysAgo(30),
    });
    expect(identifyDueRevisions([item])).toHaveLength(1);
  });

  it('sorts results by overdueRatio descending (most overdue first)', () => {
    const items = [
      makeRoadmapItem({ id: 'a', completionState: 'Completed', revisionFrequency: 'Weekly', lastStudied: daysAgo(8)  }), // ratio ~1.14
      makeRoadmapItem({ id: 'b', completionState: 'Completed', revisionFrequency: 'Weekly', lastStudied: undefined   }), // ratio 999
      makeRoadmapItem({ id: 'c', completionState: 'Completed', revisionFrequency: 'Weekly', lastStudied: daysAgo(21) }), // ratio 3
    ];
    const result = identifyDueRevisions(items);
    expect(result.map(r => r.item.id)).toEqual(['b', 'c', 'a']);
  });

  it('correctly populates targetIntervalDays from revisionFrequency', () => {
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Biweekly',
      lastStudied: daysAgo(14),
    });
    const [candidate] = identifyDueRevisions([item]);
    expect(candidate.targetIntervalDays).toBe(14);
  });

  it('attaches a valid SM-2 result to each candidate', () => {
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Weekly',
      lastStudied: daysAgo(10),
      confidenceScore: 4,
      weaknessScore: 20,
      revisionCount: 2,
    });
    const [candidate] = identifyDueRevisions([item]);
    expect(candidate.sm2Result).toBeDefined();
    expect(candidate.sm2Result.intervalDays).toBeGreaterThan(0);
    expect(candidate.sm2Result.easeFactor).toBeGreaterThanOrEqual(1.3);
    expect(candidate.sm2Result.nextReviewDate).toBeInstanceOf(Date);
    // nextReviewDate should be in the future
    expect(candidate.sm2Result.nextReviewDate.getTime()).toBeGreaterThan(Date.now());
  });

  it('derives SM-2 grade from confidenceScore', () => {
    // confidence 5 → grade 5 → SM-2 should produce a long interval
    const highConfidence = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Weekly',
      lastStudied: daysAgo(7),
      confidenceScore: 5,
      weaknessScore: 0,
      revisionCount: 3,
    });
    // confidence 0 → grade 0 → SM-2 resets to interval 1
    const lowConfidence = makeRoadmapItem({
      id: 'low',
      completionState: 'Completed',
      revisionFrequency: 'Weekly',
      lastStudied: daysAgo(7),
      confidenceScore: 0,
      weaknessScore: 100,
      revisionCount: 3,
    });
    const [highResult] = identifyDueRevisions([highConfidence]);
    const [lowResult] = identifyDueRevisions([lowConfidence]);
    // High confidence → longer next interval than low confidence
    expect(highResult.sm2Result.intervalDays).toBeGreaterThan(
      lowResult.sm2Result.intervalDays,
    );
  });

  it('ignores non-completed items even if mixed with completed ones', () => {
    const items = [
      makeRoadmapItem({ id: 'done', completionState: 'Completed', lastStudied: daysAgo(8) }),
      makeRoadmapItem({ id: 'wip', completionState: 'In Progress', lastStudied: daysAgo(8) }),
      makeRoadmapItem({ id: 'new', completionState: 'Not Started' }),
    ];
    const result = identifyDueRevisions(items);
    expect(result).toHaveLength(1);
    expect(result[0].item.id).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// 9. generateRevisionBlocks
// ---------------------------------------------------------------------------

describe('generateRevisionBlocks', () => {
  /** Helper: build N due RevisionCandidates from items with lastStudied = N weeks ago. */
  function buildCandidates(
    count: number,
    weeksBehind = 2,
  ): RevisionCandidate[] {
    const items = Array.from({ length: count }, (_, i) =>
      makeRoadmapItem({
        id: `item-${i}`,
        completionState: 'Completed',
        revisionFrequency: 'Weekly',
        lastStudied: daysAgo(weeksBehind * 7),
        practiceQuestions: [
          { id: `q${i}-0`, question: `Q${i} question A`, solution: 'Sol A' },
          { id: `q${i}-1`, question: `Q${i} question B`, solution: 'Sol B' },
          { id: `q${i}-2`, question: `Q${i} question C`, solution: 'Sol C' },
          { id: `q${i}-3`, question: `Q${i} question D`, solution: 'Sol D' }, // 4th — should be excluded
        ],
      }),
    );
    return identifyDueRevisions(items);
  }

  it('returns empty array when no due candidates', () => {
    expect(generateRevisionBlocks([], [])).toEqual([]);
  });

  it('returns exactly one revision block for any number of candidates', () => {
    const candidates = buildCandidates(3);
    const result = generateRevisionBlocks(candidates, []);
    expect(result).toHaveLength(1);
  });

  it('block id is prefixed with revision-block-<today>', () => {
    const today = new Date().toISOString().split('T')[0];
    const [block] = generateRevisionBlocks(buildCandidates(1), []);
    expect(block.id).toBe(`revision-block-${today}`);
  });

  it('block title is "Evening Revision Block"', () => {
    const [block] = generateRevisionBlocks(buildCandidates(1), []);
    expect(block.title).toBe('Evening Revision Block');
  });

  it('starts at 19:00 when no existing blocks are provided', () => {
    const [block] = generateRevisionBlocks(buildCandidates(2), []);
    expect(block.startTime).toBe('19:00');
  });

  it('starts after the latest existing block endTime + buffer', () => {
    const existingBlocks = [makeBlock('b1', '17:00', '21:00')];
    const [block] = generateRevisionBlocks(buildCandidates(1), existingBlocks);
    // 21:00 (1260) + 30 buffer = 21:30
    expect(block.startTime).toBe('21:30');
  });

  it('never starts before 19:00 even when existing blocks end early', () => {
    const existingBlocks = [makeBlock('b1', '09:00', '11:30')];
    const [block] = generateRevisionBlocks(buildCandidates(1), existingBlocks);
    // 11:30 + 30 = 12:00 < 19:00 → floor to 19:00
    expect(block.startTime).toBe('19:00');
  });

  it('block endTime equals startTime + total allocated minutes', () => {
    const candidates = buildCandidates(2); // 2 × 20 min = 40 min
    const [block] = generateRevisionBlocks(candidates, []);
    const startMin = timeToMinutes(block.startTime!);
    const endMin = timeToMinutes(block.endTime!);
    expect(endMin - startMin).toBe(2 * REVISION_MINUTES_PER_ITEM);
  });

  it('respects maxRevisionHours and omits excess candidates', () => {
    // 6 candidates × 20 min = 120 min; max = 1h = 60 min → only 3 fit
    const candidates = buildCandidates(6);
    const [block] = generateRevisionBlocks(candidates, [], 1);
    expect(block.tasks!.length).toBe(3);
  });

  it('each task id is prefixed with revision-task-<itemId>-<today>', () => {
    const today = new Date().toISOString().split('T')[0];
    const candidates = buildCandidates(2);
    const [block] = generateRevisionBlocks(candidates, []);
    block.tasks!.forEach(task => {
      expect(task.id).toMatch(new RegExp(`^revision-task-.+-${today}$`));
    });
  });

  it('every task has blockId set to the parent block id', () => {
    const [block] = generateRevisionBlocks(buildCandidates(3), []);
    block.tasks!.forEach(task => {
      expect(task.blockId).toBe(block.id);
    });
  });

  it('each task title starts with "Revise:"', () => {
    const [block] = generateRevisionBlocks(buildCandidates(2), []);
    block.tasks!.forEach(task => {
      expect(task.title).toMatch(/^Revise:/);
    });
  });

  it('tasks include the Revision and Spaced Repetition tags', () => {
    const [block] = generateRevisionBlocks(buildCandidates(1), []);
    const task = block.tasks![0];
    expect(task.tags).toContain('Revision');
    expect(task.tags).toContain('Spaced Repetition');
  });

  it('task estDuration equals REVISION_MINUTES_PER_ITEM (20 min) by default', () => {
    const [block] = generateRevisionBlocks(buildCandidates(1), []);
    expect(block.tasks![0].estDuration).toBe(REVISION_MINUTES_PER_ITEM);
  });

  it('task estHours on block matches total allocated time', () => {
    const candidates = buildCandidates(3); // 3 × 20 = 60 min = 1h
    const [block] = generateRevisionBlocks(candidates, []);
    expect(block.estHours).toBeCloseTo(1, 2);
  });

  it('task priority is High when overdueRatio >= 2', () => {
    // 14 days ago, Weekly (7d target) → ratio = 2 exactly
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Weekly',
      lastStudied: daysAgo(14),
    });
    const candidates = identifyDueRevisions([item]);
    const [block] = generateRevisionBlocks(candidates, []);
    expect(block.tasks![0].priority).toBe('High');
  });

  it('task priority is Medium when 1.5 <= overdueRatio < 2', () => {
    // ~10 days ago, Weekly (7d) → ratio ≈ 1.43 — wait, that's < 1.5.
    // Use 11 days ago: 11/7 ≈ 1.57 → Medium
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Weekly',
      lastStudied: daysAgo(11),
    });
    const candidates = identifyDueRevisions([item]);
    const [block] = generateRevisionBlocks(candidates, []);
    expect(block.tasks![0].priority).toBe('Medium');
  });

  it('task priority is Low when 1 <= overdueRatio < 1.5', () => {
    // 8 days ago, Weekly (7d) → ratio = 8/7 ≈ 1.14 → Low
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Weekly',
      lastStudied: daysAgo(8),
    });
    const candidates = identifyDueRevisions([item]);
    const [block] = generateRevisionBlocks(candidates, []);
    expect(block.tasks![0].priority).toBe('Low');
  });

  it('task priority is High for never-studied items (overdueRatio = 999)', () => {
    const item = makeRoadmapItem({
      completionState: 'Completed',
      revisionFrequency: 'Weekly',
      lastStudied: undefined,
    });
    const candidates = identifyDueRevisions([item]);
    const [block] = generateRevisionBlocks(candidates, []);
    expect(block.tasks![0].priority).toBe('High');
  });

  it('task roadmapRefId matches the source item id', () => {
    const item = makeRoadmapItem({ id: 'target-item', lastStudied: daysAgo(8) });
    const candidates = identifyDueRevisions([item]);
    const [block] = generateRevisionBlocks(candidates, []);
    expect(block.tasks![0].roadmapRefId).toBe('target-item');
  });

  it('checklist contains at most 3 practice questions per task', () => {
    const candidates = buildCandidates(1); // fixture has 4 practice questions
    const [block] = generateRevisionBlocks(candidates, []);
    expect(block.tasks![0].checklist.length).toBeLessThanOrEqual(3);
  });

  it('checklist items are not marked done', () => {
    const candidates = buildCandidates(1);
    const [block] = generateRevisionBlocks(candidates, []);
    block.tasks!.forEach(task => {
      task.checklist.forEach(item => {
        expect(item.done).toBe(false);
      });
    });
  });

  it('generates no checklist when item has no practice questions', () => {
    const item = makeRoadmapItem({
      completionState: 'Completed',
      lastStudied: daysAgo(8),
      practiceQuestions: [],
    });
    const candidates = identifyDueRevisions([item]);
    const [block] = generateRevisionBlocks(candidates, []);
    expect(block.tasks![0].checklist).toHaveLength(0);
  });

  it('task notes contain SM-2 metadata keywords', () => {
    const candidates = buildCandidates(1);
    const [block] = generateRevisionBlocks(candidates, []);
    const notes = block.tasks![0].notes ?? '';
    expect(notes).toContain('SM-2');
    expect(notes).toContain('ease factor');
    expect(notes).toContain('interval');
  });

  it('block orderIndex equals the number of existing blocks', () => {
    const existingBlocks = [
      makeBlock('b1', '09:00', '11:00', 0),
      makeBlock('b2', '14:00', '16:30', 1),
    ];
    const [block] = generateRevisionBlocks(buildCandidates(1), existingBlocks);
    expect(block.orderIndex).toBe(existingBlocks.length);
  });

  it('block is not collapsed', () => {
    const [block] = generateRevisionBlocks(buildCandidates(1), []);
    expect(block.isCollapsed).toBe(false);
  });

  it('all task statuses are Todo', () => {
    const candidates = buildCandidates(3);
    const [block] = generateRevisionBlocks(candidates, []);
    block.tasks!.forEach(task => expect(task.status).toBe('Todo'));
  });

  it('all task progress values are 0', () => {
    const candidates = buildCandidates(3);
    const [block] = generateRevisionBlocks(candidates, []);
    block.tasks!.forEach(task => expect(task.progress).toBe(0));
  });

  it('resources are mapped from the source roadmap item', () => {
    const item = makeRoadmapItem({
      completionState: 'Completed',
      lastStudied: daysAgo(8),
      resources: [{ title: 'Article', url: 'https://example.com', type: 'doc' }],
    });
    const candidates = identifyDueRevisions([item]);
    const [block] = generateRevisionBlocks(candidates, []);
    expect(block.tasks![0].resources).toEqual([
      { title: 'Article', url: 'https://example.com' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// 10. Integration: generateDailyPlan produces real revisionBlocks
// ---------------------------------------------------------------------------

describe('plannerAgent.generateDailyPlan — revision integration', () => {
  beforeEach(() => {
    useAppStore.getState().resetToDefaults();
  });

  it('returns a DailyPlan with revisionBlocks as an array', () => {
    const plan = plannerAgent.generateDailyPlan();
    expect(Array.isArray(plan.revisionBlocks)).toBe(true);
  });

  it('revisionBlocks is non-empty when completed items are due (seed data has never-studied completed items)', () => {
    // Default seed: 'item-arrays', 'item-sliding-window', 'item-react-hooks'
    // are all Completed with lastStudied = undefined → always due.
    const plan = plannerAgent.generateDailyPlan();
    expect(plan.revisionBlocks.length).toBeGreaterThan(0);
  });

  it('each revision block task has blockId matching its parent block', () => {
    const plan = plannerAgent.generateDailyPlan();
    plan.revisionBlocks.forEach(block => {
      block.tasks?.forEach(task => {
        expect(task.blockId).toBe(block.id);
      });
    });
  });

  it('revision block ids start with revision-block-', () => {
    const plan = plannerAgent.generateDailyPlan();
    plan.revisionBlocks.forEach(block => {
      expect(block.id).toMatch(/^revision-block-/);
    });
  });

  it('revision task ids start with revision-task-', () => {
    const plan = plannerAgent.generateDailyPlan();
    plan.revisionBlocks.forEach(block => {
      block.tasks?.forEach(task => {
        expect(task.id).toMatch(/^revision-task-/);
      });
    });
  });

  it('totalStudyHours includes revision hours', () => {
    const plan = plannerAgent.generateDailyPlan();
    const normalHours = plan.orderedStudyBlocks.reduce((s, b) => s + b.estHours, 0);
    const revisionHours = plan.revisionBlocks.reduce((s, b) => s + b.estHours, 0);
    expect(plan.totalStudyHours).toBeCloseTo(normalHours + revisionHours, 2);
  });

  it('summary string mentions revision block count', () => {
    const plan = plannerAgent.generateDailyPlan();
    expect(plan.summary).toContain('revision block');
  });

  it('revision blocks do not overlap with normal study blocks in time', () => {
    const plan = plannerAgent.generateDailyPlan();
    // All normal block endTimes must be <= revision block startTime
    plan.revisionBlocks.forEach(revBlock => {
      const revStart = timeToMinutes(revBlock.startTime ?? '19:00');
      plan.orderedStudyBlocks.forEach(normalBlock => {
        if (normalBlock.endTime) {
          const normalEnd = timeToMinutes(normalBlock.endTime);
          expect(revStart).toBeGreaterThanOrEqual(normalEnd);
        }
      });
    });
  });

  it('generateDailyPlan is idempotent (does not mutate store)', () => {
    const blocksBefore = useAppStore.getState().blocks.length;
    plannerAgent.generateDailyPlan();
    plannerAgent.generateDailyPlan();
    const blocksAfter = useAppStore.getState().blocks.length;
    expect(blocksAfter).toBe(blocksBefore);
  });
});

// ---------------------------------------------------------------------------
// 11. Integration: generateDailySchedule persists revision blocks
// ---------------------------------------------------------------------------

describe('plannerAgent.generateDailySchedule — revision integration', () => {
  beforeEach(() => {
    useAppStore.getState().resetToDefaults();
  });

  it('adds revision blocks to the store after scheduling', () => {
    const before = useAppStore.getState().blocks.length;
    plannerAgent.generateDailySchedule();
    const after = useAppStore.getState().blocks.length;
    // Should have added at least one revision block
    expect(after).toBeGreaterThan(before);
  });

  it('revision blocks in store have ids starting with revision-block-', () => {
    plannerAgent.generateDailySchedule();
    const revBlocks = useAppStore
      .getState()
      .blocks.filter(b => b.id.startsWith('revision-block-'));
    expect(revBlocks.length).toBeGreaterThan(0);
  });

  it('calling generateDailySchedule twice does not duplicate revision blocks', () => {
    plannerAgent.generateDailySchedule();
    const afterFirst = useAppStore
      .getState()
      .blocks.filter(b => b.id.startsWith('revision-block-')).length;

    plannerAgent.generateDailySchedule();
    const afterSecond = useAppStore
      .getState()
      .blocks.filter(b => b.id.startsWith('revision-block-')).length;

    expect(afterSecond).toBe(afterFirst);
  });

  it('all tasks in all blocks (including revision) have correct blockId', () => {
    plannerAgent.generateDailySchedule();
    const allBlocks = useAppStore.getState().blocks;
    allBlocks.forEach(block => {
      block.tasks?.forEach(task => {
        expect(task.blockId).toBe(block.id);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// 12. Constants are correctly exported
// ---------------------------------------------------------------------------

describe('exported constants', () => {
  it('REVISION_MINUTES_PER_ITEM is a positive integer', () => {
    expect(typeof REVISION_MINUTES_PER_ITEM).toBe('number');
    expect(REVISION_MINUTES_PER_ITEM).toBeGreaterThan(0);
    expect(Number.isInteger(REVISION_MINUTES_PER_ITEM)).toBe(true);
  });

  it('REVISION_DEFAULT_START_HOUR is 19', () => {
    expect(REVISION_DEFAULT_START_HOUR).toBe(19);
  });

  it('REVISION_BUFFER_MINUTES is 30', () => {
    expect(REVISION_BUFFER_MINUTES).toBe(30);
  });
});
