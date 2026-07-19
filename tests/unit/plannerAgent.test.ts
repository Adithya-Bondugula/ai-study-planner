import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/stores/useAppStore';
import { plannerAgent } from '../../src/agents/planner.agent';

describe('plannerAgent integration', () => {
  beforeEach(() => {
    // Reset Zustand store to default seeded mock state before each test
    useAppStore.getState().resetToDefaults();
  });

  it('should run daily planner schedule generation and update blocks', () => {
    const initialBlocks = useAppStore.getState().blocks;
    
    // Total tasks initial count
    const initialTaskCount = initialBlocks.flatMap(b => b.tasks || []).length;
    expect(initialTaskCount).toBeGreaterThan(0);

    // Run agent generator
    plannerAgent.generateDailySchedule();

    const updatedBlocks = useAppStore.getState().blocks;
    
    // Verify that updated blocks tasks list is populated
    const updatedTaskCount = updatedBlocks.flatMap(b => b.tasks || []).length;
    expect(updatedTaskCount).toBeGreaterThan(0);

    // Verify task blockId references align with parent block IDs
    updatedBlocks.forEach(block => {
      block.tasks?.forEach(task => {
        expect(task.blockId).toBe(block.id);
      });
    });
  });
});
