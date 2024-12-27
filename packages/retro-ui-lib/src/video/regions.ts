import { DirtyRegion } from './types';

export function doRegionsOverlap(a: DirtyRegion, b: DirtyRegion): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

export function mergeRegions(a: DirtyRegion, b: DirtyRegion): DirtyRegion {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);
  
  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1
  };
}

export function areRegionsAdjacent(a: DirtyRegion, b: DirtyRegion): boolean {
  // Check if regions are touching horizontally or vertically
  const touchHorizontally = (
    (a.y === b.y && a.height === b.height) && // Same vertical position and height
    (a.x + a.width === b.x || b.x + b.width === a.x) // Adjacent horizontally
  );
  
  const touchVertically = (
    (a.x === b.x && a.width === b.width) && // Same horizontal position and width
    (a.y + a.height === b.y || b.y + b.height === a.y) // Adjacent vertically
  );
  
  return touchHorizontally || touchVertically;
}
