import { eventCoordinator, type InputEvent, InputEventType } from '../../events';
import { 
  type IMouseService,
  type MousePosition,
  type MouseState,
  type MouseEventListener,
  type InputModifiers,
  type MouseEventData
} from '../../types/input/mouse';

/**
 * Core mouse service that handles DOS-style mouse input
 * Similar to INT 33h services in DOS
 */
export class MouseService implements IMouseService {
  private static readonly DOUBLE_CLICK_TIMEOUT = 500; // ms between clicks to count as double-click
  private static readonly DOUBLE_CLICK_DISTANCE = 1; // max distance between clicks in cells

  private element: HTMLCanvasElement;
  private state: MouseState;
  private listeners: Set<MouseEventListener>;
  private lastPosition: MousePosition | null;
  private lastClickTime: number;
  private lastClickPosition: MousePosition | null;
  
  private keyboardService: any; // Will be set by createInputServices

  constructor(element: HTMLCanvasElement, keyboardService?: any) {
    this.keyboardService = keyboardService;
    this.element = element;
    this.state = {
      position: null,
      isVisible: false,
      isButtonDown: false,
      modifiers: {
        ctrl: false,
        alt: false,
        shift: false,
        meta: false
      }
    };
    this.listeners = new Set();
    this.lastPosition = null;
    this.lastClickTime = 0;
    this.lastClickPosition = null;

    // Bind methods
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
  }

  /**
   * Initialize mouse service and attach event listeners
   */
  initialize(): void {
    this.element.addEventListener('mousemove', this.handleMouseMove);
    this.element.addEventListener('mousedown', this.handleMouseDown);
    this.element.addEventListener('mouseup', this.handleMouseUp);
    this.element.addEventListener('mouseleave', this.handleMouseLeave);
    this.element.addEventListener('mouseenter', this.handleMouseEnter);
  }

  /**
   * Clean up event listeners
   */
  cleanup(): void {
    this.element.removeEventListener('mousemove', this.handleMouseMove);
    this.element.removeEventListener('mousedown', this.handleMouseDown);
    this.element.removeEventListener('mouseup', this.handleMouseUp);
    this.element.removeEventListener('mouseleave', this.handleMouseLeave);
    this.element.removeEventListener('mouseenter', this.handleMouseEnter);
  }

  /**
   * Handle mouse entering the canvas area
   */
  private handleMouseEnter(mouseEvent: MouseEvent): void {
    const position = this.screenToBuffer(mouseEvent.clientX, mouseEvent.clientY);
    
    // Update state
    this.state.position = position;
    this.lastPosition = { ...position };
    this.state.isVisible = true;
    
    // Update modifiers
    this.state.modifiers = {
      ctrl: mouseEvent.ctrlKey,
      alt: mouseEvent.altKey,
      shift: mouseEvent.shiftKey,
      meta: mouseEvent.metaKey
    };

    // Publish mouse enter event
    const event: InputEvent = {
      type: InputEventType.MOUSE_MOVE,
      timestamp: Date.now(),
      priority: 100,
      source: 'mouse',
      data: {
        position,
        isButtonDown: this.state.isButtonDown,
        modifiers: this.state.modifiers,
        isVisible: this.state.isVisible
      }
    };
    eventCoordinator.publish(event);

    this.notifyListeners();
  }

  /**
   * Handle mouse leaving the canvas area
   */
  private handleMouseLeave(mouseEvent: MouseEvent): void {
    // Store the last known position before resetting state
    const finalPosition = this.lastPosition ? { ...this.lastPosition } : null;

    // Reset state when mouse leaves canvas
    this.state.isVisible = false;
    this.state.position = null;
    this.lastPosition = null;
    this.state.isButtonDown = false;

    // Publish mouse leave event with final position
    if (finalPosition) {
      const event: InputEvent = {
        type: InputEventType.MOUSE_MOVE,
        timestamp: Date.now(),
        priority: 100,
        source: 'mouse',
        data: {
          position: finalPosition,
          isButtonDown: false,
          modifiers: this.state.modifiers,
          isVisible: false
        }
      };
      eventCoordinator.publish(event);
    }

    this.notifyListeners();
  }

  /**
   * Convert screen coordinates to buffer position
   */
  private screenToBuffer(clientX: number, clientY: number): MousePosition {
    const canvas = this.element;
    const rect = canvas.getBoundingClientRect();

    // Get position relative to canvas
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;

    // Calculate character dimensions based on canvas size and buffer dimensions
    const charWidth = rect.width / 80; // Assuming standard 80 columns
    const charHeight = rect.height / 25; // Assuming standard 25 rows

    // Convert to buffer coordinates
    const x = Math.floor(relativeX / charWidth);
    const y = Math.floor(relativeY / charHeight);

    // Ensure coordinates are within bounds
    return {
      x: Math.max(0, Math.min(x, 79)), // 80 columns (0-79)
      y: Math.max(0, Math.min(y, 24))  // 25 rows (0-24)
    };
  }

  /**
   * Check if position has changed in terms of character cells
   */
  private hasPositionChanged(pos1: MousePosition | null, pos2: MousePosition): boolean {
    if (!pos1) return true;
    return pos1.x !== pos2.x || pos1.y !== pos2.y;
  }

  private handleMouseMove(mouseEvent: MouseEvent): void {
    const rect = this.element.getBoundingClientRect();
    const relativeX = mouseEvent.clientX - rect.left;
    const relativeY = mouseEvent.clientY - rect.top;

    // Handle out-of-bounds case similar to mouseleave
    if (relativeX < 0 || relativeX >= rect.width ||
        relativeY < 0 || relativeY >= rect.height) {
      // Store the last known position before resetting state
      const finalPosition = this.lastPosition ? { ...this.lastPosition } : null;

      // Reset state when mouse is out of bounds
      this.state.isVisible = false;
      this.state.position = null;
      this.lastPosition = null;
      this.state.isButtonDown = false;

      // Publish final position before going out of bounds
      if (finalPosition) {
        const event: InputEvent = {
          type: InputEventType.MOUSE_MOVE,
          timestamp: Date.now(),
          priority: 100,
          source: 'mouse',
          data: {
            position: finalPosition,
            isButtonDown: false,
            modifiers: this.state.modifiers,
            isVisible: false
          }
        };
        eventCoordinator.publish(event);
      }

      this.notifyListeners();
      return;
    }

    const newPosition = this.screenToBuffer(
      mouseEvent.clientX,
      mouseEvent.clientY
    );

    // Only update and emit if position has changed in terms of character cells
    if (this.hasPositionChanged(this.state.position, newPosition)) {
      // Show cursor if needed
      if (!this.state.isVisible) {
        this.state.isVisible = true;
      }

      this.state.position = newPosition;
      this.lastPosition = { ...newPosition };

      // Update modifiers directly from the event
      this.state.modifiers = {
        ctrl: mouseEvent.ctrlKey,
        alt: mouseEvent.altKey,
        shift: mouseEvent.shiftKey,
        meta: mouseEvent.metaKey
      };

      // Publish mouse event only when crossing cell boundaries
      const event: InputEvent = {
        type: this.state.isButtonDown ? InputEventType.MOUSE_DRAG : InputEventType.MOUSE_MOVE,
        timestamp: Date.now(),
        priority: 100,
        source: 'mouse',
        data: {
          position: newPosition,
          isButtonDown: this.state.isButtonDown,
          modifiers: this.state.modifiers,
          isVisible: this.state.isVisible
        }
      };
      eventCoordinator.publish(event);

      this.notifyListeners();
    }
  }

  /**
   * Check if two positions are within the double-click distance
   */
  private isWithinDoubleClickDistance(pos1: MousePosition, pos2: MousePosition): boolean {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return dx <= MouseService.DOUBLE_CLICK_DISTANCE && 
           dy <= MouseService.DOUBLE_CLICK_DISTANCE;
  }

  private handleMouseDown(mouseEvent: MouseEvent): void {
    const rect = this.element.getBoundingClientRect();
    const relativeX = mouseEvent.clientX - rect.left;
    const relativeY = mouseEvent.clientY - rect.top;

    // Only process if mouse is within canvas bounds
    if (relativeX >= 0 && relativeX < rect.width &&
        relativeY >= 0 && relativeY < rect.height) {
      const newPosition = this.screenToBuffer(mouseEvent.clientX, mouseEvent.clientY);
      const currentTime = Date.now();

      // Standard mouse down handling first
      this.state.position = newPosition;
      this.lastPosition = { ...newPosition };
      this.state.isButtonDown = true;
      this.state.isVisible = true;
      this.state.modifiers = {
        ctrl: mouseEvent.ctrlKey,
        alt: mouseEvent.altKey,
        shift: mouseEvent.shiftKey,
        meta: mouseEvent.metaKey
      };

      // Publish mouse down event
      const event: InputEvent = {
        type: InputEventType.MOUSE_DOWN,
        timestamp: currentTime,
        priority: 100,
        source: 'mouse',
        data: {
          position: newPosition,
          isButtonDown: true,
          modifiers: this.state.modifiers,
          isVisible: this.state.isVisible
        }
      };
      eventCoordinator.publish(event);
      
      // Check for double-click after publishing mouse down
      if (this.lastClickPosition && 
          currentTime - this.lastClickTime <= MouseService.DOUBLE_CLICK_TIMEOUT &&
          this.isWithinDoubleClickDistance(newPosition, this.lastClickPosition)) {
        
        // Publish double-click event
        const doubleClickEvent: InputEvent = {
          type: InputEventType.MOUSE_DOUBLE_CLICK,
          timestamp: currentTime,
          priority: 100,
          source: 'mouse',
          data: {
            position: newPosition,
            isButtonDown: true,
            modifiers: {
              ctrl: mouseEvent.ctrlKey,
              alt: mouseEvent.altKey,
              shift: mouseEvent.shiftKey,
              meta: mouseEvent.metaKey
            },
            isVisible: true
          }
        };
        eventCoordinator.publish(doubleClickEvent);
        
        // Reset click tracking after double-click
        this.lastClickTime = 0;
        this.lastClickPosition = null;
      } else {
        // Update click tracking for potential future double-click
        this.lastClickTime = currentTime;
        this.lastClickPosition = { ...newPosition };
      }
      
      this.notifyListeners();
    }
  }

  private handleMouseUp(mouseEvent: MouseEvent): void {
    // Get current position
    const position = this.screenToBuffer(mouseEvent.clientX, mouseEvent.clientY);
    const wasInBounds = this.isInBounds(mouseEvent.clientX, mouseEvent.clientY);

    // Update state
    this.state.isButtonDown = false;
    if (wasInBounds) {
      this.state.position = position;
      this.lastPosition = { ...position };
      this.state.isVisible = true;
    }

    // Update modifiers directly from the event
    this.state.modifiers = {
      ctrl: mouseEvent.ctrlKey,
      alt: mouseEvent.altKey,
      shift: mouseEvent.shiftKey,
      meta: mouseEvent.metaKey
    };

    // Publish mouse up event if we're in bounds
    if (wasInBounds) {
      const event: InputEvent = {
        type: InputEventType.MOUSE_UP,
        timestamp: Date.now(),
        priority: 100,
        source: 'mouse',
        data: {
          position,
          isButtonDown: false,
          modifiers: this.state.modifiers,
          isVisible: this.state.isVisible
        }
      };
      eventCoordinator.publish(event);
    }

    this.notifyListeners();
  }

  /**
   * Check if coordinates are within canvas bounds
   */
  private isInBounds(clientX: number, clientY: number): boolean {
    const rect = this.element.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    return relativeX >= 0 && relativeX < rect.width &&
           relativeY >= 0 && relativeY < rect.height;
  }

  /**
   * Add a state change listener
   */
  addListener(listener: MouseEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a state change listener
   */
  removeListener(listener: MouseEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Get current mouse state
   */
  getState(): MouseState {
    return { ...this.state };
  }
}
