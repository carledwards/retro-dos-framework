import { VideoBuffer } from '../../src/video';
import { BorderUI } from '../../src/game/BorderUI';
import { DOS_COLORS, DOS_PALETTE } from '../../src/game/DosColors';

// Set up the canvas
const canvas = document.getElementById('screen') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Configure dimensions (character size is 9x16)
const CHAR_WIDTH = 9;
const CHAR_HEIGHT = 16;
const COLS = 62;
const ROWS = 25;

// Set canvas size
canvas.width = COLS * CHAR_WIDTH;
canvas.height = ROWS * CHAR_HEIGHT;

// Create video buffer
const buffer = new VideoBuffer(COLS, ROWS);

// Create border UI
const border = new BorderUI(buffer, {
    width: COLS,
    height: ROWS,
    color: DOS_COLORS.LIGHT_CYAN,
    backgroundColor: DOS_COLORS.BLACK
});

// Draw the border structure
border.draw();

// Set content in header areas
border.setTitle("SPACE INVADERS", {
    foreground: DOS_COLORS.WHITE,
    background: DOS_COLORS.BLACK,
    blink: false
});

border.setCell1("SCORE: 1000", {
    foreground: DOS_COLORS.YELLOW,
    background: DOS_COLORS.BLACK,
    blink: false
});

border.setCell2("LEVEL: 5", {
    foreground: DOS_COLORS.GREEN,
    background: DOS_COLORS.BLACK,
    blink: false
});

border.setCell3("LIVES: 3", {
    foreground: DOS_COLORS.RED,
    background: DOS_COLORS.BLACK,
    blink: false
});

// Animation loop
function render() {
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw video buffer to canvas
    const { cells } = buffer.getBufferData();
    
    // Clear canvas
    ctx.fillStyle = DOS_PALETTE[DOS_COLORS.BLACK];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw cells
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const cell = cells[y][x];
            if (cell) {
                // Draw background
                const bgColor = DOS_PALETTE[cell.attributes.background];
                ctx.fillStyle = bgColor;
                ctx.fillRect(x * CHAR_WIDTH, y * CHAR_HEIGHT, CHAR_WIDTH, CHAR_HEIGHT);
                
                // Draw character
                if (cell.char !== ' ') {
                    const fgColor = DOS_PALETTE[cell.attributes.foreground];
                    ctx.fillStyle = fgColor;
                    ctx.font = `${Math.floor(CHAR_HEIGHT * 0.75)}px DOS`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    ctx.fillText(
                        cell.char,
                        x * CHAR_WIDTH + Math.floor(CHAR_WIDTH * 0.1),
                        y * CHAR_HEIGHT + Math.floor(CHAR_HEIGHT * 0.1)
                    );
                }
            }
        }
    }

    requestAnimationFrame(render);
}

// Start rendering
render();
