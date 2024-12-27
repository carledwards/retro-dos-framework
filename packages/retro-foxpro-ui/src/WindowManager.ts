import { IVideoBuffer, CellAttributes, Region } from '@retro-dos/retro-ui-lib';
import { Position, Size, Theme, WindowState, DialogState, SystemWindowState, AnyWindowState, ColorAttributes } from './types';
import { WindowControls, WindowBorder, DialogBorder } from './types';
import { cssColorToDos } from './colors';
import { WindowCache } from './rendering/WindowCache';
import { FoxProLayerManager, FoxProLayerType } from './rendering/FoxProLayerManager';

export class WindowManager {
  private videoBuffer: IVideoBuffer;
  private theme: Theme;
  private windows: AnyWindowState[] = [];
  private activeWindow: string | null = null;

  private windowCache: WindowCache;
  private layerManager: FoxProLayerManager;

  // Event callbacks
  public onWindowCreated: (() => void) | null = null;
  public onWindowClosed: (() => void) | null = null;
  public onWindowUpdated: (() => void) | null = null;

  constructor(videoBuffer: IVideoBuffer, theme: Theme, layerManager: FoxProLayerManager) {
    this.videoBuffer = videoBuffer;
    this.theme = theme;
    this.windowCache = new WindowCache();
    this.layerManager = layerManager;
  }

  /**
   * Convert ColorAttributes to CellAttributes
   */
  private convertColors(colors: ColorAttributes): CellAttributes {
    return {
      foreground: cssColorToDos(colors.foreground),
      background: cssColorToDos(colors.background)
    };
  }

  /**
   * Create a system window (background or menu bar)
   */
  createSystemWindow(window: SystemWindowState): string {
    this.windows.push(window);
    return window.id;
  }

  /**
   * Create a regular window
   */
  createWindow(title: string, position: Position, size: Size, options: { borderless?: boolean, shadowless?: boolean } = {}): string {
    const id = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const window: WindowState = {
      id,
      title,
      position,
      size,
      isActive: false,
      isMaximized: false,
      isMinimized: false,
      hasScrollbars: false,
      scrollPosition: { x: 0, y: 0 },
      borderless: options.borderless || false,
      shadowless: options.shadowless || false
    };

    this.windows.push(window);
    this.setActiveWindow(id);
    
    if (this.onWindowCreated) {
      this.onWindowCreated();
    }

    return id;
  }

  /**
   * Create a new dialog box
   */
  createDialog(title: string, position: Position, size: Size, buttons: string[]): string {
    const id = `dialog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const dialog: DialogState = {
      id,
      title,
      position,
      size,
      isActive: false,
      isMaximized: false,
      isMinimized: false,
      hasScrollbars: false,
      scrollPosition: { x: 0, y: 0 },
      type: 'dialog',
      buttons,
      selectedButton: 0
    };

    this.windows.push(dialog);
    this.setActiveWindow(id);

    return id;
  }

  /**
   * Set the active window and optionally move it to front
   */
  setActiveWindow(id: string, moveToFront: boolean = true): void {
    // Don't activate system windows
    const window = this.windows.find(w => w.id === id);
    if (window?.type === 'system') return;

    // Deactivate current active window
    if (this.activeWindow) {
      const current = this.windows.find(w => w.id === this.activeWindow);
      if (current) {
        current.isActive = false;
      }
    }

    // Find and activate new window
    if (window) {
      if (moveToFront) {
        // Move window to top of stack
        this.windows = this.windows.filter(w => w.id !== id);
        this.windows.push(window);
      }
      
      window.isActive = true;
      this.activeWindow = id;
      
      if (this.onWindowUpdated) {
        this.onWindowUpdated();
      }
    }
  }

  /**
   * Write a character to the video buffer
   * Safely handles off-screen coordinates
   */
  private writeChar(x: number, y: number, char: string, colors: CellAttributes): void {
    const bufferData = this.videoBuffer.getBufferData();
    if (x >= 0 && x < bufferData.width && y >= 0 && y < bufferData.height) {
      this.videoBuffer.writeChar(x, y, char, colors);
    }
  }

  /**
   * Get a character from the video buffer
   * Returns null for off-screen coordinates
   */
  private getChar(x: number, y: number) {
    try {
      return this.videoBuffer.getChar(x, y);
    } catch {
      return null;
    }
  }

  /**
   * Draw window shadow
   */
  private drawShadow(windowRegion: Region): void {
    const shadowColors = this.convertColors(this.theme.window.shadow);
    const shadowRegion = this.layerManager.createShadowRegion(windowRegion);

    // Get the content under the shadow region
    for (let y = shadowRegion.y; y < shadowRegion.y + shadowRegion.height; y++) {
      for (let x = shadowRegion.x; x < shadowRegion.x + shadowRegion.width; x++) {
        const char = this.getChar(x, y);
        if (char) {
          // Apply shadow effect to the underlying character
          this.writeChar(x, y, char.char, shadowColors);
        }
      }
    }
  }

  /**
   * Draw a window with caching
   */
  private drawWindow(window: AnyWindowState): void {
    const { position: pos, size, title, isActive, isMinimized } = window;
    const isDialog = window.type === 'dialog';
    const isSystem = window.type === 'system';
    const region: Region = { x: pos.x, y: pos.y, width: size.width, height: size.height };

    // Draw shadow first if not maximized, not minimized, and not shadowless
    if (!window.isMaximized && !isMinimized && !window.shadowless && !isSystem) {
      this.drawShadow(region);
    }

    // Check if window needs redraw
    if (!this.windowCache.needsRedraw(window)) {
      const cachedContent = this.windowCache.getContent(window.id);
      if (cachedContent) {
        // Restore from cache
        for (let y = 0; y < cachedContent.length; y++) {
          for (let x = 0; x < cachedContent[y].length; x++) {
            const cell = cachedContent[y][x];
            if (cell) {
              this.writeChar(pos.x + x, pos.y + y, cell.char, cell.attributes);
            }
          }
        }
        return;
      }
    }

    // Create new content array for caching
    const content: { char: string; attributes: CellAttributes }[][] = 
      Array(size.height).fill(null).map(() => 
        Array(size.width).fill(null)
      );

    // Get background colors based on window type
    const bgColors = this.convertColors(
      isSystem ? (window as SystemWindowState).role === 'background' ? 
        this.theme.system.background :
        this.theme.system.menuBar.inactive :
      isDialog ? this.theme.dialog.background :
      isActive ? this.theme.window.background.active :
      this.theme.window.background.inactive
    );

    // Skip border drawing for borderless windows
    if (!window.borderless) {
      const border = isDialog ? DialogBorder : WindowBorder;
      const colors = this.convertColors(
        isDialog ? this.theme.dialog.border :
        isActive ? this.theme.window.border.active :
        this.theme.window.border.inactive
      );

      // Draw and cache border
      // Top and bottom borders
      for (let x = 0; x < size.width; x++) {
        // Top border
        content[0][x] = { char: border.horizontal, attributes: colors };
        this.writeChar(pos.x + x, pos.y, border.horizontal, colors);
        
        // Bottom border
        content[size.height - 1][x] = { char: border.horizontal, attributes: colors };
        this.writeChar(pos.x + x, pos.y + size.height - 1, border.horizontal, colors);
      }

      // Left and right borders
      for (let y = 1; y < size.height - 1; y++) {
        // Left border
        content[y][0] = { char: border.vertical, attributes: colors };
        this.writeChar(pos.x, pos.y + y, border.vertical, colors);
        
        // Right border
        content[y][size.width - 1] = { char: border.vertical, attributes: colors };
        this.writeChar(pos.x + size.width - 1, pos.y + y, border.vertical, colors);
      }

      // Corners
      content[0][0] = { char: border.topLeft, attributes: colors };
      content[0][size.width - 1] = { char: border.topRight, attributes: colors };
      content[size.height - 1][0] = { char: border.bottomLeft, attributes: colors };
      content[size.height - 1][size.width - 1] = { char: border.bottomRight, attributes: colors };

      this.writeChar(pos.x, pos.y, border.topLeft, colors);
      this.writeChar(pos.x + size.width - 1, pos.y, border.topRight, colors);
      this.writeChar(pos.x, pos.y + size.height - 1, border.bottomLeft, colors);
      this.writeChar(pos.x + size.width - 1, pos.y + size.height - 1, border.bottomRight, colors);

      // Draw and cache title
      if (title) {
        const titleStart = Math.floor((size.width - title.length) / 2);
        for (let i = 0; i < title.length; i++) {
          content[0][titleStart + i] = { char: title[i], attributes: colors };
          this.writeChar(pos.x + titleStart + i, pos.y, title[i], colors);
        }
      }

      // Draw and cache window controls if active and not a dialog or system window
      if (isActive && !isDialog && !isSystem) {
        // Close button
        content[0][0] = { char: WindowControls.close, attributes: colors };
        this.writeChar(pos.x, pos.y, WindowControls.close, colors);
        
        // Maximize button
        content[0][size.width - 1] = { char: WindowControls.maximize, attributes: colors };
        this.writeChar(pos.x + size.width - 1, pos.y, WindowControls.maximize, colors);
        
        // Resize handle (only if not minimized)
        if (!isMinimized) {
          content[size.height - 1][size.width - 1] = { char: WindowControls.resize, attributes: colors };
          this.writeChar(pos.x + size.width - 1, pos.y + size.height - 1, WindowControls.resize, colors);
        }
      }
    }

    // Draw and cache window background (skip if minimized)
    if (!isMinimized) {
      for (let y = window.borderless ? 0 : 1; y < (window.borderless ? size.height : size.height - 1); y++) {
        for (let x = window.borderless ? 0 : 1; x < (window.borderless ? size.width : size.width - 1); x++) {
          content[y][x] = { char: ' ', attributes: bgColors };
          this.writeChar(pos.x + x, pos.y + y, ' ', bgColors);
        }
      }
    }

    // Draw dialog buttons if it's a dialog
    if (isDialog) {
      const dialog = window as DialogState;
      if (dialog.buttons.length > 0) {
        const buttonY = size.height - 2;
        let buttonX = Math.floor((size.width - dialog.buttons.join('  ').length) / 2);
        
        dialog.buttons.forEach((button, index) => {
          const isSelected = index === dialog.selectedButton;
          const buttonColors = this.convertColors(
            isSelected ? this.theme.dialog.button.active : this.theme.dialog.button.inactive
          );
          
          for (let i = 0; i < button.length; i++) {
            content[buttonY][buttonX + i] = { char: button[i], attributes: buttonColors };
            this.writeChar(pos.x + buttonX + i, pos.y + buttonY, button[i], buttonColors);
          }
          buttonX += button.length + 2; // 2 spaces between buttons
        });
      }
    }

    // Update cache
    this.windowCache.update(window, content, region);
  }

  /**
   * Draw all windows with caching
   */
  draw(): void {
    // Clean up cache for closed windows
    const currentWindowIds = new Set(this.windows.map(w => w.id));
    this.windowCache.getCachedWindowIds().forEach(id => {
      if (!currentWindowIds.has(id)) {
        this.windowCache.remove(id);
      }
    });

    // Draw windows from bottom to top
    this.windows.forEach(window => {
      this.drawWindow(window);
    });

    // Clean up old cache entries
    this.windowCache.cleanup(5000); // Clean entries older than 5 seconds
  }

  /**
   * Close a window and handle cleanup
   */
  closeWindow(id: string): void {
    const window = this.windows.find(w => w.id === id);
    // Don't close system windows or if window not found
    if (!window || window.type === 'system') return;

    const index = this.windows.findIndex(w => w.id === id);
    if (index !== -1) {
      // Mark the window's area as dirty
      const { position, size } = window;
      const region = {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height
      };

      // Mark window and shadow regions as dirty
      this.layerManager.markWindowAndShadowDirty(region);

      // Remove window from cache
      this.windowCache.remove(id);
      
      // Remove window from array
      this.windows.splice(index, 1);
      
      if (this.onWindowClosed) {
        this.onWindowClosed();
      }
      
      // If this was the active window, activate the next one
      if (this.activeWindow === id) {
        // Find next non-system window to activate
        const nextWindow = [...this.windows].reverse().find(w => w.type !== 'system');
        this.activeWindow = nextWindow ? nextWindow.id : null;
          
        // If we activated a new window, mark it for redraw
        if (this.activeWindow) {
          const newActive = this.windows.find(w => w.id === this.activeWindow);
          if (newActive) {
            const activeRegion = {
              x: newActive.position.x,
              y: newActive.position.y,
              width: newActive.size.width,
              height: newActive.size.height
            };
            this.layerManager.markWindowAndShadowDirty(activeRegion);
            this.windowCache.remove(this.activeWindow);
          }
        }
      }

      // Force redraw of any windows that were underneath
      // by marking their regions as dirty
      this.windows.forEach(w => {
        const windowRegion = {
          x: w.position.x,
          y: w.position.y,
          width: w.size.width,
          height: w.size.height
        };
        
        // Check if this window intersects with the closed window's region
        if (this.regionsIntersect(region, windowRegion)) {
          this.layerManager.markWindowAndShadowDirty(windowRegion);
          this.windowCache.remove(w.id);
        }
      });
    }
  }

  /**
   * Helper to check if two regions intersect
   */
  private regionsIntersect(r1: Region, r2: Region): boolean {
    return !(r2.x >= r1.x + r1.width ||
             r2.x + r2.width <= r1.x ||
             r2.y >= r1.y + r1.height ||
             r2.y + r2.height <= r1.y);
  }

  /**
   * Update window position
   */
  updateWindowPosition(id: string, position: Position): void {
    const window = this.windows.find(w => w.id === id);
    if (window) {
      // Mark old position as dirty
      const oldRegion = {
        x: window.position.x,
        y: window.position.y,
        width: window.size.width,
        height: window.size.height
      };
      this.layerManager.markWindowAndShadowDirty(oldRegion);

      // Update position
      window.position = position;

      // Mark new position as dirty
      const newRegion = {
        x: position.x,
        y: position.y,
        width: window.size.width,
        height: window.size.height
      };
      this.layerManager.markWindowAndShadowDirty(newRegion);

      // Remove from cache to force redraw at new position
      this.windowCache.remove(id);

      if (this.onWindowUpdated) {
        this.onWindowUpdated();
      }
    }
  }

  /**
   * Update window size
   */
  updateWindowSize(id: string, size: Size): void {
    const window = this.windows.find(w => w.id === id);
    if (window) {
      // Mark old size as dirty
      const oldRegion = {
        x: window.position.x,
        y: window.position.y,
        width: window.size.width,
        height: window.size.height
      };
      this.layerManager.markWindowAndShadowDirty(oldRegion);

      // Update size
      window.size = size;

      // Mark new size as dirty
      const newRegion = {
        x: window.position.x,
        y: window.position.y,
        width: size.width,
        height: size.height
      };
      this.layerManager.markWindowAndShadowDirty(newRegion);

      // Remove from cache to force redraw at new size
      this.windowCache.remove(id);

      if (this.onWindowUpdated) {
        this.onWindowUpdated();
      }
    }
  }

  /**
   * Toggle window maximize state
   */
  /**
   * Toggle window minimize state
   */
  toggleMinimize(id: string): void {
    const window = this.windows.find(w => w.id === id);
    if (!window || window.type) return;

    const currentRegion = {
      x: window.position.x,
      y: window.position.y,
      width: window.size.width,
      height: window.size.height
    };
    this.layerManager.markWindowAndShadowDirty(currentRegion);

    if (!window.isMinimized) {
      // Store original size before minimizing
      window.originalSize = { ...window.size };
      // When minimizing, only show title bar (height of 1)
      window.size = { width: window.size.width, height: 1 };
    } else {
      // Restore original size
      if (window.originalSize) {
        window.size = { ...window.originalSize };
      }
    }

    // Toggle minimize state
    window.isMinimized = !window.isMinimized;

    // Remove from cache to force redraw
    this.windowCache.remove(id);
  }

  /**
   * Toggle window maximize state
   */
  toggleMaximize(id: string): void {
    const window = this.windows.find(w => w.id === id);
    // Don't maximize system or dialog windows
    if (!window || window.type) return;

    // Store window state before changes
    const { position, size, isMaximized } = window;

    // Mark current window area as dirty
    const currentRegion = {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height
    };
    this.layerManager.markWindowAndShadowDirty(currentRegion);

    // Toggle maximize state
    window.isMaximized = !isMaximized;

    if (window.isMaximized) {
      // Store original position and size
      window.originalSize = { ...size };
      window.position = { x: 0, y: 1 }; // Below menu bar
      window.size = {
        width: this.videoBuffer.getBufferData().width,
        height: this.videoBuffer.getBufferData().height - 1
      };

      // Mark entire screen as dirty when maximizing
      const fullScreenRegion = {
        x: 0,
        y: 1,
        width: window.size.width,
        height: window.size.height
      };
      this.layerManager.markWindowAndShadowDirty(fullScreenRegion);
    } else if (window.originalSize) {
      // Restore original size and center the window
      window.size = { ...window.originalSize };
      window.position = {
        x: Math.floor((this.videoBuffer.getBufferData().width - window.size.width) / 2),
        y: Math.floor((this.videoBuffer.getBufferData().height - window.size.height) / 2)
      };
    }

    // Remove from cache to force redraw
    this.windowCache.remove(id);
  }

  /**
   * Get all windows
   */
  getWindows(): AnyWindowState[] {
    return [...this.windows];
  }

  /**
   * Get active window
   */
  getActiveWindow(): AnyWindowState | null {
    return this.windows.find(w => w.id === this.activeWindow) || null;
  }
}
