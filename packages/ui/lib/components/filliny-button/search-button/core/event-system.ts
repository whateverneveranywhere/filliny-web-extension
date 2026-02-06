/**
 * Event system for decoupled communication between modules
 *
 * This provides a centralized event bus that allows different parts of the system
 * to communicate without tight coupling. Follows the observer pattern.
 */

import type { EventListener, FieldDetectionEvent } from './types';

// ============================================================================
// EVENT BUS IMPLEMENTATION
// ============================================================================

class EventBus {
  private listeners = new Map<string, Set<EventListener>>();
  private onceListeners = new Map<string, Set<EventListener>>();

  /**
   * Subscribe to an event
   */
  on<T = unknown>(event: string, listener: EventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(listener as EventListener);

    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  /**
   * Subscribe to an event (one-time only)
   */
  once<T = unknown>(event: string, listener: EventListener<T>): () => void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }

    this.onceListeners.get(event)!.add(listener as EventListener);

    // Return unsubscribe function
    return () => this.offOnce(event, listener);
  }

  /**
   * Unsubscribe from an event
   */
  off<T = unknown>(event: string, listener: EventListener<T>): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener as EventListener);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Unsubscribe from a one-time event
   */
  private offOnce<T = unknown>(event: string, listener: EventListener<T>): void {
    const listeners = this.onceListeners.get(event);
    if (listeners) {
      listeners.delete(listener as EventListener);
      if (listeners.size === 0) {
        this.onceListeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   */
  async emit<T = unknown>(event: string, data: T): Promise<void> {
    const promises: Promise<void>[] = [];

    // Handle regular listeners
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        promises.push(this.safeExecuteListener(listener, data, event));
      }
    }

    // Handle one-time listeners
    const onceListeners = this.onceListeners.get(event);
    if (onceListeners) {
      const listenersArray = Array.from(onceListeners);
      this.onceListeners.delete(event); // Remove all once listeners

      for (const listener of listenersArray) {
        promises.push(this.safeExecuteListener(listener, data, event));
      }
    }

    // Wait for all listeners to complete
    await Promise.allSettled(promises);
  }

  /**
   * Safely execute a listener with error handling
   */
  private async safeExecuteListener(listener: EventListener, data: unknown, event: string): Promise<void> {
    try {
      await listener(data);
    } catch (error) {
      console.error(`Error in event listener for '${event}':`, error);
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    const regular = this.listeners.get(event)?.size || 0;
    const once = this.onceListeners.get(event)?.size || 0;
    return regular + once;
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): string[] {
    const events = new Set<string>();

    for (const event of this.listeners.keys()) {
      events.add(event);
    }

    for (const event of this.onceListeners.keys()) {
      events.add(event);
    }

    return Array.from(events);
  }
}

// ============================================================================
// GLOBAL EVENT BUS INSTANCE
// ============================================================================

export const eventBus = new EventBus();

// ============================================================================
// TYPED EVENT EMITTERS
// ============================================================================

/**
 * Emit field detection events
 */
export const emitFieldDetectionEvent = async (
  type: FieldDetectionEvent['type'],
  payload: FieldDetectionEvent['payload'],
): Promise<void> => {
  const event: FieldDetectionEvent = {
    type,
    payload,
    timestamp: Date.now(),
  };

  await eventBus.emit('field-detection', event);
  await eventBus.emit(`field-detection:${type}`, event);
};

/**
 * Subscribe to field detection events
 */
export const onFieldDetectionEvent = (listener: EventListener<FieldDetectionEvent>): (() => void) =>
  eventBus.on('field-detection', listener);

/**
 * Subscribe to specific field detection event types
 */
export const onFieldDetectionEventType = (
  type: FieldDetectionEvent['type'],
  listener: EventListener<FieldDetectionEvent>,
): (() => void) => eventBus.on(`field-detection:${type}`, listener);

// ============================================================================
// PERFORMANCE MONITORING EVENTS
// ============================================================================

export interface PerformanceEvent {
  operation: string;
  duration: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Emit performance monitoring events
 */
export const emitPerformanceEvent = async (
  operation: string,
  duration: number,
  metadata?: Record<string, unknown>,
): Promise<void> => {
  const event: PerformanceEvent = {
    operation,
    duration,
    metadata,
    timestamp: Date.now(),
  };

  await eventBus.emit('performance', event);
};

/**
 * Subscribe to performance events
 */
export const onPerformanceEvent = (listener: EventListener<PerformanceEvent>): (() => void) =>
  eventBus.on('performance', listener);

// ============================================================================
// ERROR EVENTS
// ============================================================================

export interface ErrorEvent {
  error: Error;
  context: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Emit error events
 */
export const emitErrorEvent = async (
  error: Error,
  context: string,
  metadata?: Record<string, unknown>,
): Promise<void> => {
  const event: ErrorEvent = {
    error,
    context,
    metadata,
    timestamp: Date.now(),
  };

  await eventBus.emit('error', event);
};

/**
 * Subscribe to error events
 */
export const onErrorEvent = (listener: EventListener<ErrorEvent>): (() => void) => eventBus.on('error', listener);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a performance-monitored function
 */
export const withPerformanceMonitoring = <T extends (...args: any[]) => any>(fn: T, operationName: string): T =>
  (async (...args: Parameters<T>) => {
    const startTime = performance.now();

    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;

      await emitPerformanceEvent(operationName, duration, {
        success: true,
        args: args.length,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      await emitPerformanceEvent(operationName, duration, {
        success: false,
        error: (error as Error).message,
      });

      await emitErrorEvent(error as Error, operationName);
      throw error;
    }
  }) as T;

/**
 * Create a debounced event emitter
 */
export const createDebouncedEmitter = <T>(eventName: string, delay: number = 300): ((data: T) => void) => {
  let timeout: NodeJS.Timeout;
  let latestData: T;

  return (data: T) => {
    latestData = data;
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      eventBus.emit(eventName, latestData);
    }, delay);
  };
};
