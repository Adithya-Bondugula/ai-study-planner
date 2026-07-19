import { RoadmapItem } from '../../types';

/**
 * Calculates a dynamic priority score between 0 and 100 for a roadmap topic.
 * 
 * Score Formula:
 * P(t) = 0.3 * Weakness(t) + 0.25 * Importance(t) + 0.25 * RevisionOverdue(t) + 0.2 * DeadlineProximity(t)
 */
export function calculateTopicPriority(
  item: RoadmapItem,
  daysUntilInterview: number | null,
  importanceLevel: number // 1 to 5
): number {
  // 1. Weakness Score (0 - 100)
  const weakness = item.weaknessScore; // already 0 to 100

  // 2. Importance Score (Scaled 0 - 100)
  // importanceLevel: 1 (lowest) to 5 (highest)
  const importance = Math.min(100, Math.max(0, importanceLevel * 20));

  // 3. Revision Overdue Score (0 - 100)
  // Revision target intervals: Daily (1), Weekly (7), Biweekly (14), Monthly (30)
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
    // If never studied, set to high urgency
    daysSinceLastStudy = targetIntervalDays * 2;
  }

  const overdueRatio = daysSinceLastStudy / targetIntervalDays;
  const revisionOverdue = Math.min(100, Math.max(0, overdueRatio * 50)); // Scale to max 100

  // 4. Deadline Proximity (0 - 100)
  let deadlineProximity = 0;
  if (daysUntilInterview !== null) {
    // Closes in on interview. Max proximity if <= 1 day, tapering off to 30 days
    const proximityRatio = Math.max(0, 1 - daysUntilInterview / 30);
    deadlineProximity = proximityRatio * 100;
  }

  // Aggregate weighted score
  const score = (0.3 * weakness) + (0.25 * importance) + (0.25 * revisionOverdue) + (0.2 * deadlineProximity);
  
  return Math.min(100, Math.max(0, parseFloat(score.toFixed(1))));
}
