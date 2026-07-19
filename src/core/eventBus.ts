type EventCallback<T> = (data: T) => void;

/**
 * A strongly‑typed event bus.
 *
 * `E` is a map of event names to payload types (e.g. `AppEvents`).
 * Listeners are stored per‑event name and invoked with the correct payload.
 */
class TypedEventBus<E extends object> {
  private listeners: { [K in keyof E]?: EventCallback<E[K]>[] } = {};

  /** Register a listener for a specific event. Returns an unsubscribe function. */
  on<K extends keyof E>(event: K, callback: EventCallback<E[K]>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [] as EventCallback<E[K]>[];
    }
    (this.listeners[event] as EventCallback<E[K]>[]).push(callback);
    return () => {
      const arr = this.listeners[event] as EventCallback<E[K]>[] | undefined;
      if (arr) {
        this.listeners[event] = arr.filter(cb => cb !== callback);
      }
    };
  }

  /** Emit an event with a payload of the correct type. */
  emit<K extends keyof E>(event: K, data: E[K]): void {
    const eventListeners = this.listeners[event] as EventCallback<E[K]>[] | undefined;
    if (eventListeners) {
      for (const cb of eventListeners) {
        try {
          cb(data);
        } catch (error) {
          console.error(`Error in event listener for event "${String(event)}":`, error);
        }
      }
    }
  }

  /** Remove all listeners – useful for testing or resetting the bus. */
  clear(): void {
    this.listeners = {};
  }
}

export interface AppEvents {
  TASK_COMPLETED: { taskId: string; blockId: string; xp: number };
  STUDY_SESSION_COMPLETED: { durationMinutes: number; blockId: string; xp: number };
  INTERVIEW_SCHEDULED: { companyName: string; interviewDate: string; position: string };
  ROADMAP_ITEM_COMPLETED: { roadmapId: string; itemId: string };
  USER_LEVELED_UP: { newLevel: number; totalXp: number };
}

export const eventBus = new TypedEventBus<AppEvents>();