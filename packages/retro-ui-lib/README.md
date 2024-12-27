# @retro-dos/retro-ui-lib

A comprehensive TypeScript library for building DOS-era style applications and user interfaces. This library combines multiple modules to provide a complete solution for retro-style UI development.

## Modules

### Events

The events module provides a comprehensive event coordination system:
- Priority-based event handling
- Input and UI event coordination
- Cursor management and visibility control
- Subscription system with type filtering
- Automatic timestamp management

[Read the Events documentation](src/events/README.md)

### Input Services

The input services module provides DOS-style keyboard and mouse input handling:
- Keyboard service (INT 16h style)
- Mouse service (INT 33h style)
- Color utilities for DOS-style colors
- Event-based input handling
- State management and cleanup utilities

[Read the Input Services documentation](src/input/README.md)

### Types

The types module provides shared TypeScript definitions used across modules:
- Input events (mouse and keyboard)
- UI events and state management
- Event handling and subscription
- Service interfaces

Note: Module-specific types remain within their respective modules (e.g., video buffer types are in the video module).

[Read the Types documentation](src/types/README.md)

### Video Buffer

The video buffer module provides a foundational text-mode buffer implementation with support for:
- Character-mode buffer operations (80x25 default)
- Color attributes (16 colors, foreground/background)
- Cursor management
- Performance optimizations through dirty region tracking
- Batch operations

[Read the Video Buffer documentation](src/video/README.md)

## Examples

### Input Demo
A demonstration of the input services capabilities:
- Mouse tracking and button states
- Keyboard input and modifier keys
- Event logging and state management
- Cursor visibility control

To run the demo:
```bash
npm run demo:input
```

### Raw Buffer Demo
A demonstration of the video buffer capabilities:
- Animated wave pattern with color gradients
- Cursor movement and visibility control
- Performance monitoring
- Interactive controls

To run the demo:
```bash
npm run demo:raw-buffer
```

### Event Demo
A demonstration of the event coordination system:
- Event priority handling
- Input and UI event coordination
- Cursor management
- Real-time event logging
- Interactive visualization

To run the demo:
```bash
npm run demo:event
```

## Installation

```bash
npm install @retro-dos/retro-ui-lib
```

## Usage

Import specific modules as needed:

```typescript
// Import event coordination
import { eventCoordinator, getCursorManager } from '@retro-dos/retro-ui-lib/events';

// Import input services
import { createInputServices } from '@retro-dos/retro-ui-lib/input';

// Import type definitions
import { MouseState, InputEvent, EventHandler } from '@retro-dos/retro-ui-lib/types';

// Set up event handling
eventCoordinator.subscribe((event) => {
  if (event.type === InputEventType.MOUSE_MOVE) {
    // Handle mouse movement
  }
}, {
  eventTypes: [InputEventType.MOUSE_MOVE],
  minPriority: 50
});

// Initialize input services
const inputServices = createInputServices(buffer, canvas);
inputServices.mouse.addListener((state) => {
  // Handle mouse state changes
});
inputServices.keyboard.addListener((state) => {
  // Handle keyboard state changes
});

// Import video buffer functionality
import { VideoBuffer, CellAttributes } from '@retro-dos/retro-ui-lib/video';

// Create and use a video buffer
const buffer = new VideoBuffer(80, 25);
buffer.writeChar(0, 0, 'A', {
  foreground: 7,  // Light gray
  background: 0   // Black
});
```

## Development

This package is part of the retro-dos-framework monorepo. When contributing:

1. Ensure all tests pass
2. Maintain proper TypeScript types
3. Update documentation for any changes
4. Follow the existing code style

## License

MIT
