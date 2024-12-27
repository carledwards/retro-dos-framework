import { 
  IVideoBuffer, 
  CellAttributes,
  BaseLayerManager,
  Region,
  Layer,
  CellContent,
  LayerConfig
} from '@retro-dos/retro-ui-lib';
import { Theme, ColorAttributes } from '../types';
import { cssColorToDos } from '../colors';

export enum FoxProLayerType {
  Background = 'background',
  Shadow = 'shadow',
  Window = 'window',
  Cursor = 'cursor'
}

interface FoxProLayer extends Layer {
  id: string;
  type: string;
  zIndex: number;
  visible: boolean;
  cache?: {
    content: CellContent[][];
    lastUpdate: number;
  };
}

// Shadow offset constants
export const SHADOW_OFFSET = {
  x: 2,  // Right shadow width
  y: 1   // Bottom shadow height
};

export class FoxProLayerManager extends BaseLayerManager {
  private theme: Theme;
  readonly layerIds: Readonly<Record<FoxProLayerType, string>>;

  constructor(videoBuffer: IVideoBuffer, theme: Theme) {
    super(videoBuffer, {
      width: videoBuffer.getBufferData().width,
      height: videoBuffer.getBufferData().height,
      maxDepth: 4,
      maxObjects: 10
    });
    this.theme = theme;
    this.layerIds = {
      [FoxProLayerType.Background]: 'background',
      [FoxProLayerType.Shadow]: 'shadow',
      [FoxProLayerType.Window]: 'window',
      [FoxProLayerType.Cursor]: 'cursor'
    };

    this.initializeLayers();
  }

  protected registerFoxProLayer(layer: FoxProLayer): void {
    super.registerLayer(layer);
  }

  private initializeLayers(): void {
    // Background layer (z-index: 0)
    this.registerFoxProLayer({
      id: this.layerIds[FoxProLayerType.Background],
      type: FoxProLayerType.Background,
      zIndex: 0,
      visible: true
    } as FoxProLayer);

    // Shadow layer (z-index: 1)
    this.registerFoxProLayer({
      id: this.layerIds[FoxProLayerType.Shadow],
      type: FoxProLayerType.Shadow,
      zIndex: 1,
      visible: true
    } as FoxProLayer);

    // Window layer (z-index: 2)
    this.registerFoxProLayer({
      id: this.layerIds[FoxProLayerType.Window],
      type: FoxProLayerType.Window,
      zIndex: 2,
      visible: true
    } as FoxProLayer);

    // Cursor layer (z-index: 3)
    this.registerFoxProLayer({
      id: this.layerIds[FoxProLayerType.Cursor],
      type: FoxProLayerType.Cursor,
      zIndex: 3,
      visible: true
    } as FoxProLayer);
  }

  /**
   * Convert ColorAttributes to CellAttributes
   */
  private convertColors(colors: ColorAttributes): CellAttributes {
    return {
      foreground: cssColorToDos(colors.foreground),
      background: cssColorToDos(colors.background)
    };
  }

  /**
   * Create a shadow region for a window region
   */
  createShadowRegion(windowRegion: Region): Region {
    return {
      x: windowRegion.x + SHADOW_OFFSET.x,
      y: windowRegion.y + SHADOW_OFFSET.y,
      width: windowRegion.width,
      height: windowRegion.height
    };
  }

  /**
   * Mark window and its shadow as dirty
   */
  markWindowAndShadowDirty(windowRegion: Region): void {
    // Mark window region as dirty
    this.markDirty(this.layerIds[FoxProLayerType.Window], windowRegion);
    
    // Mark shadow region as dirty
    const shadowRegion = this.createShadowRegion(windowRegion);
    this.markDirty(this.layerIds[FoxProLayerType.Shadow], shadowRegion);
    
    // Mark background under both regions as dirty
    this.markDirty(this.layerIds[FoxProLayerType.Background], windowRegion);
    this.markDirty(this.layerIds[FoxProLayerType.Background], shadowRegion);
  }

  /**
   * Clear background layer dirty regions
   */
  private clearBackground(): void {
    this.clearDirtyRegions(this.layerIds[FoxProLayerType.Background]);
  }

  /**
   * Helper to check if two regions intersect
   */
  private regionsIntersect(r1: Region, r2: Region): boolean {
    return !(r2.x >= r1.x + r1.width ||
             r2.x + r2.width <= r1.x ||
             r2.y >= r1.y + r1.height ||
             r2.y + r2.height <= r1.y);
  }

  /**
   * Draw all layers in order
   */
  draw(): void {
    // Sort layers by z-index
    const sortedLayers = Array.from(this.layers.values())
      .sort((a, b) => a.zIndex - b.zIndex);

    // Draw each visible layer
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;

      switch (layer.type) {
        case FoxProLayerType.Background:
          this.clearBackground();
          break;
        case FoxProLayerType.Shadow:
        case FoxProLayerType.Window:
          // Drawing handled by WindowManager
          break;
        case FoxProLayerType.Cursor:
          // Process cursor layer dirty regions
          const dirtyRegions = this.getDirtyRegions(this.layerIds[FoxProLayerType.Cursor]);
          dirtyRegions.forEach((region: Region) => {
            const visibleRegion = this.getVisibleRegion(region);
            if (visibleRegion) {
              // Only mark the background layer as dirty if there's no window at this position
              const hasWindow = this.getDirtyRegions(this.layerIds[FoxProLayerType.Window])
                .some(windowRegion => this.regionsIntersect(visibleRegion, windowRegion));
              
              if (!hasWindow) {
                this.markDirty(this.layerIds[FoxProLayerType.Background], visibleRegion);
              }
            }
          });
          // Clear cursor layer dirty regions after processing
          this.clearDirtyRegions(this.layerIds[FoxProLayerType.Cursor]);
          break;
      }
    }
  }

  /**
   * Update the theme
   */
  updateTheme(theme: Theme): void {
    this.theme = theme;
    // Mark background as dirty to trigger redraw
    this.markDirty(this.layerIds[FoxProLayerType.Background], {
      x: 0,
      y: 0,
      width: this.bufferSize.width,
      height: this.bufferSize.height
    });
  }
}
