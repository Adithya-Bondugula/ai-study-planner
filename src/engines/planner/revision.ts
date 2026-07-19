/**
 * Implements the SuperMemo SM-2 spaced repetition algorithm.
 * 
 * Inputs:
 * - easeFactor: multiplier for subsequent review intervals
 * - repetitions: consecutive successful reviews
 * - intervalDays: current interval in days
 * - grade: user score 0 (blackout) to 5 (perfect recall)
 * 
 * Returns updated values and the next calculated review interval.
 */
export interface SM2Result {
  easeFactor: number;
  repetitions: number;
  intervalDays: number;
  nextReviewDate: Date;
}

export function calculateSM2(
  easeFactor: number,
  repetitions: number,
  intervalDays: number,
  grade: number // 0 to 5
): SM2Result {
  // Enforce boundary values
  const q = Math.min(5, Math.max(0, Math.round(grade)));
  let nextEaseFactor = easeFactor;
  let nextRepetitions = repetitions;
  let nextIntervalDays = intervalDays;

  if (q >= 3) {
    // Correct response
    if (nextRepetitions === 0) {
      nextIntervalDays = 1;
    } else if (nextRepetitions === 1) {
      nextIntervalDays = 6;
    } else {
      nextIntervalDays = Math.ceil(intervalDays * easeFactor);
    }
    nextRepetitions += 1;
  } else {
    // Incorrect response, reset repetitions and re-queue daily
    nextRepetitions = 0;
    nextIntervalDays = 1;
  }

  // Adjust Ease Factor (minimum 1.3)
  nextEaseFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  nextEaseFactor = Math.max(1.3, parseFloat(nextEaseFactor.toFixed(2)));

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + nextIntervalDays);

  return {
    easeFactor: nextEaseFactor,
    repetitions: nextRepetitions,
    intervalDays: nextIntervalDays,
    nextReviewDate
  };
}
