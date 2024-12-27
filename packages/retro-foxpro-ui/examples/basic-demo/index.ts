import { VideoBuffer, KeyboardService, MouseService } from '@retro-dos/retro-ui-lib';
import { UIManager, DefaultTheme } from '../../src/index';

// Initialize canvas
const canvas = document.getElementById('screen') as HTMLCanvasElement;
canvas.width = 1600;

// Initialize core services
const videoBuffer = new VideoBuffer(80, 25);
const keyboard = new KeyboardService();
const mouse = new MouseService(canvas);

// Initialize services
keyboard.initialize();
mouse.initialize();

// Create UI manager (handles everything)
const uiManager = new UIManager(videoBuffer, keyboard, mouse, canvas, DefaultTheme);

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'n' || e.key === 'N') {
    // Create window at random position
    const x = Math.floor(Math.random() * 40);
    const y = Math.floor(Math.random() * 15) + 5;
    uiManager.windowManager.createWindow(
      'New Window',
      { x, y },
      { width: 30, height: 10 }
    );
  }
});

// Clean up on page unload
window.addEventListener('unload', () => {
  keyboard.cleanup();
  mouse.cleanup();
});

// Create welcome window
const welcomeWindow = uiManager.windowManager.createWindow(
  'Welcome to FoxPro UI',
  { x: 5, y: 5 },
  { width: 40, height: 15 }
);

// Show help text
const helpText = [
  'FoxPro UI Demo',
  '',
  'Press N to create new windows',
  '',
  'Window Controls:',
  '  • Click title to focus',
  '  • Drag title to move',
  '  • Click × to close',
  '  • Click ≡ to maximize',
  '  • Drag . to resize'
];

uiManager.renderText(7, 6, helpText);
