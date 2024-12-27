# Types Module

This module provides shared TypeScript type definitions for the retro-ui-lib package. These common types are used throughout the framework to ensure type safety and provide better development experience.

Note: Module-specific types (like video buffer types) remain within their respective module directories. This module contains only shared types that are used across different modules.

## Available Types

### Base Events
- `BaseEvent`: Base interface that all events must implement
- `InputEvent`: Interface for input-related events
- `SystemUIEvent`: Interface for UI-related events
- `EventHandler`: Type for event handler functions
- `SubscriptionOptions`: Interface for event subscription options

### Input Types
Located in `input/` directory:

#### Mouse Types (`input/mouse.ts`)
- `MousePosition`: Interface for x,y coordinates
- `InputModifiers`: Interface for keyboard modifiers (ctrl, alt, shift, meta)
- `MouseState`: Interface for mouse state including position and button state
- `MouseEventListener`: Type for mouse event listener functions
- `IMouseService`: Interface for mouse service implementation
- `MouseEventType`: Enum for different types of mouse events
- `MouseEventData`: Interface for mouse event data

#### Keyboard Types (`input/keyboard.ts`)
- `KeyboardState`: Interface for keyboard state including last key pressed
- `KeyboardEventListener`: Type for keyboard event listener functions

### Event Types
- `InputEventType`: Enum for input event types (mouse and keyboard events)
- `UIEventType`: Enum for UI event types (cursor and buffer updates)

## Usage

Import types directly from the package:

```typescript
import { MouseState, KeyboardState, InputEvent } from 'retro-ui-lib';

// Example usage with mouse state
const mouseState: MouseState = {
  position: { x: 100, y: 100 },
  isVisible: true,
  isButtonDown: false,
  modifiers: {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false
  }
};

// Example usage with event handler
const handleInput: EventHandler<InputEvent> = (event) => {
  if (event.type === InputEventType.MOUSE_MOVE) {
    // Handle mouse move
  }
};
