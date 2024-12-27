import { VideoBuffer, CellAttributes } from '../../src/video';

// Canvas setup
const canvas = document.getElementById('screen') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Buffer setup
const COLS = 80;
const ROWS = 25;
const CELL_WIDTH = 9;
const CELL_HEIGHT = 16;

// Set canvas size
canvas.width = COLS * CELL_WIDTH;
canvas.height = ROWS * CELL_HEIGHT;

// Create video buffer
const buffer = new VideoBuffer(COLS, ROWS);

// DOS color palette
const PALETTE = [
    '#000000', '#0000aa', '#00aa00', '#00aaaa',
    '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa',
    '#555555', '#5555ff', '#55ff55', '#55ffff',
    '#ff5555', '#ff55ff', '#ffff55', '#ffffff'
];

// Performance tracking
let lastTime = performance.now();
let frames = 0;
let updates = 0;
let lastUpdateCount = 0;

// Animation state
let offset = 0;
const WAVE_CHARS = '~≈≋≈~'.split('');
let waveIndex = 0;
let isPaused = false;
let isCursorVisible = true;

// Setup pause button
const pauseButton = document.getElementById('pauseButton') as HTMLButtonElement;
pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
    if (!isPaused) {
        lastTime = performance.now(); // Reset time to avoid FPS spike
        requestAnimationFrame(animate);
    }
});

// Render the buffer to canvas
function render() {
    const { cells, cursor } = buffer.getBufferData();
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw cells
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const cell = cells[y][x];
            if (cell) {
                // Set background
                ctx.fillStyle = PALETTE[cell.attributes.background];
                ctx.fillRect(
                    x * CELL_WIDTH,
                    y * CELL_HEIGHT,
                    CELL_WIDTH,
                    CELL_HEIGHT
                );
                
                // Draw character
                ctx.fillStyle = PALETTE[cell.attributes.foreground];
                ctx.font = '16px monospace';
                ctx.textBaseline = 'top';
                ctx.fillText(
                    cell.char,
                    x * CELL_WIDTH,
                    y * CELL_HEIGHT
                );
            }
        }
    }
    
    // Draw cursor if visible
    if (cursor.visible) {
        const blinkPhase = Math.floor(performance.now() / 500) % 2;
        if (cursor.blinking === false || blinkPhase === 0) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(
                cursor.x * CELL_WIDTH,
                cursor.y * CELL_HEIGHT,
                CELL_WIDTH,
                2
            );
        }
    }
}

// Update animation
function update() {
    buffer.beginBatch();
    
    // Clear previous frame
    buffer.clear();
    
    // Draw moving wave pattern
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const wavePos = Math.abs(x + offset + Math.floor(Math.sin(y * 0.3) * 3)) % WAVE_CHARS.length;
            const char = WAVE_CHARS[wavePos] || '~';
            
            // Create color gradient
            const hue = ((x + y + offset) % COLS) / COLS;
            const fg = 9 + Math.floor(hue * 6); // Use bright colors (9-15)
            const bg = Math.floor(hue * 7); // Use dark colors (0-6)
            
            const attrs: CellAttributes = {
                foreground: fg,
                background: bg,
                blink: false
            };
            
            buffer.writeChar(x, y, char, attrs);
        }
    }
    
    // Move cursor in a circle
    const centerX = Math.floor(COLS / 2);
    const centerY = Math.floor(ROWS / 2);
    const radius = 5;
    const angle = (offset * 0.1) % (Math.PI * 2);
    
    const cursorX = centerX + Math.floor(Math.cos(angle) * radius);
    const cursorY = centerY + Math.floor(Math.sin(angle) * radius);
    
    buffer.setCursorPosition(cursorX, cursorY);
    
    buffer.endBatch();
    offset = (offset + 1) % 1000;
    updates++;
}

// Animation loop
function animate(time: number) {
    if (!isPaused) {
        update();
        render();
        requestAnimationFrame(animate);
    }
    
    // Update FPS counter
    frames++;
    if (time - lastTime >= 1000) {
        document.getElementById('fps')!.textContent = frames.toString();
        document.getElementById('updates')!.textContent = (updates - lastUpdateCount).toString();
        frames = 0;
        lastUpdateCount = updates;
        lastTime = time;
    }
}

// Setup cursor visibility toggle
const cursorButton = document.getElementById('cursorButton') as HTMLButtonElement;
cursorButton.addEventListener('click', () => {
    isCursorVisible = !isCursorVisible;
    cursorButton.textContent = isCursorVisible ? 'Hide Cursor' : 'Show Cursor';
    buffer.setCursorVisible(isCursorVisible);
    // Re-render even when paused to show cursor state change
    render();
});

// Start animation
buffer.setCursorVisible(isCursorVisible);
requestAnimationFrame(animate);
