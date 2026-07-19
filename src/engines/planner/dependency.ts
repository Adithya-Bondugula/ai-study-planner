// Dependency Engine for Planner
// Provides utilities for handling roadmap item dependencies, eligibility, and validation.

import { RoadmapItem } from '../../types';

/** Topologically sorts roadmap items based on their prerequisite dependencies. */
export function topologicalSort(items: RoadmapItem[]): RoadmapItem[] {
  const sorted: RoadmapItem[] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const itemsMap = new Map<string, RoadmapItem>();
  items.forEach(i => itemsMap.set(i.id, i));

  function dfs(id: string) {
    if (recStack.has(id)) return; // cycle detected
    if (visited.has(id)) return;
    visited.add(id);
    recStack.add(id);
    const item = itemsMap.get(id);
    if (item) {
      (item.prerequisites ?? []).forEach(prId => dfs(prId));
    }
    recStack.delete(id);
    if (item) sorted.push(item);
  }

  items.forEach(i => {
    if (!visited.has(i.id)) dfs(i.id);
  });
  return sorted;
}

/* ==== Engine Types ==== */
export interface BlockedTopicInfo {
  itemId: string;
  missingPrerequisites: string[];
  reason: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  duplicatePrerequisites?: { itemId: string; duplicates: string[] }[];
  missingPrerequisites?: { itemId: string; missing: string[] }[];
  selfDependencies?: string[];
  circularDependencies?: string[][];
}

/** Returns detailed information about blocked topics (not eligible). */
export function getBlockedTopics(items: RoadmapItem[]): BlockedTopicInfo[] {
  const itemsMap = new Map<string, RoadmapItem>();
  items.forEach(item => itemsMap.set(item.id, item));

  const blocked: BlockedTopicInfo[] = [];
  items.forEach(item => {
    if (item.completionState === 'Completed') return;
    const missing = (item.prerequisites ?? []).filter(prId => {
      const prereq = itemsMap.get(prId);
      return !prereq || prereq.completionState !== 'Completed';
    });
    if (missing.length > 0) {
      blocked.push({
        itemId: item.id,
        missingPrerequisites: missing,
        reason: 'Prerequisites not completed',
      });
    }
  });
  return blocked;
}

/** Validates roadmap dependencies for structural problems. */
export function validateRoadmapDependencies(items: RoadmapItem[]): ValidationResult {
  const errors: string[] = [];
  const itemsMap = new Map<string, RoadmapItem>();
  items.forEach(item => itemsMap.set(item.id, item));

  if (items.length === 0) {
    errors.push('Roadmap is empty');
    return { valid: false, errors };
  }

  const duplicatePrerequisites: { itemId: string; duplicates: string[] }[] = [];
  const missingPrerequisites: { itemId: string; missing: string[] }[] = [];
  const selfDependencies: string[] = [];

  items.forEach(item => {
    const prereqSet = new Set<string>();
    const dupes: string[] = [];
    const missing: string[] = [];
    (item.prerequisites ?? []).forEach(prId => {
      if (prId === item.id) selfDependencies.push(item.id);
      if (prereqSet.has(prId)) dupes.push(prId);
      else prereqSet.add(prId);
      if (!itemsMap.has(prId)) missing.push(prId);
    });
    if (dupes.length) duplicatePrerequisites.push({ itemId: item.id, duplicates: Array.from(new Set(dupes)) });
    if (missing.length) missingPrerequisites.push({ itemId: item.id, missing });
  });

  const circular = detectCircularDependencies(items);
  const circularDependencies = circular.length ? circular : undefined;

  if (selfDependencies.length) errors.push('Self dependency detected');
  if (duplicatePrerequisites.length) errors.push('Duplicate prerequisites detected');
  if (missingPrerequisites.length) errors.push('Missing prerequisite references detected');
  if (circularDependencies) errors.push('Circular dependencies detected');

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    duplicatePrerequisites: duplicatePrerequisites.length ? duplicatePrerequisites : undefined,
    missingPrerequisites: missingPrerequisites.length ? missingPrerequisites : undefined,
    selfDependencies: selfDependencies.length ? selfDependencies : undefined,
    circularDependencies,
  };
}

/** Detects circular dependencies in the roadmap graph. */
export function detectCircularDependencies(items: RoadmapItem[]): string[][] {
  const itemsMap = new Map<string, RoadmapItem>();
  items.forEach(item => itemsMap.set(item.id, item));

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(currentId: string, path: string[]) {
    if (recStack.has(currentId)) {
      const idx = path.indexOf(currentId);
      if (idx !== -1) cycles.push([...path.slice(idx), currentId]);
      return;
    }
    if (visited.has(currentId)) return;
    visited.add(currentId);
    recStack.add(currentId);
    const item = itemsMap.get(currentId);
    if (item) {
      (item.prerequisites ?? []).forEach(prId => dfs(prId, [...path, currentId]));
    }
    recStack.delete(currentId);
  }

  items.forEach(item => dfs(item.id, []));
  return cycles;
}

/** Returns topics eligible for study (not completed and all prerequisites completed). */
export function getEligibleTopics(items: RoadmapItem[]): RoadmapItem[] {
  const itemsMap = new Map<string, RoadmapItem>();
  items.forEach(item => itemsMap.set(item.id, item));

  return items.filter(item => {
    if (item.completionState === 'Completed') return false;
    const prereqs = item.prerequisites ?? [];
    return prereqs.every(pid => {
      const prereq = itemsMap.get(pid);
      return prereq ? prereq.completionState === 'Completed' : true;
    });
  });
}
