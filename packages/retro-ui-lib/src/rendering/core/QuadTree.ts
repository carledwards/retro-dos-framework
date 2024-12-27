import { Region } from '../types';

/**
 * QuadTree implementation for efficient dirty region tracking
 */
export class QuadTree {
  private maxDepth: number;
  private maxObjects: number;
  private bounds: Region;
  private objects: Region[] = [];
  private nodes: QuadTree[] = [];
  private depth: number;

  constructor(bounds: Region, maxDepth = 4, maxObjects = 10, depth = 0) {
    this.bounds = bounds;
    this.maxDepth = maxDepth;
    this.maxObjects = maxObjects;
    this.depth = depth;
  }

  /**
   * Clear the quadtree
   */
  clear(): void {
    this.objects = [];
    this.nodes.forEach(node => node.clear());
    this.nodes = [];
  }

  /**
   * Split the node into 4 subnodes
   */
  private split(): void {
    const halfWidth = this.bounds.width / 2;
    const halfHeight = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;

    this.nodes = [
      // Top right
      new QuadTree(
        { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
        this.maxDepth,
        this.maxObjects,
        this.depth + 1
      ),
      // Top left
      new QuadTree(
        { x, y, width: halfWidth, height: halfHeight },
        this.maxDepth,
        this.maxObjects,
        this.depth + 1
      ),
      // Bottom left
      new QuadTree(
        { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this.maxDepth,
        this.maxObjects,
        this.depth + 1
      ),
      // Bottom right
      new QuadTree(
        { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this.maxDepth,
        this.maxObjects,
        this.depth + 1
      )
    ];
  }

  /**
   * Get index of the node that contains the region
   */
  private getIndex(region: Region): number {
    const midX = this.bounds.x + (this.bounds.width / 2);
    const midY = this.bounds.y + (this.bounds.height / 2);

    const topQuadrant = (region.y < midY && region.y + region.height < midY);
    const bottomQuadrant = (region.y > midY);

    if (region.x < midX && region.x + region.width < midX) {
      if (topQuadrant) return 1;
      if (bottomQuadrant) return 2;
    } else if (region.x > midX) {
      if (topQuadrant) return 0;
      if (bottomQuadrant) return 3;
    }

    return -1;
  }

  /**
   * Insert a region into the quadtree
   */
  insert(region: Region): void {
    if (this.nodes.length > 0) {
      const index = this.getIndex(region);
      if (index !== -1) {
        this.nodes[index].insert(region);
        return;
      }
    }

    this.objects.push(region);

    if (this.objects.length > this.maxObjects && this.depth < this.maxDepth) {
      if (this.nodes.length === 0) {
        this.split();
      }

      let i = 0;
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i]);
        if (index !== -1) {
          const removed = this.objects.splice(i, 1)[0];
          this.nodes[index].insert(removed);
        } else {
          i++;
        }
      }
    }
  }

  /**
   * Get all regions that could collide with the given region
   */
  retrieve(region: Region): Region[] {
    const index = this.getIndex(region);
    let returnObjects = this.objects;

    if (this.nodes.length > 0) {
      if (index !== -1) {
        returnObjects = returnObjects.concat(this.nodes[index].retrieve(region));
      } else {
        // Region overlaps multiple quadrants
        for (const node of this.nodes) {
          returnObjects = returnObjects.concat(node.retrieve(region));
        }
      }
    }

    return returnObjects;
  }

  /**
   * Merge overlapping or adjacent regions
   */
  mergeRegions(): Region[] {
    const regions = this.getAllRegions();
    const merged: Region[] = [];
    
    while (regions.length > 0) {
      let current = regions.pop()!;
      let mergedSomething = true;

      while (mergedSomething) {
        mergedSomething = false;
        for (let i = regions.length - 1; i >= 0; i--) {
          const region = regions[i];
          if (this.canMergeRegions(current, region)) {
            current = this.mergeRegion(current, region);
            regions.splice(i, 1);
            mergedSomething = true;
          }
        }
      }
      merged.push(current);
    }

    return merged;
  }

  /**
   * Get all regions in the quadtree
   */
  private getAllRegions(): Region[] {
    let regions = [...this.objects];
    for (const node of this.nodes) {
      regions = regions.concat(node.getAllRegions());
    }
    return regions;
  }

  /**
   * Check if two regions can be merged
   */
  private canMergeRegions(a: Region, b: Region): boolean {
    // Check if regions are adjacent or overlapping
    return !(a.x + a.width < b.x ||
             b.x + b.width < a.x ||
             a.y + a.height < b.y ||
             b.y + b.height < a.y);
  }

  /**
   * Merge two regions into one
   */
  private mergeRegion(a: Region, b: Region): Region {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const width = Math.max(a.x + a.width, b.x + b.width) - x;
    const height = Math.max(a.y + a.height, b.y + b.height) - y;
    return { x, y, width, height };
  }
}
