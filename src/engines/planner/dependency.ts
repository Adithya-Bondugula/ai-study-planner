import { RoadmapItem } from '../../types';

/**
 * Topologically sorts roadmap items based on their prerequisite dependencies.
 * Basic concepts (prerequisites) will appear first in the sorted array.
 * 
 * Handles cycle detection by maintaining a recursion stack state.
 */
export function sortRoadmapItemsTopologically(items: RoadmapItem[]): RoadmapItem[] {
  const sorted: RoadmapItem[] = [];
  const visited: { [id: string]: boolean } = {};
  const temp: { [id: string]: boolean } = {}; // Recursion stack for cycle detection
  const itemsMap = new Map<string, RoadmapItem>();

  // Map items by ID for quick lookups
  items.forEach(item => itemsMap.set(item.id, item));

  function visit(id: string) {
    if (temp[id]) {
      // Prerequisite cycle detected; break loop to prevent infinite recursion
      return;
    }
    if (visited[id]) {
      return;
    }

    const item = itemsMap.get(id);
    if (!item) {
      return;
    }

    temp[id] = true;

    // Visit prerequisites first
    const prereqs = item.prerequisites || [];
    prereqs.forEach(prereqId => {
      visit(prereqId);
    });

    temp[id] = false;
    visited[id] = true;
    sorted.push(item);
  }

  items.forEach(item => {
    if (!visited[item.id]) {
      visit(item.id);
    }
  });

  return sorted;
}

/**
 * Filters roadmap items to only include topics that are eligible for studying.
 * A topic is eligible if it is not completed AND all of its prerequisites are completed.
 */
export function getEligibleTopics(items: RoadmapItem[]): RoadmapItem[] {
  const itemsMap = new Map<string, RoadmapItem>();
  items.forEach(item => itemsMap.set(item.id, item));

  return items.filter(item => {
    // Already completed topics are not eligible to learn next
    if (item.completionState === 'Completed') {
      return false;
    }

    // All prerequisites must be completed
    const prereqs = item.prerequisites || [];
    return prereqs.every(prereqId => {
      const prereq = itemsMap.get(prereqId);
      return prereq ? prereq.completionState === 'Completed' : true;
    });
  });
}
