# Video Buffer Module

A TypeScript implementation of a retro-style video buffer system, designed for building DOS-era style applications and games. This module provides the core buffer implementation with support for character/attribute management, cursor handling, and performance optimizations.

## Features

- Character-mode buffer (default 80x25)
- Color attribute support (foreground/background)
- Cursor management with visibility and blinking states
- Efficient dirty region tracking
- Batch operations support
- TypeScript-first implementation

## Usage

```typescript
import { VideoBuffer, CellAttributes } from '@retro-dos/retro-ui-lib/video';

// Create a new video buffer (default 80x25)
const buffer = new VideoBuffer();

// Write a character with attributes
const attributes: CellAttributes = {
  foreground: 7,  // Light gray
  background: 0,  // Black
  blink: false
};

// Write a single character
buffer.writeChar(0, 0, 'A', attributes);

// Batch multiple operations
buffer.beginBatch();
buffer.writeChar(0, 0, 'H', attributes);
buffer.writeChar(1, 0, 'e', attributes);
buffer.writeChar(2, 0, 'l', attributes);
buffer.writeChar(3, 0, 'l', attributes);
buffer.writeChar(4, 0, 'o', attributes);
buffer.endBatch();

// Get buffer data for rendering
const bufferData = buffer.getBufferData();
const dirtyRegions = buffer.getDirtyRegions();
```

## API Reference

### VideoBuffer

The main class implementing the IVideoBuffer interface.

#### Constructor

```typescript
constructor(width: number = 80, height: number = 25)
```

Creates a new video buffer with the specified dimensions.

#### Core Buffer Operations

##### writeChar
```typescript
writeChar(x: number, y: number, char: string, attributes: CellAttributes): void
```
Writes a character with attributes at the specified position.

##### getChar
```typescript
getChar(x: number, y: number): Character | null
```
Gets the character and its attributes at the specified position.

##### resize
```typescript
resize(width: number, height: number): void
```
Resizes the buffer, preserving existing content where possible.

##### clear
```typescript
clear(): void
```
Clears the entire buffer.

#### Cursor Management

##### setCursorPosition
```typescript
setCursorPosition(x: number, y: number): void
```
Sets the cursor position.

##### getCursorPosition
```typescript
getCursorPosition(): { x: number, y: number }
```
Gets the current cursor position.

##### setCursorVisible
```typescript
setCursorVisible(visible: boolean): void
```
Sets cursor visibility.

##### setCursorBlinking
```typescript
setCursorBlinking(blinking: boolean): void
```
Sets cursor blink state.

#### Performance Management

##### beginBatch
```typescript
beginBatch(): void
```
Starts a batch operation.

##### endBatch
```typescript
endBatch(): void
```
Ends a batch operation and processes updates.

##### flush
```typescript
flush(): void
```
Clears dirty regions after they've been processed.

#### Data Access

##### getBufferData
```typescript
getBufferData(): BufferData
```
Gets the complete buffer state.

##### getDirtyRegions
```typescript
getDirtyRegions(): DirtyRegion[]
```
Gets regions that have been modified since last flush.

### Types

#### CellAttributes
```typescript
interface CellAttributes {
  foreground: number;  // Color index (0-15)
  background: number;  // Color index (0-15)
  blink?: boolean;     // Optional blink state
}
```

#### Character
```typescript
interface Character {
  char: string;
  attributes: CellAttributes;
}
```

#### DirtyRegion
```typescript
interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}
