import { CellAttributes } from '../../video';
import { Position, CellContent } from '../types';

export interface CursorConfig {
  autoHideTimeout?: number;  // Time in ms before cursor auto-hides (default: 3000)
}

export interface CursorState {
  position: Position;
  isVisible: boolean;
  content: CellContent;
}

export class RenderCursorManager {
  private state: CursorState | null = null;
  private isVisible: boolean = true;
  private autoHideTimeout: number;
  private lastMovement: number = Date.now();
  private autoHideTimer: number | null = null;

  constructor(config?: CursorConfig) {
    this.autoHideTimeout = config?.autoHideTimeout ?? 3000;
    this.startAutoHideTimer();
  }

  /**
   * Start the auto-hide timer
   */
  private startAutoHideTimer(): void {
    if (this.autoHideTimer) {
      window.clearTimeout(this.autoHideTimer);
    }

    this.autoHideTimer = window.setTimeout(() => {
      if (Date.now() - this.lastMovement >= this.autoHideTimeout) {
        this.isVisible = false;
      }
    }, this.autoHideTimeout);
  }

  /**
   * Update cursor state
   */
  update(position: Position, content: CellContent): void {
    // If position hasn't changed and cursor exists, no need to update
    if (
      this.state &&
      this.state.position.x === position.x &&
      this.state.position.y === position.y
    ) {
      return;
    }

    // Store current state
    this.state = {
      position,
      isVisible: true,
      content: { ...content }
    };

    // Reset visibility and timer on movement
    this.isVisible = true;
    this.lastMovement = Date.now();
    this.startAutoHideTimer();
  }

  /**
   * Get the inverted attributes for cursor display
   */
  private getInvertedAttributes(attributes: CellAttributes): CellAttributes {
    return {
      foreground: 15 - attributes.foreground, // Invert foreground color (15 is white)
      background: 15 - attributes.background, // Invert background color
      blink: false // Cursor shouldn't blink
    };
  }

  /**
   * Get cursor display data
   */
  getCursorDisplay(): CursorState | null {
    if (!this.state || !this.isVisible) {
      return null;
    }

    return {
      position: this.state.position,
      isVisible: this.isVisible,
      content: {
        char: this.state.content.char,
        attributes: this.getInvertedAttributes(this.state.content.attributes)
      }
    };
  }

  /**
   * Get the content under the cursor
   */
  getUnderlyingContent(): CursorState | null {
    return this.state;
  }

  /**
   * Force cursor visibility state
   */
  setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (visible) {
      this.lastMovement = Date.now();
      this.startAutoHideTimer();
    }
  }

  /**
   * Check if cursor is currently visible
   */
  isCurrentlyVisible(): boolean {
    return this.isVisible && this.state !== null;
  }

  /**
   * Get current cursor position
   */
  getCurrentPosition(): Position | null {
    return this.state?.position || null;
  }

  /**
   * Clear the cursor state
   */
  clear(): void {
    this.state = null;
    if (this.autoHideTimer) {
      window.clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  /**
   * Update auto-hide timeout
   */
  setAutoHideTimeout(timeout: number): void {
    this.autoHideTimeout = timeout;
    this.startAutoHideTimer();
  }

  /**
   * Handle keyboard input (hide cursor)
   */
  handleKeyPress(): void {
    // Hide cursor on non-modifier key press
    this.isVisible = false;
    if (this.autoHideTimer) {
      window.clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.autoHideTimer) {
      window.clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
    this.state = null;
  }
}
