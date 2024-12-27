import { CellAttributes } from '../video';

/**
 * Represents a rectangular region in the buffer
 */
export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Represents a position in the buffer
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Represents a cell's content
 */
export interface CellContent {
  char: string;
  attributes: CellAttributes;
}

/**
 * Base interface for a renderable layer
 */
export interface Layer {
  id: string;
  zIndex: number;
  visible: boolean;
  type: string;
}

/**
 * Configuration for the layer system
 */
export interface LayerConfig {
  width: number;
  height: number;
  maxDepth?: number;
  maxObjects?: number;
}
