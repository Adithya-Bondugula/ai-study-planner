import { useAppStore } from '../stores/useAppStore';
import { Project } from '../types';

export const projectRepository = {
  getProjects(): Project[] {
    return useAppStore.getState().projects;
  },

  addProject(project: Project): void {
    useAppStore.getState().addProject(project);
  },

  updateProject(projectId: string, updates: Partial<Project>): void {
    useAppStore.getState().updateProject(projectId, updates);
  },

  deleteProject(projectId: string): void {
    useAppStore.getState().deleteProject(projectId);
  }
};
