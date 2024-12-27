export interface CellAttributes {
  foreground: number;
  background: number;
  blink?: boolean;
}

export interface Character {
  char: string;
  attributes: CellAttributes;
}

export interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BufferData {
  width: number;
  height: number;
  cells: (Character | null)[][];
  cursor: {
    x: number;
    y: number;
    visible: boolean;
    blinking: boolean;
  };
}

// Core Video Buffer Interface
export interface IVideoBuffer {
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
  flush(): DirtyRegion[];
  
  // Data Access
  getBufferData(): BufferData;
  getDirtyRegions(): DirtyRegion[];
}
