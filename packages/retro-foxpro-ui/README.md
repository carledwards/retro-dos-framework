# Retro FoxPro UI Framework

A modern implementation of a FoxPro DOS-style UI framework for building retro-style applications. This framework provides a complete window management system that mimics the look and feel of FoxPro DOS applications.

## Features

- FoxPro DOS-style window system
  - Floating windows with shadows
  - Dialog boxes
  - Window controls (close, maximize, resize)
  - Window dragging and resizing
- System menu bar
- Authentic DOS color scheme
- Character-based UI rendering
- Mouse and keyboard input handling
- High-performance layer-based rendering
- Intelligent dirty region tracking
- Efficient window caching

## Installation

```bash
npm install @retro-dos/foxpro-ui
```

## Dependencies

This package is part of the retro-dos-framework and requires:
- @retro-dos/video-buffer (Core buffer implementation)
- @retro-dos/input-services (Input handling)
- @retro-dos/event-coordinator (Event management)
- @retro-dos/renderer (Core rendering system)

## Architecture

The framework extends the core rendering system with FoxPro-specific implementations:

### Layer System
```
┌─────────────────┐
│ Cursor Layer    │ Z-Index: 3 - Mouse cursor with color inversion
├─────────────────┤
│ Window Layer    │ Z-Index: 2 - Windows and dialogs
├─────────────────┤
│ Shadow Layer    │ Z-Index: 1 - Window shadows
├─────────────────┤
│ Background Layer│ Z-Index: 0 - System background and menu bar
└─────────────────┘
```

Each layer:
- Extends the core layer management system
- Has its own dirty region tracking
- Can be independently updated
- Optimizes rendering by only redrawing changed areas
- Supports off-screen content

### Component Interaction
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Input        │     │ Event        │     │ UI           │
│ Services     │ ──► │ Coordinator  │ ──► │ Manager      │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                     │
                            │                     ▼
                            │              ┌──────────────┐
                            └─────────────►│ Window       │
                                         │ Manager      │
                                         └──────────────┘
                                               │
                                               ▼
                                         ┌──────────────┐
                                         │ FoxPro Layer │
                                         │ Manager      │
                                         └──────────────┘
                                               │
                                               ▼
                                         ┌──────────────┐
                                         │ Video        │
                                         │ Buffer       │
                                         └──────────────┘
```

## Performance Optimizations

### Layer-Based Rendering
- Extends core layer management system for FoxPro-specific needs
- Each UI element type has a dedicated layer
- Shadows are rendered in their own layer for efficient updates
- Layers are composited in order by z-index
- Only dirty regions are redrawn

### Window Caching
- Window content is cached until invalidated
- Cache is automatically invalidated on:
  - Window moves
  - Content changes
  - Style changes
  - Focus changes

### Dirty Region Tracking
- Uses core QuadTree-based region tracking
- Regions are merged when possible to minimize draw calls
- Only visible portions of regions are processed
- Supports off-screen content without errors

### Shadow Optimization
- Shadows are treated as companion elements to windows
- Shadow regions automatically track with parent windows
- Shadow effects are applied only to visible portions
- Efficient updates during window movement

## Basic Usage

```typescript
import { VideoBuffer } from '@retro-dos/video-buffer';
import { KeyboardService, MouseService } from '@retro-dos/input-services';
import { 
  UIManager, 
  WindowManager, 
  DefaultTheme 
} from '@retro-dos/foxpro-ui';

// Initialize canvas with recommended size
const canvas = document.getElementById('screen') as HTMLCanvasElement;
canvas.width = 1600;

// Initialize core services
const videoBuffer = new VideoBuffer(80, 25);
const keyboard = new KeyboardService();
const mouse = new MouseService(canvas);

// Initialize services
keyboard.initialize();
mouse.initialize();

// Create UI managers
const uiManager = new UIManager(videoBuffer, keyboard, mouse, canvas);
const windowManager = new WindowManager(videoBuffer, DefaultTheme);

// Create a window
const mainWindow = windowManager.createWindow(
  'Main Window',
  { x: 5, y: 5 },
  { width: 40, height: 15 }
);

// Render text in the window
uiManager.renderText(7, 6, [
  'Hello FoxPro UI!',
  '',
  'This is a simple example.'
]);

// Clean up on page unload
window.addEventListener('unload', () => {
  keyboard.cleanup();
  mouse.cleanup();
});
```

## Window Interaction Requirements

### Window Activation and Focus
- First click on an inactive window only activates it
- Exception: Clicking the title bar of an inactive window both activates and allows dragging
- All other interactions (close, maximize, resize) require the window to be already active
- The initial interaction type (e.g., drag) must be maintained throughout the operation

### Mouse Behavior
- Mouse cursor should be drawn last, on top of all windows
- Mouse cursor uses color inversion of the underlying content
- Windows can be dragged partially off-screen in any direction
- Mouse interaction type is determined by the initial click location
  - Title bar click -> drag operation
  - Resize handle click -> resize operation
  - These operations cannot transition to other types mid-interaction

### Window Controls
- Close button (×): Only active when window is active
- Maximize button (≡): Only active when window is active
- Resize handle (.): Only active when window is active
- Double-click on title bar: Maximizes/restores window (when active)

## Design Principles for AI Development

When extending or modifying this framework, follow these principles:

1. **User-First Abstractions**
   - The framework should handle system-level complexities
   - Users should only need to think about high-level UI concepts
   - Avoid exposing internal implementation details

2. **System Management**
   - Framework handles:
     - System menu and background drawing
     - Window management and interactions
     - Mouse cursor rendering and state
     - Color palette management
     - Canvas sizing and rendering
     - Layer management and compositing
     - Shadow effects and caching
   - Users shouldn't need to manage these directly

3. **Simple API Surface**
   - Focus on common use cases
   - Provide high-level methods for common tasks
   - Hide complexity behind intuitive interfaces

4. **Component Responsibilities**
   - UIManager: System-level UI management
   - WindowManager: Window creation and control
   - FoxProLayerManager: FoxPro-specific layer implementation
   - Each component has a clear, single responsibility

5. **Example-Driven Development**
   - Examples should be minimal but functional
   - Focus on showing common use cases
   - Demonstrate the framework's simplicity

## Guidelines for Framework Extensions

When adding new features:

1. **System Features vs User Features**
   - System features (menu bar, background) belong in UIManager
   - User features (windows, dialogs) belong in WindowManager
   - Keep rendering logic in FoxProLayerManager
   - Consider layer implications for new UI elements

2. **API Design**
   - Methods should be task-oriented
   - Hide implementation complexity
   - Provide sensible defaults
   - Example:
     ```typescript
     // Good: High-level, task-oriented
     windowManager.createDialog('Save File', { x, y }, { width, height });
     
     // Bad: Too low-level, exposes internals
     windowManager.createWindow();
     windowManager.setDialogBorder();
     windowManager.addButtons();
     ```

3. **State Management**
   - Framework manages:
     - Window state
     - System menu state
     - Mouse cursor state
     - Color attributes
     - Layer states and dirty regions
   - Users work with high-level concepts

4. **Event Handling**
   - Framework handles:
     - Mouse movement and clicks
     - Keyboard input
     - Window focus
     - System menu interaction
     - Layer updates and compositing
   - Users receive high-level events

## Example: Adding New Features

When adding features, follow this pattern:

1. **Identify the User Need**
   ```typescript
   // User wants to create a message box
   windowManager.showMessage('Save completed!');
   ```

2. **Handle Complexity Internally**
   ```typescript
   // Framework handles:
   // - Dialog creation
   // - Centering
   // - Button layout
   // - Event handling
   // - Layer management
   // - Shadow effects
   ```

3. **Provide Simple Interface**
   ```typescript
   // Simple options when needed
   windowManager.showMessage('Save completed!', {
     type: 'info',
     buttons: ['OK']
   });
   ```

## Contributing

This package is part of the retro-dos-framework monorepo. When contributing:

1. Follow the design principles above
2. Add/update tests
3. Update documentation
4. Ensure examples demonstrate usage
5. Consider performance implications
6. Maintain layer system integrity

## License

MIT
