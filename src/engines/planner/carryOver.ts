import { Task } from '../../types';

/**
 * Filter out completed tasks and prepare carryover tasks list.
 * Merges new items, resolving duplicates by taking the latest version.
 */
export function identifyCarryOverTasks(yesterdayTasks: Task[]): Task[] {
  // Unfinished tasks are those that are NOT Completed
  const unfinished = yesterdayTasks.filter(task => task.status !== 'Completed');
  
  // Reset progress state or maintain carryover flags if required
  return unfinished.map(task => ({
    ...task,
    // Ensure task is carryover-marked if useful, or keep as is
    aiSuggestions: task.aiSuggestions 
      ? `Carry-over: ${task.aiSuggestions}` 
      : 'Carry-over from yesterday.'
  }));
}

/**
 * Combines carry-over tasks and new backlog items, filtering duplicates by taskId.
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
