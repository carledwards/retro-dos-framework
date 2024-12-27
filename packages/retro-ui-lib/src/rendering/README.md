# Rendering Module

The rendering module provides a comprehensive system for managing layered rendering, cursor handling, and efficient dirty region tracking in retro-style applications.

## Core Components

### BaseLayerManager

An abstract base class for implementing layer-based rendering systems:

```typescript
import { BaseLayerManager } from '@retro-dos/retro-ui-lib/rendering';

class MyLayerManager extends BaseLayerManager {
  draw(): void {
    // Implement layer-specific drawing logic
  }
}
```

Features:
- Layer registration and management
- Dirty region tracking
- Visibility control
- Efficient region clipping
- Buffer bounds checking

### QuadTree

A spatial partitioning data structure for efficient dirty region tracking:

```typescript
import { QuadTree, Region } from '@retro-dos/retro-ui-lib/rendering';

const tree = new QuadTree({
  x: 0,
  y: 0,
  width: 80,
  height: 25
});

// Track dirty regions
tree.insert({ x: 0, y: 0, width: 10, height: 5 });

// Get merged regions for efficient redrawing
const regions = tree.mergeRegions();
```

Features:
- Region insertion and retrieval
- Automatic region merging
- Configurable depth and capacity
- Memory-efficient storage

### RenderCursorManager

Manages cursor rendering and visibility:

```typescript
import { RenderCursorManager } from '@retro-dos/retro-ui-lib/rendering';

const cursor = new RenderCursorManager({
  autoHideTimeout: 3000 // 3 seconds
});

// Update cursor position and content
cursor.update(
  { x: 10, y: 5 },
  {
    char: 'A',
    attributes: { foreground: 7, background: 0, blink: false }
  }
);
```

Features:
- Automatic cursor hiding
- Content preservation
- Color inversion
- Keyboard interaction handling
- Position tracking

## Types

### Region

Represents a rectangular area in the buffer:

```typescript
interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### Layer

Base interface for renderable layers:

```typescript
interface Layer {
  id: string;
  zIndex: number;
  visible: boolean;
  type: string;
}
```

### LayerConfig

Configuration for the layer system:

```typescript
interface LayerConfig {
  width: number;
  height: number;
  maxDepth?: number;
  maxObjects?: number;
}
```

## Usage Example

Here's a complete example showing how to use the rendering system:

```typescript
import {
  BaseLayerManager,
  QuadTree,
  RenderCursorManager,
  type Layer,
  type Region
} from '@retro-dos/retro-ui-lib/rendering';

// Create a custom layer manager
class MyLayerManager extends BaseLayerManager {
  draw(): void {
    // Sort layers by z-index
    const sortedLayers = Array.from(this.layers.values())
      .sort((a, b) => a.zIndex - b.zIndex);

    // Draw each visible layer
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;

      // Get dirty regions
      const regions = this.getDirtyRegions(layer.id);

      // Draw only dirty regions
      for (const region of regions) {
        this.drawRegion(layer, region);
      }

      // Clear dirty regions after drawing
      this.clearDirtyRegions(layer.id);
    }
  }

  private drawRegion(layer: Layer, region: Region): void {
    const visibleRegion = this.getVisibleRegion(region);
    if (!visibleRegion) return;

    // Draw the region content
    for (let y = visibleRegion.y; y < visibleRegion.y + visibleRegion.height; y++) {
      for (let x = visibleRegion.x; x < visibleRegion.x + visibleRegion.width; x++) {
        // Get content for this position and write to buffer
        const content = this.getContent(layer, x, y);
        this.writeContent(x, y, content);
      }
    }
  }
}
```

## Best Practices

1. **Layer Management**
   - Keep layer count reasonable (typically < 10)
   - Use appropriate z-index values
   - Clean up layers when no longer needed

2. **Dirty Region Tracking**
   - Mark only changed regions as dirty
   - Use the QuadTree's mergeRegions for efficient updates
   - Clear dirty regions after drawing

3. **Cursor Handling**
   - Update cursor position only when necessary
   - Handle cleanup properly
   - Consider auto-hide timeout for your use case

4. **Performance**
   - Minimize layer switches
   - Batch similar operations
   - Use clipping to avoid off-screen rendering
