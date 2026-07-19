import { useAppStore } from '../stores/useAppStore';
import { JobApplication, Flashcard } from '../types';

export const careerRepository = {
  getApplications(): JobApplication[] {
    return useAppStore.getState().applications;
  },

  addApplication(app: JobApplication): void {
    useAppStore.getState().addApplication(app);
  },

  updateApplication(appId: string, updates: Partial<JobApplication>): void {
    useAppStore.getState().updateApplication(appId, updates);
  },

  deleteApplication(appId: string): void {
    useAppStore.getState().deleteApplication(appId);
  },

  getFlashcards(): Flashcard[] {
    return useAppStore.getState().flashcards;
  },

  addFlashcard(card: Flashcard): void {
    useAppStore.getState().addFlashcard(card);
  },

  updateFlashcard(cardId: string, updates: Partial<Flashcard>): void {
    useAppStore.getState().updateFlashcard(cardId, updates);
  },

  deleteFlashcard(cardId: string): void {
    useAppStore.getState().deleteFlashcard(cardId);
  }
};
