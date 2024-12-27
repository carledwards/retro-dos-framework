# Input Services Module

The input services module provides DOS-style keyboard and mouse input handling for retro UI applications. It includes keyboard service, mouse service, and color utilities for handling DOS-style input interactions.

## Features

### Keyboard Service

The keyboard service provides DOS-style keyboard input handling similar to INT 16h services in DOS:

- Key press and release detection
- Modifier key tracking (Ctrl, Alt, Shift, Meta)
- Event-based input handling
- State management for current keyboard status
- Cleanup utilities for proper event listener management

### Mouse Service

The mouse service provides DOS-style mouse input handling similar to INT 33h services in DOS:

- Mouse movement tracking in character cell coordinates
- Button press and release detection
- Double-click detection
- Mouse cursor visibility management
- Event-based input handling
- State management for current mouse status
- Cleanup utilities for proper event listener management

### Color Utilities

Color utilities for DOS-style color handling:

- DOS color palette management
- Color conversion utilities (index to hex, hex to RGB)
- Color inversion with DOS palette matching

## Usage Example

```typescript
import { createInputServices } from '@retro-dos/retro-ui-lib/input';
import { VideoBuffer } from '@retro-dos/retro-ui-lib/video';

// Create a video buffer and canvas
const buffer = new VideoBuffer(80, 25);
const canvas = document.createElement('canvas');

// Initialize input services
const inputServices = createInputServices(buffer, canvas);

// Add mouse state listener
inputServices.mouse.addListener((state) => {
  if (state.position) {
    console.log(`Mouse at: (${state.position.x}, ${state.position.y})`);
  }
  console.log(`Button: ${state.isButtonDown ? 'Pressed' : 'Released'}`);
});

// Add keyboard state listener
inputServices.keyboard.addListener((state) => {
  if (state.lastKeyPressed) {
    console.log(`Key pressed: ${state.lastKeyPressed}`);
  }
  if (state.modifiers.ctrl) {
    console.log('Ctrl is held');
  }
});

// Clean up when done
inputServices.cleanup();
```

## Event System Integration

The input services integrate with the event coordinator system to provide a unified event handling approach:

- Mouse events (MOUSE_MOVE, MOUSE_DOWN, MOUSE_UP, MOUSE_DRAG, MOUSE_DOUBLE_CLICK)
- Keyboard events (KEY_DOWN, KEY_UP)
- Cursor visibility events (SHOW_CURSOR, HIDE_CURSOR)

Events include additional data such as:
- Timestamps
- Priority levels
- Source identification
- Position information (for mouse events)
- Key information (for keyboard events)
- Modifier states

See the input-demo example in the examples directory for a complete demonstration of the input services capabilities.
