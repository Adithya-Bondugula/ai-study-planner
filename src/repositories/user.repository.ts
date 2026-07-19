import { useAppStore } from '../stores/useAppStore';
import { UserProfile } from '../types';

export const userRepository = {
  getProfile(): UserProfile {
    return useAppStore.getState().profile;
  },

  updateProfile(updates: Partial<UserProfile>): void {
    useAppStore.getState().updateProfile(updates);
  },

  getAvailableHours(): number {
    return useAppStore.getState().availableHours;
  },

  setAvailableHours(hours: number): void {
    useAppStore.getState().setAvailableHours(hours);
  }
};
