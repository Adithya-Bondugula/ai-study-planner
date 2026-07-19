import { StudyBlock, Task } from '../../types';

/**
 * Greedily distributes tasks into study blocks.
 * 
 * Rules:
 * 1. Blocks are filled up to their time capacity (estHours * 60 minutes).
 * 2. High priority tasks are scheduled first.
 * 3. Total study time allocated will not exceed availableHours limit.
 */
export function scheduleTasksIntoBlocks(
  availableHours: number,
  blocks: StudyBlock[],
  tasks: Task[]
): StudyBlock[] {
  const maxStudyMinutes = availableHours * 60;
  let allocatedMinutes = 0;

  // Sort tasks by priority: High -> Medium -> Low, then by estimated duration descending
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityWeight = { High: 3, Medium: 2, Low: 1 };
    const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (pDiff !== 0) return pDiff;
    return b.estDuration - a.estDuration; // longer tasks first
  });

  // Deep clone blocks to prevent modifying parameters directly
  const scheduledBlocks: StudyBlock[] = blocks.map(block => ({
    ...block,
    tasks: []
  }));

  const taskQueue = [...sortedTasks];

  for (const block of scheduledBlocks) {
    const blockCapacityMinutes = block.estHours * 60;
    let blockUsedMinutes = 0;

    // Filter queue to find eligible tasks for this block
    const remainingTasks: Task[] = [];

    for (const task of taskQueue) {
      const remainingGlobalMinutes = maxStudyMinutes - allocatedMinutes;
      
      // If we hit our available hours limit, stop scheduling tasks
      if (remainingGlobalMinutes <= 0) {
        remainingTasks.push(task);
        continue;
      }

      // Check if task fits in this block's remaining capacity AND in global limits
      const taskDuration = Math.min(task.estDuration, remainingGlobalMinutes);

      if (blockUsedMinutes + taskDuration <= blockCapacityMinutes) {
        block.tasks = block.tasks || [];
        block.tasks.push({
          ...task,
          blockId: block.id,
          estDuration: taskDuration // adjust if truncated by global limit
        });
        
        blockUsedMinutes += taskDuration;
        allocatedMinutes += taskDuration;
      } else {
        remainingTasks.push(task);
      }
    }

    // Update queue to contains remaining unscheduled tasks
    taskQueue.length = 0;
    taskQueue.push(...remainingTasks);
  }

  return scheduledBlocks;
}
