import { describe, it, expect } from 'vitest';
import { calculateSM2 } from '../../src/engines/planner/revision';

describe('calculateSM2 spaced repetition', () => {
  it('should reset repetitions to 0 and set interval to 1 day on a failed grade (< 3)', () => {
    // Current state: EF = 2.5, reps = 4, interval = 12
    const result = calculateSM2(2.5, 4, 12, 2); // Grade 2 = fail

    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
    expect(result.easeFactor).toBeLessThan(2.5); // Ease factor should decrease on poor grade
  });

  it('should set interval to 1 day on first successful repetition', () => {
    const result = calculateSM2(2.5, 0, 1, 5); // Grade 5 = perfect recall

    expect(result.repetitions).toBe(1);
    expect(result.intervalDays).toBe(1);
    expect(result.easeFactor).toBeGreaterThanOrEqual(2.5);
  });

  it('should set interval to 6 days on second successful repetition', () => {
    const result = calculateSM2(2.5, 1, 1, 4); // Grade 4 = good recall

    expect(result.repetitions).toBe(2);
    expect(result.intervalDays).toBe(6);
  });

  it('should multiply interval by ease factor on subsequent successful repetitions (> 2)', () => {
    const result = calculateSM2(2.0, 2, 6, 4); // Grade 4, EF = 2.0, current interval = 6

    expect(result.repetitions).toBe(3);
    expect(result.intervalDays).toBe(12); // 6 * 2.0 = 12
  });

  it('should bound ease factor to a minimum of 1.3', () => {
    // If we repeatedly fail, EF should shrink but never drop below 1.3
    const ef = 1.4;
    const result = calculateSM2(ef, 0, 1, 0); // Complete blackout
    
    expect(result.easeFactor).toBe(1.3);
  });
});
