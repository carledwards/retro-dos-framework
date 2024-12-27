import { CellAttributes, Region } from '@retro-dos/retro-ui-lib';
import { AnyWindowState } from '../types';

interface CachedWindow {
  id: string;
  content: { char: string; attributes: CellAttributes }[][];
  region: Region;
  lastUpdate: number;
  hash: string;
}

export class WindowCache {
  private cache: Map<string, CachedWindow>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Generate a hash for window state
   * This helps determine if window content needs to be redrawn
   */
  private generateWindowHash(window: AnyWindowState): string {
    return JSON.stringify({
      position: window.position,
      size: window.size,
      title: window.title,
      isActive: window.isActive,
      isMaximized: window.isMaximized,
      scrollPosition: window.scrollPosition
    });
  }

  /**
   * Check if window needs redraw by comparing current state with cached state
   */
  needsRedraw(window: AnyWindowState): boolean {
    const cached = this.cache.get(window.id);
    if (!cached) return true;

    const currentHash = this.generateWindowHash(window);
    return currentHash !== cached.hash;
  }

  /**
   * Get cached window content
   */
  getContent(windowId: string): { char: string; attributes: CellAttributes }[][] | null {
    const cached = this.cache.get(windowId);
    return cached ? cached.content : null;
  }

  /**
   * Update cache for a window
   */
  update(
    window: AnyWindowState,
    content: { char: string; attributes: CellAttributes }[][],
    region: Region
  ): void {
    this.cache.set(window.id, {
      id: window.id,
      content,
      region,
      lastUpdate: Date.now(),
      hash: this.generateWindowHash(window)
    });
  }

  /**
   * Remove window from cache
   */
  remove(windowId: string): void {
    this.cache.delete(windowId);
  }

  /**
   * Get cached region for a window
   */
  getRegion(windowId: string): Region | null {
    const cached = this.cache.get(windowId);
    return cached ? cached.region : null;
  }

  /**
   * Check if regions overlap
   */
  private regionsOverlap(a: Region, b: Region): boolean {
    return !(a.x + a.width <= b.x ||
             b.x + b.width <= a.x ||
             a.y + a.height <= b.y ||
             b.y + b.height <= a.y);
  }

  /**
   * Get all windows that overlap with a region
   */
  getOverlappingWindows(region: Region): string[] {
    const overlapping: string[] = [];
    
    for (const [id, cached] of this.cache.entries()) {
      if (this.regionsOverlap(region, cached.region)) {
        overlapping.push(id);
      }
    }

    return overlapping;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get last update time for a window
   */
  getLastUpdate(windowId: string): number {
    const cached = this.cache.get(windowId);
    return cached ? cached.lastUpdate : 0;
  }

  /**
   * Check if window content is cached
   */
  isCached(windowId: string): boolean {
    return this.cache.has(windowId);
  }

  /**
   * Get all cached window IDs
   */
  getCachedWindowIds(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Calculate total memory usage of cache (for debugging/monitoring)
   */
  calculateCacheSize(): number {
    let size = 0;
    for (const cached of this.cache.values()) {
      // Rough estimation: each cell takes ~10 bytes (char + attributes)
      size += cached.content.reduce((sum, row) => sum + row.length * 10, 0);
    }
    return size;
  }

  /**
   * Clean up old cache entries
   * @param maxAge Maximum age in milliseconds
   */
  cleanup(maxAge: number): void {
    const now = Date.now();
    for (const [id, cached] of this.cache.entries()) {
      if (now - cached.lastUpdate > maxAge) {
        this.cache.delete(id);
      }
    }
  }
}
