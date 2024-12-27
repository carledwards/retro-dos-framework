import { VideoBuffer, CellAttributes, createInputServices, eventCoordinator, InputEventType, UIEventType, getCursorManager, type InputEvent, type SystemUIEvent } from '@retro-dos/retro-ui-lib';

// Create and initialize the video buffer
const buffer = new VideoBuffer(80, 25);
const bufferElement = document.getElementById('buffer')!;
const statusElement = document.getElementById('status')!;
const eventLogElement = document.getElementById('event-log')!;

// Calculate dimensions for proper character sizing
const CHAR_ASPECT_RATIO = 1.6; // Standard DOS character aspect ratio
const CANVAS_WIDTH = 800;
const CHAR_WIDTH = Math.floor(CANVAS_WIDTH / buffer.getBufferData().width);
const CHAR_HEIGHT = Math.floor(CHAR_WIDTH * CHAR_ASPECT_RATIO);
const CANVAS_HEIGHT = CHAR_HEIGHT * buffer.getBufferData().height;

// Create a canvas for rendering
const canvas = document.createElement('canvas');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
canvas.style.border = '1px solid #333';
canvas.style.backgroundColor = '#000';
canvas.style.display = 'block';
canvas.style.margin = '0 auto';
bufferElement.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

// Initialize input services
const inputServices = createInputServices(buffer, canvas);

// Track cursor state
let cursorState = {
  isVisible: false,
  position: null as { x: number; y: number } | null,
  originalCell: null as { char: string; fg: number; bg: number } | null
};

// Generate CSS variables for extended colors (0-255)
const style = document.createElement('style');
let cssVars = ':root {\n';

// System 16 colors (0-15)
const systemColors = [
  '#000000', '#0000AA', '#00AA00', '#00AAAA',  // 0-3
  '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',  // 4-7
  '#555555', '#5555FF', '#55FF55', '#55FFFF',  // 8-11
  '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'   // 12-15
];

// Add system colors
systemColors.forEach((color, i) => {
  cssVars += `  --color-${i}: ${color};\n`;
});

// Generate extended colors (16-255)
for (let i = 16; i < 256; i++) {
  // Convert index to RGB
  let r = 0, g = 0, b = 0;
  
  if (i < 232) { // 216 colors: 16-231
    const j = i - 16;
    r = Math.floor(j / 36) * 51;
    g = Math.floor((j % 36) / 6) * 51;
    b = (j % 6) * 51;
  } else { // Grayscale: 232-255
    r = g = b = (i - 232) * 10 + 8;
  }

  cssVars += `  --color-${i}: #${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')};\n`;
}

cssVars += '}';
style.textContent = cssVars;
document.head.appendChild(style);

// Initialize buffer with content
function initializeBuffer() {
  const text = 'Event Coordination Demo - Watch events in the log below';
  const colors = [7, 15, 14, 13, 12, 11, 10, 9];
  
  // Create colorful border
  for (let x = 0; x < buffer.getBufferData().width; x++) {
    for (let y = 0; y < buffer.getBufferData().height; y++) {
      if (x === 0 || x === buffer.getBufferData().width - 1 || 
          y === 0 || y === buffer.getBufferData().height - 1) {
        const attrs: CellAttributes = {
          foreground: colors[Math.floor((x + y) % colors.length)],
          background: 0,
          blink: false
        };
        buffer.writeChar(x, y, '█', attrs);
      }
    }
  }

  // Write title text
  text.split('').forEach((char, i) => {
    const attrs: CellAttributes = {
      foreground: colors[Math.floor(i % colors.length)],
      background: 0,
      blink: false
    };
    buffer.writeChar(2 + i, 2, char, attrs);
  });

  // Add instructions
  const instructions = [
    'Event Priority Demo:',
    '- Input events (priority 100)',
    '  • Mouse movement',
    '  • Mouse clicks',
    '  • Keyboard input',
    '',
    '- UI events (priority 50)',
    '  • Show/hide cursor',
    '  • Buffer updates'
  ];

  instructions.forEach((line, i) => {
    line.split('').forEach((char, x) => {
      const attrs: CellAttributes = {
        foreground: 7,
        background: 0,
        blink: false
      };
      buffer.writeChar(2 + x, 5 + i, char, attrs);
    });
  });
}

// Log events to the event log
function logEvent(event: InputEvent | SystemUIEvent) {
  const eventElement = document.createElement('div');
  eventElement.className = `event ${event.type.startsWith('INPUT') ? 'input-event' : 'ui-event'}`;
  
  const timestamp = new Date(event.timestamp).toISOString().split('T')[1].slice(0, -1);
  const priority = event.priority.toString().padStart(3, '0');
  
  eventElement.textContent = `[${timestamp}] (${priority}) ${event.type}: ${JSON.stringify(event.data)}`;
  eventLogElement.appendChild(eventElement);
  eventLogElement.scrollTop = eventLogElement.scrollHeight;

  // Keep only last 100 events
  while (eventLogElement.children.length > 100) {
    eventLogElement.removeChild(eventLogElement.firstChild!);
  }
}

// Reset cursor color at position
function resetCursorColor() {
  if (cursorState.isVisible && cursorState.position && cursorState.originalCell) {
    buffer.writeChar(cursorState.position.x, cursorState.position.y, cursorState.originalCell.char, {
      foreground: cursorState.originalCell.fg,
      background: cursorState.originalCell.bg,
      blink: false
    });
  }
}

// Convert color index to hex
function colorToHex(colorIndex: number): string {
  const palette = [
    '#000000', '#0000AA', '#00AA00', '#00AAAA',  // 0-3
    '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',  // 4-7
    '#555555', '#5555FF', '#55FF55', '#55FFFF',  // 8-11
    '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'   // 12-15
  ];
  return palette[colorIndex] || palette[7]; // Default to light gray if invalid
}

// Convert hex color to RGB values
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Find inverted color in DOS palette
function findInvertedColor(colorIndex: number): number {
  const hex = colorToHex(colorIndex);
  const rgb = hexToRgb(hex);
  
  // Invert each RGB component
  const inverted = {
    r: 255 - rgb.r,
    g: 255 - rgb.g,
    b: 255 - rgb.b
  };
  
  // Find the closest matching color in the DOS palette
  const palette = Array(16).fill(0).map((_, i) => colorToHex(i));
  const closestColor = palette.reduce((prev, curr) => {
    const prevRgb = hexToRgb(prev);
    const currRgb = hexToRgb(curr);
    const prevDiff = Math.abs(prevRgb.r - inverted.r) + 
                    Math.abs(prevRgb.g - inverted.g) + 
                    Math.abs(prevRgb.b - inverted.b);
    const currDiff = Math.abs(currRgb.r - inverted.r) + 
                    Math.abs(currRgb.g - inverted.g) + 
                    Math.abs(currRgb.b - inverted.b);
    return prevDiff < currDiff ? prev : curr;
  });
  
  return palette.indexOf(closestColor);
}

// Update cursor color at new position
function updateCursorColor(position: { x: number; y: number }) {
  const cell = buffer.getChar(position.x, position.y);
  
  // For empty cells, create a default cell with space character
  const currentCell = cell || {
    char: ' ',
    attributes: {
      foreground: 7,  // Light gray
      background: 0,  // Black
      blink: false
    }
  };

  // Store original cell data
  cursorState.originalCell = {
    char: currentCell.char || ' ',
    fg: currentCell.attributes.foreground,
    bg: currentCell.attributes.background
  };

  // For non-printable characters (including null byte), treat as space
  const displayChar = currentCell.char && currentCell.char.charCodeAt(0) > 31 ? currentCell.char : ' ';

  // Write with inverted colors using palette matching
  buffer.writeChar(position.x, position.y, displayChar, {
    foreground: findInvertedColor(currentCell.attributes.foreground),
    background: findInvertedColor(currentCell.attributes.background),
    blink: false
  });

  cursorState.position = position;
  cursorState.isVisible = true;
}

// Handle cursor rendering
function handleCursor(event: InputEvent | SystemUIEvent) {
  const { type, data } = event;

  switch (type) {
    case UIEventType.SHOW_CURSOR:
    case InputEventType.MOUSE_MOVE:
    case InputEventType.MOUSE_DRAG:
      if ('position' in data && data.position) {
        resetCursorColor(); // Reset previous position
        updateCursorColor(data.position); // Update new position
      }
      break;

    case UIEventType.HIDE_CURSOR:
      resetCursorColor(); // Just reset the color
      cursorState.isVisible = false;
      cursorState.originalCell = null;
      break;
  }
}

// Render loop
function render() {
  const { width, height, cells } = buffer.getBufferData();
  const charWidth = canvas.width / width;
  const charHeight = canvas.height / height;

  // Clear canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw characters
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Get cell or use default empty cell
      const cell = cells[y][x] || {
        char: ' ',
        attributes: {
          foreground: 7,  // Light gray
          background: 0,  // Black
          blink: false
        }
      };

      // Draw character background
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue(`--color-${cell.attributes.background}`)
        .trim();
      ctx.fillStyle = bgColor;
      ctx.fillRect(
        x * charWidth,
        y * charHeight,
        charWidth,
        charHeight
      );

      // Draw character if printable
      if (cell.char && cell.char.charCodeAt(0) > 31) {
        const fgColor = getComputedStyle(document.documentElement)
          .getPropertyValue(`--color-${cell.attributes.foreground}`)
          .trim();
        ctx.fillStyle = fgColor;
        const fontSize = Math.floor(charHeight * 0.8);
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const offsetY = charHeight * 0.1;
        ctx.fillText(
          cell.char,
          x * charWidth + charWidth / 2,
          y * charHeight + charHeight / 2 + offsetY
        );
      }
    }
  }

  requestAnimationFrame(render);
}

// Update status display
function updateStatus() {
  const mouseState = inputServices.mouse.getState();
  const keyboardState = inputServices.keyboard.getState();

  statusElement.textContent = `Mouse: ${mouseState.isVisible ? 'visible' : 'hidden'} at ${
    mouseState.position ? `(${mouseState.position.x}, ${mouseState.position.y})` : 'N/A'
  } | Last key: ${keyboardState.lastKeyPressed || 'None'}`;
}

// Initialize cursor manager
const cursorManager = getCursorManager(inputServices.mouse);

// Subscribe to events
eventCoordinator.subscribe((event) => {
  logEvent(event);
  updateStatus();
});

eventCoordinator.subscribe(handleCursor, {
  eventTypes: [
    UIEventType.SHOW_CURSOR,
    UIEventType.HIDE_CURSOR,
    InputEventType.MOUSE_MOVE,
    InputEventType.MOUSE_DRAG
  ],
  minPriority: 50
});

// Initialize and start rendering
initializeBuffer();
render();

// Initial status update
updateStatus();

// Cleanup on page unload
window.addEventListener('unload', () => {
  inputServices.cleanup();
  eventCoordinator.clear();
});
