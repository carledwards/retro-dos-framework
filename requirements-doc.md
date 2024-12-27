# Retro Video Buffer Project Requirements

## Project Overview
A modern implementation of a retro-style video buffer system with a FoxPro-like UI framework, designed for building games and applications with a DOS-era aesthetic.

## Core Components

### 1. Retro Video Buffer (Base Layer)
#### Core Responsibilities
- Pure data management of character/attribute grid
- Cursor state management (position, visibility, blinking)
- Dirty region tracking for efficient updates
- Buffer resizing capabilities
- No direct rendering responsibilities
- Color attribute management
- Basic character writing operations

#### Video Buffer Interface
```typescript
interface IVideoBuffer {
  // Core Buffer Operations
  writeChar(x: number, y: number, char: string, attributes: CellAttributes): void;
  getChar(x: number, y: number): Character | null;
  resize(width: number, height: number): void;
  clear(): void;
  
  // Cursor Management
  setCursorPosition(x: number, y: number): void;
  getCursorPosition(): { x: number, y: number };
  setCursorVisible(visible: boolean): void;
  setCursorBlinking(blinking: boolean): void;
  
  // Performance Management
  beginBatch(): void;
  endBatch(): void;
  flush(): void;  // For dirty rectangle management
  
  // Data Access
  getBufferData(): BufferData;
  getDirtyRegions(): DirtyRegion[];
}
```

#### Explicitly Not Included
- Drawing primitives (boxes, lines) - moved to UI layer
- Canvas/rendering logic - moved to renderer
- Viewport management - moved to UI layer

### 2. Input Services
- Keyboard input handling
  - Key event management
  - Key state tracking
  - Key mapping support
- Mouse input handling
  - Mouse movement tracking
  - Button state management
  - Cursor management
- Event system integration
- Cross-browser compatibility

### 3. Renderer System
- Canvas rendering implementation
- Font management
- Color palette handling
- Cursor rendering
- Performance optimizations
- Scaling and resolution management

### 4. UI Framework (FoxPro-like Interface)
- Window management system
- Menu systems and dialog boxes
- Form controls (text fields, buttons, etc.)
- Support for overlaid modern graphics within windows
- Theming capabilities
- React-based component system
- Must use video buffer as its rendering target

### 5. Application Layer
- Support for building games and applications
- Example implementations
- Clear separation from underlying frameworks

## Technical Requirements

### Architecture
- Modular design with clear separation of concerns
- Initial development in monorepo structure (prepared for future separation)
- Package structure matching final intended repository layout
- Clean interfaces between layers

### Development Environment
- TypeScript-based implementation
- Monorepo tooling (Turborepo)
- Proper package management for future separation

### Package Structure
```
retro-dos-framework/
├── packages/
│   ├── retro-video-buffer/     # Core buffer implementation
│   │   └── examples/           # Example applications
│   │       └── raw-buffer-demo/# Raw buffer validation demo
│   ├── retro-input-services/   # Keyboard and mouse input handling
│   │   └── examples/           # Example applications
│   │       └── input-demo/     # Input services demo
│   ├── retro-renderer/         # Canvas rendering system
│   └── retro-ui/              # React-based UI components
```

### Example Applications
- Raw Buffer Demo
  - Validates core buffer functionality
  - Tests performance with animation
  - Demonstrates cursor management
  - Shows color attribute handling
  - Provides interactive controls
  - Monitors performance metrics
- Input Demo
  - Demonstrates keyboard and mouse input handling
  - Shows input event system
  - Tests cross-browser compatibility

## Feature Requirements

### Video Buffer
- Character-mode support (80x25 default)
- Color attributes (foreground/background)
- Viewport management
- Buffer manipulation primitives
- Remote viewing capability

### Input Services
- Keyboard event handling
- Mouse movement and button tracking
- Input state management
- Cross-browser compatibility
- Event system integration

### Renderer
- Support for custom fonts (particularly DOS-style fonts)
- Proper character aspect ratio maintenance
- Color palette management (DOS 16-color support minimum)
- Cursor rendering and blinking
- Support for different scaling modes

### UI Framework
- Window creation and management
- Dialog system
- Menu system
- Form controls
- Modern graphics overlay support
- Event system
- React component integration

### Performance Requirements
- Efficient dirty region tracking and updates
- Batched write operations support
- Smart cursor blinking management
- Optimal canvas rendering strategies
- Memory-efficient buffer management

### Cross-cutting Concerns
- Performance optimization
- Memory management
- Browser compatibility
- WebSocket communication
- Documentation requirements

## Future Considerations
- Potential split into separate repositories
- Package publishing strategy
- Version management
- Breaking changes policy
- Example application development

## Project Goals
1. Create reusable framework for retro-style applications
2. Maintain fun factor in development
3. Balance between authentic retro feel and modern capabilities
4. Keep architecture clean but not over-engineered

## Non-Goals
- Perfect DOS emulation
- Support for all historical features
- Terminal emulation
- Modern UI framework replacement

## Documentation Requirements
- API documentation
- Example code
- Architecture diagrams
- Development setup guides
- Contribution guidelines

## Testing Requirements
- Unit tests for each component
- Integration tests between layers
- Performance benchmarks
- Browser compatibility testing
