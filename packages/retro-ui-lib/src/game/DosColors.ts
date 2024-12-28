export const DOS_COLORS = {
    BLACK: 0,
    BLUE: 1,
    GREEN: 2,
    CYAN: 3,
    RED: 4,
    MAGENTA: 5,
    BROWN: 6,
    LIGHT_GRAY: 7,
    DARK_GRAY: 8,
    LIGHT_BLUE: 9,
    LIGHT_GREEN: 10,
    LIGHT_CYAN: 11,
    LIGHT_RED: 12,
    LIGHT_MAGENTA: 13,
    YELLOW: 14,
    WHITE: 15
} as const;

export const DOS_PALETTE = [
    '#000000', // BLACK
    '#0000aa', // BLUE
    '#00aa00', // GREEN
    '#00aaaa', // CYAN
    '#aa0000', // RED
    '#aa00aa', // MAGENTA
    '#aa5500', // BROWN
    '#aaaaaa', // LIGHT_GRAY
    '#555555', // DARK_GRAY
    '#5555ff', // LIGHT_BLUE
    '#55ff55', // LIGHT_GREEN
    '#55ffff', // LIGHT_CYAN
    '#ff5555', // LIGHT_RED
    '#ff55ff', // LIGHT_MAGENTA
    '#ffff55', // YELLOW
    '#ffffff'  // WHITE
] as const;

export function getPaletteColor(index: number): string {
    return DOS_PALETTE[index] || DOS_PALETTE[0];
}

export interface ColorAttributes {
    foreground: keyof typeof DOS_COLORS;
    background: keyof typeof DOS_COLORS;
}

export function getColorIndices(attrs: ColorAttributes): { foreground: number; background: number } {
    return {
        foreground: DOS_COLORS[attrs.foreground],
        background: DOS_COLORS[attrs.background]
    };
}
