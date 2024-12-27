import { BufferData, CellAttributes, Character, DirtyRegion, IVideoBuffer } from './types';
import { doRegionsOverlap, mergeRegions, areRegionsAdjacent } from './regions';

export class VideoBuffer implements IVideoBuffer {
  private width: number;
  private height: number;
  private buffer: (Character | null)[][];
  private cursor: {
    x: number;
    y: number;
    visible: boolean;
    blinking: boolean;
    lastBlinkTime?: number;
  };
  private dirtyRegions: DirtyRegion[];
  private batchMode: boolean;
  private batchRegions: DirtyRegion[];

  constructor(width: number = 80, height: number = 25) {
    this.width = width;
    this.height = height;
    this.buffer = Array(height).fill(null).map(() => Array(width).fill(null));
    this.cursor = {
      x: 0,
      y: 0,
      visible: true,
      blinking: true
    };
    this.dirtyRegions = [];
    this.batchRegions = [];
    this.batchMode = false;
  }

  writeChar(x: number, y: number, char: string, attributes: CellAttributes): void {
    // Silently ignore out-of-bounds writes
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    const cell: Character = {
      char: char[0], // Take only first character if string is longer
      attributes
    };

    this.buffer[y][x] = cell;
    this.markDirty(x, y, 1, 1);
  }

  getChar(x: number, y: number): Character | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.buffer[y][x];
  }

  resize(width: number, height: number): void {
    const newBuffer = Array(height).fill(null).map(() => Array(width).fill(null));
    
    // Copy existing content
    for (let y = 0; y < Math.min(height, this.height); y++) {
      for (let x = 0; x < Math.min(width, this.width); x++) {
        newBuffer[y][x] = this.buffer[y][x];
      }
    }

    this.width = width;
    this.height = height;
    this.buffer = newBuffer;
    this.markDirty(0, 0, width, height);

    // Adjust cursor if it's now out of bounds
    this.cursor.x = Math.min(this.cursor.x, width - 1);
    this.cursor.y = Math.min(this.cursor.y, height - 1);
  }

  clear(): void {
    // Only mark regions as dirty where there was actual content
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.buffer[y][x] !== null) {
          this.markDirty(x, y, 1, 1);
        }
      }
    }
    this.buffer = Array(this.height).fill(null).map(() => Array(this.width).fill(null));
  }

  setCursorPosition(x: number, y: number): void {
    // Silently ignore out-of-bounds cursor positions
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    
    // Mark old and new cursor positions as dirty
    this.markDirty(this.cursor.x, this.cursor.y, 1, 1);
    this.markDirty(x, y, 1, 1);
    
    this.cursor.x = x;
    this.cursor.y = y;
  }

  getCursorPosition(): { x: number; y: number } {
    return { x: this.cursor.x, y: this.cursor.y };
  }

  setCursorVisible(visible: boolean): void {
    if (this.cursor.visible !== visible) {
      this.cursor.visible = visible;
      this.markDirty(this.cursor.x, this.cursor.y, 1, 1);
    }
  }

  setCursorBlinking(blinking: boolean): void {
    if (this.cursor.blinking !== blinking) {
      this.cursor.blinking = blinking;
      this.markDirty(this.cursor.x, this.cursor.y, 1, 1);
    }
  }

  beginBatch(): void {
    this.batchMode = true;
    this.batchRegions = [];
  }

  endBatch(): void {
    this.batchMode = false;
    
    // Merge batch regions into main dirty regions
    if (this.batchRegions.length > 0) {
      this.optimizeAndAddRegions(this.batchRegions);
      this.batchRegions = [];
    }
  }

  flush(): DirtyRegion[] {
    // Move current dirty regions to a temporary array
    const regionsToProcess = [...this.dirtyRegions];
    // Clear the dirty regions
    this.dirtyRegions = [];
    // Return the regions that need processing
    return regionsToProcess;
  }

  getBufferData(): BufferData {
    // Handle cursor blinking
    if (this.cursor.visible && this.cursor.blinking) {
      const now = performance.now();
      const blinkPhase = Math.floor(now / 500) % 2;
      
      // If blink phase changed, mark cursor region as dirty
      if (!this.cursor.lastBlinkTime || 
          Math.floor(this.cursor.lastBlinkTime / 500) !== Math.floor(now / 500)) {
        this.markDirty(this.cursor.x, this.cursor.y, 1, 1);
        this.cursor.lastBlinkTime = now;
      }
    }

    return {
      width: this.width,
      height: this.height,
      cells: this.buffer,
      cursor: { ...this.cursor }
    };
  }

  getDirtyRegions(): DirtyRegion[] {
    // Return and clear dirty regions, same as flush
    const regions = [...this.dirtyRegions];
    this.dirtyRegions = [];
    return regions;
  }

  private markDirty(x: number, y: number, width: number, height: number): void {
    const newRegion: DirtyRegion = { x, y, width, height };
    
    if (this.batchMode) {
      this.batchRegions.push(newRegion);
    } else {
      this.optimizeAndAddRegions([newRegion]);
    }
  }

  private optimizeAndAddRegions(newRegions: DirtyRegion[]): void {
    let regions = [...this.dirtyRegions, ...newRegions];
    let optimized: DirtyRegion[] = [];
    let merged: boolean;

    // Keep merging regions until no more merges are possible
    do {
      merged = false;
      
      while (regions.length > 0) {
        const current = regions.pop()!;
        let mergedCurrent = false;
        
        // Try to merge with existing optimized regions
        for (let i = 0; i < optimized.length; i++) {
          if (doRegionsOverlap(current, optimized[i]) || 
              areRegionsAdjacent(current, optimized[i])) {
            // Merge regions and replace the existing one
            optimized[i] = mergeRegions(current, optimized[i]);
            mergedCurrent = true;
            merged = true;
            break;
          }
        }
        
        // If couldn't merge, add as new region
        if (!mergedCurrent) {
          optimized.push(current);
        }
      }
      
      // If any merges happened, try another pass
      if (merged) {
        regions = optimized;
        optimized = [];
      }
    } while (merged);

    this.dirtyRegions = optimized;
  }
}
