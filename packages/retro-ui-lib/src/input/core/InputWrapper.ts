import { VideoBuffer } from '../../video';
import { eventCoordinator, InputEventType } from '../../events';
import { type MouseState } from '../../types/input/mouse';
import { type KeyboardState } from '../../types/input/keyboard';
import { KeyboardService } from '../keyboard/KeyboardService';
import { MouseService } from '../mouse/MouseService';

interface InputServices {
  mouse: MouseService;
  keyboard: KeyboardService;
  cleanup: () => void;
}

/**
 * Create input services instance
 */
export function createInputServices(buffer: VideoBuffer, canvas: HTMLCanvasElement): InputServices {
  const keyboard = new KeyboardService();
  const mouse = new MouseService(canvas, keyboard);

  keyboard.initialize();
  mouse.initialize();

  return {
    mouse,
    keyboard,
    cleanup: () => {
      keyboard.cleanup();
      mouse.cleanup();
    }
  };
}

/**
 * Wraps the input services to coordinate events through the event system
 */
export class InputWrapper {
  private inputServices;

  constructor(buffer: VideoBuffer, canvas: HTMLCanvasElement) {
    // Create input services instance
    this.inputServices = createInputServices(buffer, canvas);

    // Set up mouse event listeners
    this.inputServices.mouse.addListener(this.handleMouseStateChange.bind(this));
    
    // Set up keyboard event listeners
    this.inputServices.keyboard.addListener(this.handleKeyboardStateChange.bind(this));
  }

  /**
   * Handle mouse state changes and publish appropriate events
   */
  private handleMouseStateChange(state: MouseState) {
    // Mouse move events (high priority)
    if (state.position) {
      eventCoordinator.publish({
        type: InputEventType.MOUSE_MOVE,
        timestamp: Date.now(),
        priority: 100,
        source: 'mouse',
        data: {
          position: state.position,
          isVisible: state.isVisible,
          isButtonDown: state.isButtonDown,
          modifiers: state.modifiers
        }
      });
    }

    // Mouse button events (high priority)
    if (state.isButtonDown) {
      eventCoordinator.publish({
        type: InputEventType.MOUSE_DOWN,
        timestamp: Date.now(),
        priority: 100,
        source: 'mouse',
        data: {
          position: state.position,
          isVisible: state.isVisible,
          isButtonDown: true,
          modifiers: state.modifiers
        }
      });
    } else {
      eventCoordinator.publish({
        type: InputEventType.MOUSE_UP,
        timestamp: Date.now(),
        priority: 100,
        source: 'mouse',
        data: {
          position: state.position,
          isVisible: state.isVisible,
          isButtonDown: false,
          modifiers: state.modifiers
        }
      });
    }
  }

  /**
   * Handle keyboard state changes and publish appropriate events
   */
  private handleKeyboardStateChange(state: KeyboardState) {
    if (state.lastKeyPressed) {
      eventCoordinator.publish({
        type: InputEventType.KEY_DOWN,
        timestamp: Date.now(),
        priority: 100,
        source: 'keyboard',
        data: {
          key: state.lastKeyPressed,
          modifiers: state.modifiers
        }
      });
    }
  }

  /**
   * Clean up input services
   */
  cleanup() {
    this.inputServices.cleanup();
  }

  /**
   * Get the underlying input services instance
   */
  getInputServices() {
    return this.inputServices;
  }
}
