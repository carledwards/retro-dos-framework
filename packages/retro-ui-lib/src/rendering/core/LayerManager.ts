import { IVideoBuffer, CellAttributes } from '../../video';
import { QuadTree } from './QuadTree';
import { Region, Layer, LayerConfig, CellContent } from '../types';

export abstract class BaseLayerManager {
  protected videoBuffer: IVideoBuffer;
  protected layers: Map<string, Layer & { dirtyRegions: QuadTree }>;
  protected bufferSize: { width: number; height: number };
  protected maxDepth: number;
  protected maxObjects: number;

  constructor(videoBuffer: IVideoBuffer, config: LayerConfig) {
    this.videoBuffer = videoBuffer;
    this.bufferSize = {
      width: config.width,
      height: config.height
    };
    this.maxDepth = config.maxDepth || 4;
    this.maxObjects = config.maxObjects || 10;
    this.layers = new Map();
  }

  /**
   * Register a new layer
   */
  protected registerLayer(layer: Layer): void {
    this.layers.set(layer.id, {
      ...layer,
      dirtyRegions: new QuadTree(
        {
          x: 0,
          y: 0,
          width: this.bufferSize.width,
          height: this.bufferSize.height
        },
        this.maxDepth,
        this.maxObjects
      )
    });
  }

  /**
   * Mark a region as dirty for a specific layer
   */
  markDirty(layerId: string, region: Region): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.dirtyRegions.insert(region);
    }
  }

  /**
   * Check if a point is within buffer bounds
   */
  protected isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.bufferSize.width && y >= 0 && y < this.bufferSize.height;
  }

  /**
   * Get the visible portion of a region
   */
  protected getVisibleRegion(region: Region): Region | null {
    const visibleX = Math.max(0, region.x);
    const visibleY = Math.max(0, region.y);
    const visibleRight = Math.min(region.x + region.width, this.bufferSize.width);
    const visibleBottom = Math.min(region.y + region.height, this.bufferSize.height);

    if (visibleRight <= visibleX || visibleBottom <= visibleY) {
      return null;
    }

    return {
      x: visibleX,
      y: visibleY,
      width: visibleRight - visibleX,
      height: visibleBottom - visibleY
    };
  }

  /**
   * Write content to the video buffer
   */
  protected writeContent(x: number, y: number, content: CellContent): void {
    if (this.isInBounds(x, y)) {
      this.videoBuffer.writeChar(x, y, content.char, content.attributes);
    }
  }

  /**
   * Get dirty regions for a specific layer
   */
  getDirtyRegions(layerId: string): Region[] {
    const layer = this.layers.get(layerId);
    return layer ? layer.dirtyRegions.mergeRegions() : [];
  }

  /**
   * Clear dirty regions for a specific layer
   */
  clearDirtyRegions(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.dirtyRegions.clear();
    }
  }

  /**
   * Set layer visibility
   */
  setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.visible = visible;
    }
  }

  /**
   * Check if a region needs redraw
   */
  needsRedraw(layerId: string, region: Region): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;

    const overlappingRegions = layer.dirtyRegions.retrieve(region);
    return overlappingRegions.length > 0;
  }

  /**
   * Draw all layers in order
   * This method should be implemented by derived classes to handle
   * layer-specific drawing logic
   */
  abstract draw(): void;

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.layers.clear();
  }
}
