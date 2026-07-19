import { describe, it, expect, vi } from 'vitest';
import { eventBus } from '../../src/core/eventBus';

describe('TypedEventBus', () => {
  it('should notify subscriber when event is emitted', () => {
    const callback = vi.fn();
    
    // Subscribe
    const unsubscribe = eventBus.on('TASK_COMPLETED', callback);

    const payload = { taskId: 'task-1', blockId: 'block-1', xp: 50 };
    eventBus.emit('TASK_COMPLETED', payload);

    expect(callback).toHaveBeenCalledWith(payload);
    expect(callback).toHaveBeenCalledTimes(1);

    // Unsubscribe
    unsubscribe();
    eventBus.emit('TASK_COMPLETED', payload);
    
    // Callback should not be called again
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple subscribers independently', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const unsub1 = eventBus.on('USER_LEVELED_UP', callback1);
    const unsub2 = eventBus.on('USER_LEVELED_UP', callback2);

    const payload = { newLevel: 5, totalXp: 5000 };
    eventBus.emit('USER_LEVELED_UP', payload);

    expect(callback1).toHaveBeenCalledWith(payload);
    expect(callback2).toHaveBeenCalledWith(payload);

    unsub1();
    unsub2();
  });
});
