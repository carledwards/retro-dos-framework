import {
  BaseEvent,
  InputEvent,
  SystemUIEvent,
  EventHandler,
  SubscriptionOptions,
  InputEventType,
  UIEventType
} from '../types';

// Re-export types
export type {
  BaseEvent,
  InputEvent,
  SystemUIEvent,
  EventHandler,
  SubscriptionOptions
};

export {
  InputEventType,
  UIEventType
};

/**
 * Event coordinator that manages the event system
 */
export class EventCoordinator {
  private handlers: Map<string, Set<EventHandler>>;
  private priorityThresholds: Map<string, number>;

  constructor() {
    this.handlers = new Map();
    this.priorityThresholds = new Map();
  }

  /**
   * Subscribe to events
   */
  subscribe(
    handler: EventHandler<InputEvent | SystemUIEvent>,
    options: SubscriptionOptions = {}
  ): () => void {
    const { eventTypes, minPriority = 0 } = options;

    // If no specific event types are provided, subscribe to all events
    const types = eventTypes || ['*'];

    types.forEach(type => {
      if (!this.handlers.has(type)) {
        this.handlers.set(type, new Set());
      }
      this.handlers.get(type)!.add(handler as EventHandler);
      
      // Set priority threshold if specified
      if (minPriority > 0) {
        this.priorityThresholds.set(type, minPriority);
      }
    });

    // Return unsubscribe function
    return () => {
      types.forEach(type => {
        const handlersSet = this.handlers.get(type);
        if (handlersSet) {
          handlersSet.delete(handler as EventHandler);
          if (handlersSet.size === 0) {
            this.handlers.delete(type);
            this.priorityThresholds.delete(type);
          }
        }
      });
    };
  }

  /**
   * Publish an event
   */
  publish(event: InputEvent | SystemUIEvent): void {
    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }

    // Get priority threshold for this event type
    const threshold = this.priorityThresholds.get(event.type) || 0;

    // Only process if event meets priority threshold
    if (event.priority >= threshold) {
      // Notify specific handlers
      const handlers = this.handlers.get(event.type);
      if (handlers) {
        handlers.forEach(handler => handler(event));
      }

      // Notify wildcard handlers
      const wildcardHandlers = this.handlers.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach(handler => handler(event));
      }
    }
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.handlers.clear();
    this.priorityThresholds.clear();
  }
}

// Create and export singleton instance
export const eventCoordinator = new EventCoordinator();

// Export UI components
export { CursorManager, getCursorManager } from './cursor/CursorManager';
