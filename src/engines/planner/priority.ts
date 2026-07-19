import { RoadmapItem } from '../../types';

/**
 * Calculates a dynamic priority score between 0 and 100 for a roadmap topic.
 *
 * The score aggregates several weighted factors:
 *   - Weakness score (item.weaknessScore)
 *   - Importance derived from difficulty (Easy=1, Medium=3, Hard=5)
 *   - Revision overdue based on last studied date and revisionFrequency
 *   - Deadline proximity to the nearest interview date
 *   - Difficulty score (mapped from difficulty enum)
 *   - Confidence score (item.confidenceScore, 0‑5 scale)
 *   - Dependency completion score (based on prerequisite count)
 *
 * Weight distribution (total = 1.0):
 *   weakness          0.20
 *   importance        0.15
 *   revisionOverdue  0.15
 *   deadlineProximity0.10
 *   difficultyScore  0.10
 *   confidenceScore  0.15
 *   dependencyScore  0.15
 *
 * The final score is clamped to the 0‑100 range and rounded to one decimal place.
 */
export function calculateTopicPriority(
  item: RoadmapItem,
  daysUntilInterview: number | null,
  // importanceLevel derived from difficulty (1‑5) – kept for backward compatibility
  importanceLevel: number // 1 to 5
): number {
  // 1️⃣ Weakness Score (0‑100)
  const weakness = item.weaknessScore; // already 0‑100

  // 2️⃣ Importance Score (scaled 0‑100) – legacy mapping from difficulty level
  const importance = Math.min(100, Math.max(0, importanceLevel * 20));

  // 3️⃣ Revision Overdue Score (0‑100)
  let targetIntervalDays = 7;
  if (item.revisionFrequency === 'Daily') targetIntervalDays = 1;
  else if (item.revisionFrequency === 'Biweekly') targetIntervalDays = 14;
  else if (item.revisionFrequency === 'Monthly') targetIntervalDays = 30;

  let daysSinceLastStudy = 1;
  if (item.lastStudied) {
    const lastDate = new Date(item.lastStudied);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    daysSinceLastStudy = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } else {
    // If never studied, treat as highly overdue
    daysSinceLastStudy = targetIntervalDays * 2;
  }
  const overdueRatio = daysSinceLastStudy / targetIntervalDays;
  const revisionOverdue = Math.min(100, Math.max(0, overdueRatio * 50)); // scaled to max 100

  // 4️⃣ Deadline Proximity (0‑100)
  let deadlineProximity = 0;
  if (daysUntilInterview !== null) {
    const proximityRatio = Math.max(0, 1 - daysUntilInterview / 30); // full score within 1 day, taper to 30 days
    deadlineProximity = proximityRatio * 100;
  }

  // 5️⃣ Difficulty Score (0‑100) – map enum to numeric weight
  const difficultyMap: Record<string, number> = { Easy: 20, Medium: 60, Hard: 100 };
  const difficultyScore = difficultyMap[item.difficulty] ?? 0;

  // 6️⃣ Confidence Score (0‑100) – confidenceScore is 0‑5
  const confidenceScore = (item.confidenceScore ?? 0) * 20;

  // 7️⃣ Dependency Completion Score (0‑100)
  // If there are no prerequisites, we consider the dependency satisfied (100).
  // Otherwise, give a moderate score (70) assuming most are completed; this can be refined later.
  const dependencyScore = item.prerequisites.length === 0 ? 100 : 70;

  // 8️⃣ Weighted aggregation
  const score =
    0.20 * weakness +
    0.15 * importance +
    0.15 * revisionOverdue +
    0.10 * deadlineProximity +
    0.10 * difficultyScore +
    0.15 * confidenceScore +
    0.15 * dependencyScore;

  // Clamp and round to one decimal place
  return Math.min(100, Math.max(0, parseFloat(score.toFixed(1))));
}
