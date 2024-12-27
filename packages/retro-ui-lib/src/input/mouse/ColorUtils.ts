/**
 * DOS color palette utilities for input services
 */

export const DOS_PALETTE = [
  '#000000', // 0: Black
  '#0000AA', // 1: Blue
  '#00AA00', // 2: Green
  '#00AAAA', // 3: Cyan
  '#AA0000', // 4: Red
  '#AA00AA', // 5: Magenta
  '#AA5500', // 6: Brown
  '#AAAAAA', // 7: Light Gray
  '#555555', // 8: Dark Gray
  '#5555FF', // 9: Light Blue
  '#55FF55', // 10: Light Green
  '#55FFFF', // 11: Light Cyan
  '#FF5555', // 12: Light Red
  '#FF55FF', // 13: Light Magenta
  '#FFFF55', // 14: Yellow
  '#FFFFFF', // 15: White
] as const;

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert a DOS color index to its hex color value
 */
export const colorToHex = (colorIndex: number): string => {
  if (colorIndex < 0 || colorIndex >= DOS_PALETTE.length) {
    return DOS_PALETTE[7]; // Default to light gray if invalid
  }
  return DOS_PALETTE[colorIndex];
};

/**
 * Convert a hex color to RGB values
 */
export const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

/**
 * Invert a DOS color index
 */
export const invertColor = (colorIndex: number): number => {
  // Convert color index to hex
  const hex = colorToHex(colorIndex);
  // Remove # and convert to number
  const colorNum = parseInt(hex.slice(1), 16);
  // Perform bitwise NOT and ensure 24-bit result
  const inverted = ~colorNum & 0xFFFFFF;
  // Convert back to hex
  const invertedHex = '#' + inverted.toString(16).padStart(6, '0');
  
  // Find closest DOS color
  const rgb = hexToRgb(invertedHex);
  let closestIndex = 0;
  let smallestDiff = Number.MAX_VALUE;
  
  DOS_PALETTE.forEach((color, index) => {
    const paletteRgb = hexToRgb(color);
    // Simple RGB distance
    const diff = Math.abs(rgb.r - paletteRgb.r) +
                Math.abs(rgb.g - paletteRgb.g) +
                Math.abs(rgb.b - paletteRgb.b);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestIndex = index;
    }
  });
  
  return closestIndex;
};
