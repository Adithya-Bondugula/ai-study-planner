import { Task } from '../../types';

/**
 * Simple XP calculation for V1 planner.
 * Assigns 10 XP per hour of estimated study time.
 * Returns total XP as a rounded integer.
 */
export function calculateXP(tasks: Task[]): number {
  const totalHours = tasks.reduce((sum, t) => sum + t.estDuration / 60, 0);
  return Math.round(totalHours * 10);
}
