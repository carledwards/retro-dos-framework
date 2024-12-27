import { eventCoordinator, InputEventType, UIEventType, type InputEvent, type SystemUIEvent } from '../index';
import { type IMouseService } from '../../types/input/mouse';

const CURSOR_HIDE_DELAY = 3000; // 3 seconds

/**
 * Manages cursor visibility based on input events
 */
export class CursorManager {
  private isVisible: boolean;
  private hideTimeout: NodeJS.Timeout | null;
  private unsubscribe: (() => void) | null;
  private mouseService: IMouseService;

  constructor(mouseService: IMouseService) {
    this.isVisible = false;
    this.hideTimeout = null;
    this.unsubscribe = null;
    this.mouseService = mouseService;

    // Bind methods
    this.handleInputEvent = this.handleInputEvent.bind(this);
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.resetHideTimeout = this.resetHideTimeout.bind(this);

    // Subscribe to relevant input events
    this.unsubscribe = eventCoordinator.subscribe(this.handleInputEvent, {
      eventTypes: [
        InputEventType.MOUSE_MOVE,
        InputEventType.MOUSE_DOWN,
        InputEventType.MOUSE_UP,
        InputEventType.MOUSE_DRAG,
        InputEventType.KEY_DOWN,
        InputEventType.KEY_UP
      ]
    });
  }

  /**
   * Handle input events to manage cursor visibility
   */
  private handleInputEvent(event: InputEvent | SystemUIEvent): void {
    // Only handle input events
    if (this.isInputEvent(event)) {
      if (event.source === 'mouse') {
        switch (event.type) {
          case InputEventType.MOUSE_MOVE:
          case InputEventType.MOUSE_DRAG:
            this.show();
            this.resetHideTimeout();
            break;
          case InputEventType.MOUSE_DOWN:
            // Always show cursor on mouse button press
            this.show();
            this.resetHideTimeout();
            break;
        }
      }
      // Handle keyboard events
      else if (event.source === 'keyboard' && event.type === InputEventType.KEY_DOWN) {
        // Only hide cursor for non-modifier keys
        const { modifiers } = event.data;
        const isModifierKey = modifiers.ctrl || modifiers.alt || modifiers.shift || modifiers.meta;
        
        if (!isModifierKey) {
          this.cancelHideTimeout();
          this.hide();
        }
      }
    }
  }

  /**
   * Reset the cursor hide timeout
   */
  private resetHideTimeout(): void {
    this.cancelHideTimeout();
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, CURSOR_HIDE_DELAY);
  }

  /**
   * Cancel the current hide timeout if it exists
   */
  private cancelHideTimeout(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  /**
   * Type guard to check if an event is an InputEvent
   */
  private isInputEvent(event: InputEvent | SystemUIEvent): event is InputEvent {
    return Object.values(InputEventType).includes(event.type as InputEventType);
  }

  /**
   * Show the cursor and emit event
   */
  private show(): void {
    if (!this.isVisible) {
      this.isVisible = true;
      const mouseState = this.mouseService.getState();
      eventCoordinator.publish({
        type: UIEventType.SHOW_CURSOR,
        timestamp: Date.now(),
        priority: 50,
        source: 'system',
        data: {
          position: mouseState.position
        }
      });
    }
  }

  /**
   * Hide the cursor and emit event
   */
  private hide(): void {
    if (this.isVisible) {
      this.isVisible = false;
      const mouseState = this.mouseService.getState();
      eventCoordinator.publish({
        type: UIEventType.HIDE_CURSOR,
        timestamp: Date.now(),
        priority: 50,
        source: 'system',
        data: {
          position: mouseState.position
        }
      });
    }
  }

  /**
   * Clean up event listeners and timeouts
   */
  cleanup(): void {
    this.cancelHideTimeout();
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

// Create singleton instance lazily
let instance: CursorManager | null = null;

export function getCursorManager(mouseService: IMouseService): CursorManager {
  if (!instance) {
    instance = new CursorManager(mouseService);
  }
  return instance;
}
