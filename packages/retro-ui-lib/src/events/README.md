# Events Module

The Events module provides a robust event coordination system for managing input and UI events in retro-style applications. It includes an event coordinator for handling event subscriptions and publishing, as well as cursor management utilities.

## Event Coordinator

The event coordinator manages the event system, handling event subscriptions and publishing with priority-based filtering.

### Features

- Event subscription with optional type filtering
- Priority-based event processing
- Wildcard event handling
- Automatic timestamp management
- Cleanup utilities

### Event Types

Events are categorized into two main types:

#### Input Events (Priority 100)
- Mouse Events
  - `MOUSE_MOVE`: Mouse movement
  - `MOUSE_DOWN`: Mouse button press
  - `MOUSE_UP`: Mouse button release
  - `MOUSE_DRAG`: Mouse drag operations
- Keyboard Events
  - `KEY_DOWN`: Key press
  - `KEY_UP`: Key release

#### UI Events (Priority 50)
- Cursor Events
  - `SHOW_CURSOR`: Display cursor
  - `HIDE_CURSOR`: Hide cursor
- System Events
  - `BUFFER_UPDATE`: Video buffer updates

### Event Priority System

Events are processed based on priority thresholds:
- High Priority (100): Input events
- Medium Priority (50): UI and system events
- Custom Priority: Configurable via subscription options

### Usage Example

```typescript
import { eventCoordinator, InputEventType, UIEventType } from '@retro-dos/ui-lib';

// Subscribe to specific event types
const unsubscribe = eventCoordinator.subscribe(
  (event) => {
    console.log(`Received event: ${event.type}`);
  },
  {
    eventTypes: [InputEventType.MOUSE_MOVE, InputEventType.KEY_DOWN],
    minPriority: 50
  }
);

// Subscribe to all events (wildcard)
eventCoordinator.subscribe((event) => {
  console.log(`Received any event: ${event.type}`);
});

// Publish an event
eventCoordinator.publish({
  type: InputEventType.MOUSE_MOVE,
  timestamp: Date.now(),
  priority: 100,
  source: 'mouse',
  data: {
    position: { x: 10, y: 20 }
  }
});

// Cleanup
unsubscribe();
// Or clear all subscriptions
eventCoordinator.clear();
```

## Cursor Management

The CursorManager provides automatic cursor visibility handling based on input events.

### Features

- Automatic cursor show/hide based on input
- Keyboard-triggered cursor hiding
- Configurable hide delay
- Event-based cursor state updates

### Usage Example

```typescript
import { getCursorManager } from '@retro-dos/ui-lib';

// Initialize with mouse service
const cursorManager = getCursorManager(mouseService);

// Cursor visibility is automatically managed based on:
// - Mouse movement (shows cursor)
// - Mouse clicks (shows cursor)
// - Keyboard input (hides cursor)
// - Inactivity timeout (hides cursor after delay)

// Cleanup when done
cursorManager.cleanup();
```

### Cursor Behavior

- Shows on:
  - Mouse movement
  - Mouse button press
  - Mouse drag operations
- Hides on:
  - Keyboard input (non-modifier keys)
  - Inactivity timeout (3 seconds)
- Maintains state between show/hide operations
- Emits events for cursor state changes

## Integration Example

Here's a complete example showing how to integrate both event coordination and cursor management:

```typescript
import { 
  eventCoordinator, 
  getCursorManager,
  InputEventType,
  UIEventType
} from '@retro-dos/ui-lib';

// Initialize services
const mouseService = // ... initialize mouse service
const cursorManager = getCursorManager(mouseService);

// Subscribe to cursor events
eventCoordinator.subscribe((event) => {
  if (event.type === UIEventType.SHOW_CURSOR) {
    console.log('Cursor shown at:', event.data.position);
  } else if (event.type === UIEventType.HIDE_CURSOR) {
    console.log('Cursor hidden');
  }
}, {
  eventTypes: [UIEventType.SHOW_CURSOR, UIEventType.HIDE_CURSOR]
});

// Subscribe to input events
eventCoordinator.subscribe((event) => {
  if (event.source === 'mouse') {
    console.log('Mouse event:', event.type);
  } else if (event.source === 'keyboard') {
    console.log('Keyboard event:', event.type);
  }
}, {
  eventTypes: [
    InputEventType.MOUSE_MOVE,
    InputEventType.MOUSE_DOWN,
    InputEventType.KEY_DOWN
  ]
});

// Cleanup
window.addEventListener('unload', () => {
  cursorManager.cleanup();
  eventCoordinator.clear();
});
```

## Demo

Check out the `examples/event-demo` directory for a complete working example that demonstrates:
- Event priority system
- Cursor management
- Input handling
- Real-time event logging
