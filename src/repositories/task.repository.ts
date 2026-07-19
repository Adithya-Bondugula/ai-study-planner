import { useAppStore } from '../stores/useAppStore';
import { StudyBlock, Task } from '../types';

export const taskRepository = {
  getBlocks(): StudyBlock[] {
    return useAppStore.getState().blocks;
  },

  addBlock(block: StudyBlock): void {
    useAppStore.getState().addBlock(block);
  },

  updateBlock(blockId: string, updates: Partial<StudyBlock>): void {
    useAppStore.getState().updateBlock(blockId, updates);
  },

  deleteBlock(blockId: string): void {
    useAppStore.getState().deleteBlock(blockId);
  },

  addTask(blockId: string, task: Task): void {
    useAppStore.getState().addTask(blockId, task);
  },

  updateTask(taskId: string, updates: Partial<Task>): void {
    useAppStore.getState().updateTask(taskId, updates);
  },

  deleteTask(taskId: string): void {
    useAppStore.getState().deleteTask(taskId);
  },

  toggleChecklistItem(taskId: string, itemId: string): void {
    useAppStore.getState().toggleChecklistItem(taskId, itemId);
  },

  logStudySession(
    blockId: string | undefined,
    taskId: string | undefined,
    durationMinutes: number,
    xpEarned: number,
    focusMode: boolean
  ): void {
    useAppStore.getState().logStudySession(blockId, taskId, durationMinutes, xpEarned, focusMode);
  }
};
