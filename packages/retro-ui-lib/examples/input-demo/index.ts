import { createInputServices } from '../../src/input';
import { type InputModifiers } from '../../src/types/input/mouse';
import { VideoBuffer } from '@retro-dos/video-buffer';
import { eventCoordinator, InputEventType, UIEventType, type InputEvent, type SystemUIEvent, getCursorManager } from '../../src/events';

// Get DOM elements
const demoArea = document.getElementById('demo-area')!;
const mousePosition = document.getElementById('mouse-position')!;
const mouseButtons = document.getElementById('mouse-buttons')!;
const keyPressed = document.getElementById('key-pressed')!;
const keyModifiers = document.getElementById('key-modifiers')!;
const eventLogElement = document.getElementById('event-log')!;

// Create a minimal video buffer for input tracking
const buffer = new VideoBuffer(80, 25);

// Set up the demo area for input tracking
demoArea.style.position = 'relative'; // For absolute positioning of canvas

// Create a canvas for input tracking
const canvas = document.createElement('canvas');
const CANVAS_WIDTH = 800;
const CHAR_WIDTH = Math.floor(CANVAS_WIDTH / buffer.getBufferData().width);
const CHAR_HEIGHT = Math.floor(CHAR_WIDTH * 1.6); // Standard DOS character aspect ratio
const CANVAS_HEIGHT = CHAR_HEIGHT * buffer.getBufferData().height;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
// canvas.style.pointerEvents = 'none'; // We need the canvas to receive mouse events
canvas.style.backgroundColor = 'transparent';
demoArea.appendChild(canvas);

// Initialize input services with both buffer and canvas
const inputServices = createInputServices(buffer, canvas);

// Log events to the event log
function logEvent(event: InputEvent | SystemUIEvent) {
  const eventElement = document.createElement('div');
  eventElement.className = `event ${event.type.startsWith('MOUSE') || event.type.startsWith('KEY') ? 'input-event' : 'ui-event'}`;
  
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

// Update mouse status display
function updateMouseStatus(mouseState = inputServices.mouse.getState()) {
  // Update position display
  if (mouseState.position) {
    mousePosition.textContent = `Position: (${mouseState.position.x}, ${mouseState.position.y})`;
    mousePosition.classList.add('highlight');

  } else {
    mousePosition.textContent = 'Position: Outside demo area';
    mousePosition.classList.remove('highlight');
  }

  // Update button state display
  mouseButtons.textContent = `Button: ${mouseState.isButtonDown ? 'Pressed' : 'Released'}`;
  if (mouseState.isButtonDown) {
    mouseButtons.classList.add('highlight');
  } else {
    mouseButtons.classList.remove('highlight');
  }
}

// Update keyboard status display
function updateKeyboardStatus(keyboardState = inputServices.keyboard.getState()) {
  // Update last key pressed
  if (keyboardState.lastKeyPressed) {
    keyPressed.textContent = `Last Key: ${keyboardState.lastKeyPressed}`;
    keyPressed.classList.add('highlight');
  } else {
    keyPressed.textContent = 'Last Key: None';
    keyPressed.classList.remove('highlight');
  }

  // Update modifier keys
  const activeModifiers = [];
  if (keyboardState.modifiers.ctrl) activeModifiers.push('Ctrl');
  if (keyboardState.modifiers.alt) activeModifiers.push('Alt');
  if (keyboardState.modifiers.shift) activeModifiers.push('Shift');
  if (keyboardState.modifiers.meta) activeModifiers.push('⌘');

  keyModifiers.textContent = `Modifiers: ${activeModifiers.length ? activeModifiers.join(' + ') : 'None'}`;
  if (activeModifiers.length) {
    keyModifiers.classList.add('highlight');
  } else {
    keyModifiers.classList.remove('highlight');
  }
}

// Subscribe to events for logging
eventCoordinator.subscribe((event) => {
  logEvent(event);
});

// Add state change listeners
inputServices.mouse.addListener((state) => updateMouseStatus(state));
inputServices.keyboard.addListener((state) => updateKeyboardStatus(state));

// Initial status update
updateMouseStatus();
updateKeyboardStatus();

// Initialize cursor manager
const cursorManager = getCursorManager(inputServices.mouse);

// Cleanup on page unload
window.addEventListener('unload', () => {
  inputServices.cleanup();
  cursorManager.cleanup();
});
