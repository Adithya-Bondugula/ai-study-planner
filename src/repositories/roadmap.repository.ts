import { useAppStore } from '../stores/useAppStore';
import { Roadmap, RoadmapItem } from '../types';

export const roadmapRepository = {
  getRoadmaps(): Roadmap[] {
    return useAppStore.getState().roadmaps;
  },

  addRoadmap(roadmap: Roadmap): void {
    useAppStore.getState().addRoadmap(roadmap);
  },

  updateRoadmapItem(roadmapId: string, itemId: string, updates: Partial<RoadmapItem>): void {
    useAppStore.getState().updateRoadmapItem(roadmapId, itemId, updates);
  }
};
