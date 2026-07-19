/**
 * Module 5: Revision Engine Integration
 *
 * Identifies roadmap items that are due for spaced-repetition revision and
 * generates dedicated revision StudyBlocks that do not overlap with normal
 * study blocks.
 *
 * Uses the SuperMemo SM-2 algorithm from `revision.ts` unchanged.
 * Due-date determination is frequency-based, using the `revisionFrequency`
 * field already present on every RoadmapItem.  SM-2 inputs are derived from
 * the item's existing tracking fields:
 *
 *   confidenceScore (0–5)   → SM-2 grade        (0–5, direct mapping)
 *   weaknessScore   (0–100) → SM-2 easeFactor    (1.3–2.5, inverted)
 *   revisionCount           → SM-2 repetitions   (direct)
 *   revisionFrequency       → SM-2 intervalDays  (mapped: Daily=1,Weekly=7,…)
 *
 * The SM-2 result represents the **next** review schedule projected after the
 * current session and is attached to each RevisionCandidate for UI display or
 * later persistence.
 */

import { RoadmapItem, StudyBlock, Task } from '../../types';
import { calculateSM2, SM2Result } from './revision';

// ---------------------------------------------------------------------------
// Public constants (exported for tests and consumers)
// ---------------------------------------------------------------------------

/** Estimated review time per revision item, in minutes. */
export const REVISION_MINUTES_PER_ITEM = 20;

/**
 * Revision blocks must start no earlier than this hour (24-hour clock).
 * Default: 19 → 7 PM.
 */
export const REVISION_DEFAULT_START_HOUR = 19;

/** Minimum gap in minutes between the last normal block's end and revision. */
export const REVISION_BUFFER_MINUTES = 30;

// ---------------------------------------------------------------------------
// Internal ease-factor bounds (mirror SM-2 spec)
// ---------------------------------------------------------------------------

const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 2.5;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A roadmap item that has been evaluated for revision eligibility.
 * Produced by `identifyDueRevisions`.
 */
export interface RevisionCandidate {
  /** The source roadmap item. */
  item: RoadmapItem;
  /** True when the item is due for revision today. */
  isDue: boolean;
  /**
   * Whole days elapsed since the item was last studied.
   * **-1** is the sentinel value meaning the item has never been studied.
   */
  daysSinceLastStudied: number;
  /** Target interval in days derived from `item.revisionFrequency`. */
  targetIntervalDays: number;
  /**
   * Elapsed days divided by target interval.
   * Values ≥ 1 indicate overdue.  999 = never studied.
   */
  overdueRatio: number;
  /**
   * SM-2 projected result using the item's current tracking data.
   * Represents the next review schedule that should be persisted after the
   * revision session is completed.
   */
  sm2Result: SM2Result;
}

// ---------------------------------------------------------------------------
// Helper functions (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Maps a `revisionFrequency` string to the corresponding target interval
 * in days.
 *
 * @example revisionFrequencyToDays('Weekly') // → 7
 */
export function revisionFrequencyToDays(
  freq: RoadmapItem['revisionFrequency'],
): number {
  const map: Record<RoadmapItem['revisionFrequency'], number> = {
    Daily: 1,
    Weekly: 7,
    Biweekly: 14,
    Monthly: 30,
  };
  return map[freq];
}

/**
 * Maps a `confidenceScore` (0–5 scale) to an SM-2 grade (0–5).
 * Both scales are identical, so this is a boundary-clamped identity.
 *
 * @param confidenceScore  Item's self-assessed confidence level (0–5).
 * @returns                SM-2 grade integer in the range [0, 5].
 */
export function confidenceToGrade(confidenceScore: number): number {
  return Math.min(5, Math.max(0, Math.round(confidenceScore)));
}

/**
 * Derives an SM-2 ease factor from `weaknessScore` (0–100).
 *
 * Rationale: a higher weakness means the item should be reviewed more
 * frequently, which corresponds to a lower ease factor in SM-2.
 *
 * - weaknessScore = 100 (maximum weakness) → easeFactor = 1.3  (MIN)
 * - weaknessScore =   0 (no weakness)      → easeFactor = 2.5  (MAX)
 *
 * @param weaknessScore  Item's weakness score in the range [0, 100].
 * @returns              SM-2 ease factor clamped to [1.3, 2.5], 2 d.p.
 */
export function weaknessToEaseFactor(weaknessScore: number): number {
  const clamped = Math.min(100, Math.max(0, weaknessScore));
  const strength = 1 - clamped / 100; // 0 = fully weak, 1 = fully strong
  const ef = MIN_EASE_FACTOR + strength * (MAX_EASE_FACTOR - MIN_EASE_FACTOR);
  return parseFloat(ef.toFixed(2));
}

/**
 * Returns the number of whole days elapsed since the given ISO date string.
 *
 * @param dateStr  ISO date string (YYYY-MM-DD or full ISO-8601).
 *                 Pass `undefined` when the item has never been studied;
 *                 the function returns `Number.MAX_SAFE_INTEGER` in that case.
 */
export function daysSince(dateStr: string | undefined): number {
  if (!dateStr) return Number.MAX_SAFE_INTEGER;
  const past = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - past.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Converts a time string in "HH:MM" format to the equivalent number of
 * minutes elapsed since midnight.
 *
 * @example timeToMinutes('19:30') // → 1170
 */
export function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Converts a total-minutes-from-midnight value to a "HH:MM" time string.
 * Output is clamped to the valid 24-hour range [00:00, 23:59].
 *
 * @example minutesToTime(1170) // → '19:30'
 */
export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Determines the earliest allowable start minute (from midnight) for the
 * revision block, guaranteeing no time overlap with existing study blocks.
 *
 * Algorithm:
 * 1. Scan `existingBlocks` and find the latest `endTime` across all blocks.
 * 2. Add `REVISION_BUFFER_MINUTES` after that end time.
 * 3. Return the maximum of the computed time and
 *    `REVISION_DEFAULT_START_HOUR × 60` (ensuring revision is never too early).
 *
 * When no existing blocks have an `endTime` the function falls back to
 * `REVISION_DEFAULT_START_HOUR × 60` (19:00 by default).
 *
 * @param existingBlocks  Normal (non-revision) study blocks for the day.
 * @returns               Start time in minutes from midnight.
 */
export function computeRevisionStartMinutes(existingBlocks: StudyBlock[]): number {
  let latestEndMinutes = 0;

  for (const block of existingBlocks) {
    if (block.endTime) {
      const endMin = timeToMinutes(block.endTime);
      if (endMin > latestEndMinutes) {
        latestEndMinutes = endMin;
      }
    }
  }

  const afterLastBlock =
    latestEndMinutes > 0 ? latestEndMinutes + REVISION_BUFFER_MINUTES : 0;

  return Math.max(afterLastBlock, REVISION_DEFAULT_START_HOUR * 60);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Identifies which completed roadmap items are due for revision today and
 * produces a sorted list of `RevisionCandidate` objects.
 *
 * **Eligibility rules:**
 * - `completionState` must be `'Completed'` (items not yet finished are
 *   excluded silently; they should appear in the normal study schedule).
 * - The item is due when `daysSince(lastStudied) >= targetIntervalDays`.
 * - Items that have **never** been studied (`lastStudied === undefined`) are
 *   always considered due (they receive `daysSinceLastStudied = -1` and
 *   `overdueRatio = 999`).
 *
 * **SM-2 computation:**
 * For every candidate the function also runs `calculateSM2` using the item's
 * existing tracking data, attaching the projected next-review schedule as
 * `sm2Result`.  This allows the caller (or a future persistence layer) to
 * update the item's interval metadata after the session is completed.
 *
 * **Ordering:**
 * Results are sorted descending by `overdueRatio` — most overdue items appear
 * first and will therefore be scheduled first in the revision block.
 *
 * @param completedItems  Roadmap items to evaluate.  Non-completed items are
 *                        ignored (filter applied internally for safety).
 * @returns               Sorted array of due revision candidates.
 */
export function identifyDueRevisions(
  completedItems: RoadmapItem[],
): RevisionCandidate[] {
  const candidates: RevisionCandidate[] = completedItems
    .filter(item => item.completionState === 'Completed')
    .map(item => {
      const targetIntervalDays = revisionFrequencyToDays(item.revisionFrequency);
      const rawDays = daysSince(item.lastStudied);
      const neverStudied = rawDays === Number.MAX_SAFE_INTEGER;
      const isDue = rawDays >= targetIntervalDays;
      const overdueRatio = neverStudied ? 999 : rawDays / targetIntervalDays;

      // Derive SM-2 inputs from existing item fields
      const grade = confidenceToGrade(item.confidenceScore);
      const easeFactor = weaknessToEaseFactor(item.weaknessScore ?? 0);
      const repetitions = item.revisionCount ?? 0;
      const intervalDays = targetIntervalDays;

      const sm2Result = calculateSM2(easeFactor, repetitions, intervalDays, grade);

      return {
        item,
        isDue,
        daysSinceLastStudied: neverStudied ? -1 : rawDays,
        targetIntervalDays,
        overdueRatio,
        sm2Result,
      };
    })
    .filter(c => c.isDue);

  // Sort: most overdue first (highest overdueRatio descending)
  return candidates.sort((a, b) => b.overdueRatio - a.overdueRatio);
}

/**
 * Generates a single combined revision StudyBlock from a list of due revision
 * candidates.
 *
 * **Behaviour:**
 * - Returns an empty array when `dueCandidates` is empty.
 * - Produces exactly one StudyBlock (id: `revision-block-<YYYY-MM-DD>`)
 *   containing one Task per candidate, ordered most-overdue first.
 * - The block's start time is determined by `computeRevisionStartMinutes`,
 *   ensuring it never overlaps with any time window in `existingBlocks` and
 *   never starts before `REVISION_DEFAULT_START_HOUR`.
 * - Total revision time is capped at `maxRevisionHours × 60` minutes; items
 *   beyond the cap are silently omitted.
 *
 * **Task structure per candidate:**
 * - `id`:         `revision-task-<itemId>-<YYYY-MM-DD>`
 * - `priority`:   High if overdueRatio ≥ 2, Medium if ≥ 1.5, else Low
 * - `checklist`:  Up to 3 practice questions from the source roadmap item
 * - `notes`:      SM-2 next-review metadata (date, interval, ease factor)
 * - `tags`:       `['Revision', 'Spaced Repetition', <difficulty>]`
 *
 * @param dueCandidates    Output of `identifyDueRevisions()`.
 * @param existingBlocks   Normal study blocks for the day (conflict avoidance).
 * @param maxRevisionHours Maximum total revision time. Defaults to 1.5 hours.
 * @returns                Array containing 0 or 1 revision StudyBlock.
 */
export function generateRevisionBlocks(
  dueCandidates: RevisionCandidate[],
  existingBlocks: StudyBlock[],
  maxRevisionHours = 1.5,
): StudyBlock[] {
  if (dueCandidates.length === 0) return [];

  const maxRevisionMinutes = maxRevisionHours * 60;
  const startMinutes = computeRevisionStartMinutes(existingBlocks);
  const today = new Date().toISOString().split('T')[0];

  let allocatedMinutes = 0;
  const tasks: Task[] = [];

  for (const candidate of dueCandidates) {
    if (allocatedMinutes >= maxRevisionMinutes) break;

    const taskMinutes = Math.min(
      REVISION_MINUTES_PER_ITEM,
      maxRevisionMinutes - allocatedMinutes,
    );

    const priority: Task['priority'] =
      candidate.overdueRatio >= 2
        ? 'High'
        : candidate.overdueRatio >= 1.5
          ? 'Medium'
          : 'Low';

    const overdueLabel =
      candidate.overdueRatio === 999
        ? 'never studied'
        : `${candidate.overdueRatio.toFixed(2)}x overdue`;

    const task: Task = {
      id: `revision-task-${candidate.item.id}-${today}`,
      blockId: '', // assigned after the blockId is known
      title: `Revise: ${candidate.item.title}`,
      description:
        `Spaced repetition revision — ${overdueLabel}. ` +
        `Next SM-2 interval: ${candidate.sm2Result.intervalDays} day(s).`,
      estDuration: taskMinutes,
      priority,
      difficulty: candidate.item.difficulty,
      status: 'Todo',
      tags: ['Revision', 'Spaced Repetition', candidate.item.difficulty],
      attachments: [],
      notes:
        `SM-2 next review: ${candidate.sm2Result.nextReviewDate.toISOString().split('T')[0]}` +
        ` | ease factor: ${candidate.sm2Result.easeFactor}` +
        ` | interval: ${candidate.sm2Result.intervalDays} day(s).`,
      resources: candidate.item.resources.map(r => ({ title: r.title, url: r.url })),
      roadmapRefId: candidate.item.id,
      aiSuggestions:
        `Confidence: ${candidate.item.confidenceScore}/5` +
        ` | Weakness: ${candidate.item.weaknessScore}/100` +
        ` | ${candidate.item.practiceQuestions.length} practice question(s) available.`,
      progress: 0,
      // Include up to 3 practice questions as actionable checklist items
      checklist: candidate.item.practiceQuestions.slice(0, 3).map((q, idx) => ({
        id: `rev-check-${candidate.item.id}-${idx}`,
        title: `Revise: ${q.question}`,
        done: false,
      })),
      createdAt: new Date().toISOString(),
    };

    tasks.push(task);
    allocatedMinutes += taskMinutes;
  }

  if (tasks.length === 0) return [];

  const blockId = `revision-block-${today}`;
  const endMinutes = startMinutes + allocatedMinutes;

  const revisionBlock: StudyBlock = {
    id: blockId,
    title: 'Evening Revision Block',
    icon: 'RefreshCw',
    color: '#00e676', // green accent — distinct from normal study blocks
    priority: 'High',
    estHours: parseFloat((allocatedMinutes / 60).toFixed(2)),
    startTime: minutesToTime(startMinutes),
    endTime: minutesToTime(endMinutes),
    orderIndex: existingBlocks.length, // place after all normal blocks
    isCollapsed: false,
    tasks: tasks.map(t => ({ ...t, blockId })),
  };

  return [revisionBlock];
}
