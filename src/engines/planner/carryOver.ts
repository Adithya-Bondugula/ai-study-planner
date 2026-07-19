import { Task, Priority } from '../../types';

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Statuses that should NEVER be carried over to the next study day. */
const TERMINAL_STATUSES = new Set<Task['status']>(['Completed']);

/**
 * Informal status strings that callers may store in aiSuggestions or tags
 * to flag a task as archived / cancelled.  We treat any task whose status
 * is not in TERMINAL_STATUSES but whose tags include these strings as
 * non-carriable as well.
 */
const NON_CARRY_TAGS = new Set(['archived', 'cancelled']);

/** After this many consecutive carry-overs the task is escalated to High priority. */
const ESCALATION_THRESHOLD = 3;

/** Today's date string in YYYY-MM-DD format (stable within a single engine call). */
function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the task must NOT be carried forward.
 * Excludes:  completed tasks · archived tasks · cancelled tasks.
 */
function isNonCarriable(task: Task): boolean {
  if (TERMINAL_STATUSES.has(task.status)) return true;
  // Check informal "archived" / "cancelled" markers stored in tags
  const lowerTags = task.tags.map(t => t.toLowerCase());
  return lowerTags.some(tag => NON_CARRY_TAGS.has(tag));
}

/**
 * Bumps a priority level one step upward.
 * Low  → Medium
 * Medium → High
 * High → High (ceiling)
 */
function bumpPriority(current: Priority): Priority {
  if (current === 'Low') return 'Medium';
  if (current === 'Medium') return 'High';
  return 'High';
}

/**
 * Generates the AI escalation suggestion text shown on tasks that have been
 * stuck for more than ESCALATION_THRESHOLD consecutive days.
 */
function escalationSuggestion(task: Task, consecutive: number): string {
  return (
    `⚠️ This task has been carried over for ${consecutive} consecutive day(s) ` +
    `(since ${task.carriedSince ?? todayDateString()}). ` +
    `It has been escalated to High priority. ` +
    `Consider breaking it into smaller sub-tasks or allocating a focused session to complete it.`
  );
}

// ---------------------------------------------------------------------------
// Public API — Module 4: Carry-over Engine
// ---------------------------------------------------------------------------

/**
 * Processes yesterday's tasks and returns a new immutable array of tasks that
 * should be forwarded to today's study plan.
 *
 * Behaviour:
 * - Completed / archived / cancelled tasks are dropped.
 * - Carry-over metadata (`carryOverCount`, `carriedSince`, `consecutiveCarryOvers`)
 *   is incremented on each call.
 * - Priority is bumped one level for every task that is carried over.
 * - After `ESCALATION_THRESHOLD` (3) consecutive carry-overs the task is
 *   forced to `High` priority and an AI suggestion is attached.
 * - All returned objects are new (spread copies) — inputs are never mutated.
 *
 * @param yesterdayTasks  Tasks from the previous study day.
 * @returns               Immutable array of carry-over tasks with updated metadata.
 */
export function identifyCarryOverTasks(yesterdayTasks: Task[]): Task[] {
  const today = todayDateString();

  return yesterdayTasks
    .filter(task => !isNonCarriable(task))
    .map(task => {
      // Increment counters
      const newCarryOverCount = (task.carryOverCount ?? 0) + 1;
      const newConsecutive = (task.consecutiveCarryOvers ?? 0) + 1;
      const carriedSince = task.carriedSince ?? today;

      // Escalation: ≥ ESCALATION_THRESHOLD consecutive days
      const shouldEscalate = newConsecutive >= ESCALATION_THRESHOLD;
      const escalatedPriority: Priority = shouldEscalate
        ? 'High'
        : bumpPriority(task.priority);

      const escalatedSuggestion = shouldEscalate
        ? escalationSuggestion({ ...task, carriedSince }, newConsecutive)
        : (task.aiSuggestions
            ? `Carry-over: ${task.aiSuggestions}`
            : 'Carry-over from yesterday.');

      return Object.freeze({
        ...task,
        priority: escalatedPriority,
        aiSuggestions: escalatedSuggestion,
        carryOverCount: newCarryOverCount,
        carriedSince,
        consecutiveCarryOvers: newConsecutive,
      });
    });
}

/**
 * Merges carry-over tasks with newly generated tasks, preventing duplicates.
 *
 * Carry-over tasks take precedence: if a task ID already exists in
 * `carryOver`, the corresponding entry in `newTasks` is silently dropped.
 *
 * @param carryOver  Tasks forwarded from the previous day (already processed).
 * @param newTasks   Fresh tasks generated for today (e.g. from roadmap engine).
 * @returns          Deduplicated, immutable merged array.
 */
export function mergeTasksWithoutDuplicates(
  carryOver: Task[],
  newTasks: Task[]
): Task[] {
  const merged: Task[] = [...carryOver];
  const seenIds = new Set<string>(carryOver.map(t => t.id));

  newTasks.forEach(task => {
    if (!seenIds.has(task.id)) {
      merged.push(task);
      seenIds.add(task.id);
    }
  });

  return merged;
}

// ---------------------------------------------------------------------------
// Additional exports (new helpers callers may use directly)
// ---------------------------------------------------------------------------

/**
 * Returns true when the given task is in a non-carriable terminal state
 * (completed, archived, or cancelled).
 *
 * Exported so callers can gate carry-over checks without importing internals.
 */
export function isTaskNonCarriable(task: Task): boolean {
  return isNonCarriable(task);
}

/**
 * The number of consecutive carry-over days that triggers priority escalation.
 * Exported as a named constant so tests and consumers can reference it without
 * hard-coding the magic number.
 */
export const CARRY_OVER_ESCALATION_THRESHOLD = ESCALATION_THRESHOLD;
