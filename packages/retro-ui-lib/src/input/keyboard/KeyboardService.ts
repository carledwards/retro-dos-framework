import { eventCoordinator, InputEventType, type InputEvent } from '../../events';
import { type KeyboardState, type KeyboardEventListener } from '../../types/input/keyboard';
import { type InputModifiers } from '../../types/input/mouse';

/**
 * Core keyboard service that handles DOS-style keyboard input
 * Similar to INT 16h services in DOS
 */
export class KeyboardService {
  private state: KeyboardState;
  private listeners: Set<KeyboardEventListener>;

  constructor() {
    this.state = {
      lastKeyPressed: null,
      modifiers: {
        ctrl: false,
        alt: false,
        shift: false,
        meta: false
      }
    };
    this.listeners = new Set();

    // Bind methods
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  /**
   * Initialize keyboard service and attach event listeners
   */
  initialize(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Clean up event listeners
   */
  cleanup(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Handle key down events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Update modifier states
    this.state.modifiers = {
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey
    };

    // Store the key pressed
    this.state.lastKeyPressed = event.key;

    // Emit key down event
    const inputEvent: InputEvent = {
      type: InputEventType.KEY_DOWN,
      timestamp: Date.now(),
      priority: 100,
      source: 'keyboard',
      data: {
        key: event.key,
        modifiers: this.state.modifiers
      }
    };
    eventCoordinator.publish(inputEvent);

    this.notifyListeners();
  }

  /**
   * Handle key up events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    // Update modifier states
    this.state.modifiers = {
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey
    };

    // Clear last key if it's the one that was released
    if (this.state.lastKeyPressed === event.key) {
      this.state.lastKeyPressed = null;
    }

    // Emit key up event
    const inputEvent: InputEvent = {
      type: InputEventType.KEY_UP,
      timestamp: Date.now(),
      priority: 100,
      source: 'keyboard',
      data: {
        key: event.key,
        modifiers: this.state.modifiers
      }
    };
    eventCoordinator.publish(inputEvent);

    this.notifyListeners();
  }

  /**
   * Add a state change listener
   */
  addListener(listener: KeyboardEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a state change listener
   */
  removeListener(listener: KeyboardEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Get current keyboard state
   */
  getState(): KeyboardState {
    return { ...this.state };
  }
}
