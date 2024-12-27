/**
 * DOS color codes
 */
export enum DosColor {
  BLACK = 0,
  BLUE = 1,
  GREEN = 2,
  CYAN = 3,
  RED = 4,
  MAGENTA = 5,
  BROWN = 6,
  LIGHT_GRAY = 7,
  DARK_GRAY = 8,
  LIGHT_BLUE = 9,
  LIGHT_GREEN = 10,
  LIGHT_CYAN = 11,
  LIGHT_RED = 12,
  LIGHT_MAGENTA = 13,
  YELLOW = 14,
  WHITE = 15
}

/**
 * Map of CSS color names/hex values to DOS color codes
 */
const colorMap: { [key: string]: number } = {
  'black': DosColor.BLACK,
  'blue': DosColor.BLUE,
  'green': DosColor.GREEN,
  'cyan': DosColor.CYAN,
  'red': DosColor.RED,
  'magenta': DosColor.MAGENTA,
  'brown': DosColor.BROWN,
  'lightgray': DosColor.LIGHT_GRAY,
  'gray': DosColor.DARK_GRAY,
  'darkgray': DosColor.DARK_GRAY,
  'lightblue': DosColor.LIGHT_BLUE,
  'lightgreen': DosColor.LIGHT_GREEN,
  'lightcyan': DosColor.LIGHT_CYAN,
  'lightred': DosColor.LIGHT_RED,
  'lightmagenta': DosColor.LIGHT_MAGENTA,
  'yellow': DosColor.YELLOW,
  'white': DosColor.WHITE,
  // Common hex values
  '#000000': DosColor.BLACK,
  '#0000AA': DosColor.BLUE,
  '#00AA00': DosColor.GREEN,
  '#00AAAA': DosColor.CYAN,
  '#AA0000': DosColor.RED,
  '#AA00AA': DosColor.MAGENTA,
  '#AA5500': DosColor.BROWN,
  '#AAAAAA': DosColor.LIGHT_GRAY,
  '#555555': DosColor.DARK_GRAY,
  '#5555FF': DosColor.LIGHT_BLUE,
  '#55FF55': DosColor.LIGHT_GREEN,
  '#55FFFF': DosColor.LIGHT_CYAN,
  '#FF5555': DosColor.LIGHT_RED,
  '#FF55FF': DosColor.LIGHT_MAGENTA,
  '#FFFF55': DosColor.YELLOW,
  '#FFFFFF': DosColor.WHITE
};

/**
 * Convert a CSS color (name or hex) to DOS color code
 */
export function cssColorToDos(color: string): number {
  // Normalize color string
  const normalizedColor = color.toLowerCase().trim();
  
  // Check direct mapping
  if (normalizedColor in colorMap) {
    return colorMap[normalizedColor];
  }

  // For hex colors not in the map, find the closest match
  if (normalizedColor.startsWith('#')) {
    // Convert hex to RGB
    const r = parseInt(normalizedColor.slice(1, 3), 16);
    const g = parseInt(normalizedColor.slice(3, 5), 16);
    const b = parseInt(normalizedColor.slice(5, 7), 16);

    // Find closest DOS color
    let closestColor = DosColor.WHITE;
    let minDistance = Number.MAX_VALUE;

    for (const [hexColor, dosColor] of Object.entries(colorMap)) {
      if (hexColor.startsWith('#')) {
        const hr = parseInt(hexColor.slice(1, 3), 16);
        const hg = parseInt(hexColor.slice(3, 5), 16);
        const hb = parseInt(hexColor.slice(5, 7), 16);

        const distance = Math.sqrt(
          Math.pow(r - hr, 2) +
          Math.pow(g - hg, 2) +
          Math.pow(b - hb, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestColor = dosColor;
        }
      }
    }

    return closestColor;
  }

  // Default to white if color not recognized
  return DosColor.WHITE;
}
