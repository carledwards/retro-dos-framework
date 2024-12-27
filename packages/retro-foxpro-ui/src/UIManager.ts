import { 
  IVideoBuffer,
  CellAttributes,
  KeyboardService, 
  MouseService,
  RenderCursorManager,
  eventCoordinator,
  InputEventType,
  InputEvent,
  SystemUIEvent,
  MouseState
} from '@retro-dos/retro-ui-lib';
import { Position, Size, Theme, DefaultTheme, ColorAttributes, SystemWindowState } from './types';
import { cssColorToDos } from './colors';
import { Renderer } from './Renderer';
import { WindowManager } from './WindowManager';
import { FoxProLayerManager, FoxProLayerType } from './rendering/FoxProLayerManager';

export class UIManager {
  private videoBuffer: IVideoBuffer;
  private keyboard: KeyboardService;
  private mouse: MouseService;
  private theme: Theme;
  private screenSize: Size;
  private workspaceSize: Size;
  private renderer: Renderer;
  private _windowManager: WindowManager;
  
  public get windowManager(): WindowManager {
    return this._windowManager;
  }
  private layerManager: FoxProLayerManager;
  private cursorManager: RenderCursorManager;
  private unsubscribe: (() => void) | null = null;

  // Track system windows
  private backgroundWindowId: string | null = null;
  private menuBarWindowId: string | null = null;

  private dragState: {
    windowId: string;
    startPos: Position;
    offset: { x: number; y: number };
  } | null = null;

  private resizeState: {
    windowId: string;
    startPos: Position;
    startSize: Size;
  } | null = null;

  private lastClickTime: number = 0;
  private lastClickWindow: string | null = null;

  constructor(
    videoBuffer: IVideoBuffer,
    keyboard: KeyboardService,
    mouse: MouseService,
    canvas: HTMLCanvasElement,
    theme: Theme = DefaultTheme
  ) {
    this.videoBuffer = videoBuffer;
    this.keyboard = keyboard;
    this.mouse = mouse;
    this.theme = theme;

    // Get initial screen dimensions from video buffer
    this.screenSize = {
      width: videoBuffer.getBufferData().width,
      height: videoBuffer.getBufferData().height
    };

    // Workspace is full screen minus menu bar
    this.workspaceSize = {
      width: this.screenSize.width,
      height: this.screenSize.height - 1 // Reserve top row for menu
    };

    // Initialize managers
    this.renderer = new Renderer(canvas, videoBuffer);
    this.layerManager = new FoxProLayerManager(videoBuffer, theme);
    this._windowManager = new WindowManager(videoBuffer, theme, this.layerManager);
    
    // Subscribe to window manager events
    this._windowManager.onWindowCreated = () => this.markDirty();
    this._windowManager.onWindowClosed = () => this.markDirty();
    this._windowManager.onWindowUpdated = () => this.markDirty();
    
    // Initialize render cursor manager and connect it to mouse events
    this.cursorManager = new RenderCursorManager({ autoHideTimeout: 3000 });
    
    // Initialize the screen
    this.initializeScreen();

    // Set up event handlers
    this.setupEventHandlers();

    // Start render loop
    this.startRenderLoop();
  }

  /**
   * Initialize the screen with background and menu bar windows
   */
  private initializeScreen(): void {
    // Create background window (extended beyond screen edges) as a system window
    const backgroundWindow: SystemWindowState = {
      id: `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'system',
      role: 'background',
      title: '',
      position: { x: -1, y: 0 },
      size: { width: this.screenSize.width + 2, height: this.screenSize.height + 1 },
      isActive: false,
      isMaximized: false,
      isMinimized: false,
      hasScrollbars: false,
      scrollPosition: { x: 0, y: 0 },
      borderless: true,
      shadowless: true
    };
    this.backgroundWindowId = this._windowManager.createSystemWindow(backgroundWindow);

    // Fill background with blue color using system theme
    if (this.backgroundWindowId) {
      for (let y = 0; y < this.screenSize.height; y++) {
        for (let x = -1; x < this.screenSize.width + 1; x++) {
          this.writeChar(x, y, ' ', this.theme.system.background);
        }
      }
    }
    
    // Create menu bar window as a system window
    const menuBarWindow: SystemWindowState = {
      id: `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'system',
      role: 'menubar',
      title: '',
      position: { x: 0, y: 0 },
      size: { width: this.screenSize.width, height: 1 },
      isActive: false,
      isMaximized: false,
      isMinimized: false,
      hasScrollbars: false,
      scrollPosition: { x: 0, y: 0 },
      borderless: true,
      shadowless: true
    };
    this.menuBarWindowId = this._windowManager.createSystemWindow(menuBarWindow);

    // Fill menu bar with default color
    if (this.menuBarWindowId) {
      // Fill entire menu bar with spaces using inactive color
      for (let x = 0; x < this.screenSize.width; x++) {
        this.writeChar(x, 0, ' ', this.theme.menuBar.inactive);
      }

      // Draw menu items
      const menuItems = [
        ' System ',
        ' File ',
        ' Edit ',
        ' Database ',
        ' Record ',
        ' Program ',
        ' Window '
      ];

      let currentX = 0;
      menuItems.forEach(item => {
        this.renderText(currentX, 0, [item], this.theme.menuBar.inactive);
        currentX += item.length;
      });
    }
  }

  /**
   * Set up keyboard and mouse event handlers
   */
  private setupEventHandlers(): void {
    // Subscribe to events through the event coordinator
    this.unsubscribe = eventCoordinator.subscribe((event: InputEvent | SystemUIEvent) => {
      // Handle mouse events
      if (event.source === 'mouse' && 'position' in event.data) {
        const { position, modifiers, isButtonDown } = event.data;
        
        // Always update cursor with fresh content
        const cell = this.videoBuffer.getChar(position.x, position.y);
        if (cell) {
          // Force cursor update by clearing first
          this.cursorManager.clear();
          this.cursorManager.update(position, cell);
          this.cursorManager.setVisible(true);
          
          // Mark cursor layer as dirty
          this.layerManager.markDirty(this.layerManager.layerIds[FoxProLayerType.Cursor], {
            x: position.x,
            y: position.y,
            width: 1,
            height: 1
          });
        }
        
        // Process event based on type
        let needsRedraw = true; // Always redraw on mouse events to update cursor
        
        switch (event.type) {
          case InputEventType.MOUSE_MOVE:
          case InputEventType.MOUSE_DRAG:
            this.handleMouseMove(position);
            break;
            
          case InputEventType.MOUSE_DOWN:
            console.log('Mouse down at:', position);
            // Check if click is in a window first
            const windows = this.windowManager.getWindows();
            let handled = false;
            
            for (let i = windows.length - 1; i >= 0; i--) {
              const win = windows[i];
              if (this.isPointInWindow(position, win)) {
                this.handleMouseClick(position, 0, modifiers);
                handled = true;
                needsRedraw = true;
                break;
              }
            }
            
            // If not handled by a window, check menu bar
            if (!handled && position.y === 0) {
              this.handleMouseClick(position, 0, modifiers);
              needsRedraw = true;
            }
            break;
            
          case InputEventType.MOUSE_UP:
            if (this.dragState || this.resizeState) {
              this.handleMouseUp();
              needsRedraw = true;
            }
            break;
            
          case InputEventType.MOUSE_DOUBLE_CLICK:
            this.handleDoubleClick(position);
            needsRedraw = true;
            break;
        }
        
        // Only mark dirty if needed
        if (needsRedraw) {
          this.markDirty();
        }
      }
      // Handle keyboard events
      else if (event.source === 'keyboard' && event.type === InputEventType.KEY_DOWN) {
        const { key, modifiers } = event.data;
        this.handleKeyPress(key, modifiers);
        this.cursorManager.handleKeyPress();
      }
    }, {
      // Configure event subscription
      eventTypes: [
        InputEventType.MOUSE_MOVE,
        InputEventType.MOUSE_DOWN,
        InputEventType.MOUSE_UP,
        InputEventType.MOUSE_DRAG,
        InputEventType.MOUSE_DOUBLE_CLICK,
        InputEventType.KEY_DOWN
      ],
      minPriority: 100 // Ensure we get high priority events
    });
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
   * Write a character to the video buffer with color attributes
   */
  private writeChar(x: number, y: number, char: string, colors: ColorAttributes): void {
    // Allow writing to x=0 by removing the x < 0 check
    if (x >= this.screenSize.width || y < 0 || y >= this.screenSize.height) {
      return;
    }

    this.videoBuffer.writeChar(x, y, char, this.convertColors(colors));
  }

  /**
   * Handle mouse movement
   */
  private handleMouseMove(pos: Position): void {
    let needsRedraw = false;

    // Handle window dragging
    if (this.dragState) {
      const dx = pos.x - this.dragState.startPos.x;
      const dy = pos.y - this.dragState.startPos.y;
      
      this.windowManager.updateWindowPosition(this.dragState.windowId, {
        x: this.dragState.offset.x + dx,
        y: Math.max(1, this.dragState.offset.y + dy) // Keep below menu bar
      });
      needsRedraw = true;
    }

    // Handle window resizing
    if (this.resizeState) {
      const dx = pos.x - this.resizeState.startPos.x;
      const dy = pos.y - this.resizeState.startPos.y;
      
      // Enforce minimum size of 20x10
      const newWidth = Math.max(20, this.resizeState.startSize.width + dx);
      const newHeight = Math.max(10, this.resizeState.startSize.height + dy);
      
      // Update window size
      this.windowManager.updateWindowSize(this.resizeState.windowId, {
        width: newWidth,
        height: newHeight
      });
      needsRedraw = true;
    }

    // Handle menu bar highlighting
    if (pos.y === 0 && this.menuBarWindowId) {
      let x = 0;
      const menuItems = [' System ', ' File ', ' Edit ', ' Database ', ' Record ', ' Program ', ' Window '];
      let found = false;
      
      for (const item of menuItems) {
        if (pos.x >= x && pos.x < x + item.length) {
          // Highlight hovered item
          this.renderText(x, 0, [item], this.theme.menuBar.active);
          found = true;
          needsRedraw = true;
        } else {
          // Reset non-hovered items
          this.renderText(x, 0, [item], this.theme.menuBar.inactive);
        }
        x += item.length;
      }
      
      // Reset remaining menu bar
      if (!found) {
        let currentX = 0;
        menuItems.forEach(item => {
          this.renderText(currentX, 0, [item], this.theme.menuBar.inactive);
          currentX += item.length;
        });
        needsRedraw = true;
      }
    }

    // Always mark dirty to ensure cursor updates
    this.markDirty();
  }

  /**
   * Draw the mouse cursor
   */
  private drawMouseCursor(): void {
    const mouseState = this.mouse.getState();
    if (!mouseState.position || !mouseState.isVisible) return;

    // Get current cursor state
    const cursorDisplay = this.cursorManager.getCursorDisplay();
    if (!cursorDisplay) return;

    // Draw the cursor
    this.videoBuffer.writeChar(
      cursorDisplay.position.x,
      cursorDisplay.position.y,
      cursorDisplay.content.char,
      cursorDisplay.content.attributes
    );

    // Mark cursor position as dirty
    this.layerManager.markDirty(this.layerManager.layerIds[FoxProLayerType.Cursor], {
      x: cursorDisplay.position.x,
      y: cursorDisplay.position.y,
      width: 1,
      height: 1
    });
  }

  /**
   * Handle double-click events
   */
  private handleDoubleClick(pos: Position): void {
    const windows = this.windowManager.getWindows();
    
    // Find the window that was double-clicked
    for (let i = windows.length - 1; i >= 0; i--) {
      const win = windows[i];
      if (this.isPointInWindow(pos, win) && win.isActive) {
        // Check if double-click was on title bar
        if (pos.y === win.position.y) {
          // Toggle minimize state
          this.windowManager.toggleMinimize(win.id);
          this.markDirty();
          return;
        }
      }
    }
  }

  private handleMouseClick(pos: Position, button: number, modifiers: { shift?: boolean }): void {
    const windows = this.windowManager.getWindows();

    // If we're already dragging or resizing, ignore clicks
    if (this.dragState || this.resizeState) {
      return;
    }

    // Check menu bar first
    if (pos.y === 0 && this.menuBarWindowId) {
      let x = 0;
      const menuItems = [' System ', ' File ', ' Edit ', ' Database ', ' Record ', ' Program ', ' Window '];
      for (const item of menuItems) {
        if (pos.x >= x && pos.x < x + item.length) {
          // Highlight selected menu item
          this.renderText(x, 0, [item], this.theme.menuBar.active);
          return;
        }
        x += item.length;
      }
      return;
    }

    for (let i = windows.length - 1; i >= 0; i--) {
      const win = windows[i];
      // Skip system windows (background and menu bar)
      if (win.id === this.backgroundWindowId || win.id === this.menuBarWindowId) {
        continue;
      }
      
      if (this.isPointInWindow(pos, win)) {
        const wasActive = win.isActive;
        const isShiftHeld = Boolean(modifiers?.shift);

        // Handle title bar interactions
        if (pos.y === win.position.y) {
          // Check if clicking title bar area (not controls)
          const isTitleBarArea = pos.x > win.position.x && pos.x < win.position.x + win.size.width - 1;

          // Handle shift-click dragging without activation
          if (!wasActive && isShiftHeld && isTitleBarArea) {
            this.dragState = {
              windowId: win.id,
              startPos: pos,
              offset: { x: win.position.x, y: win.position.y }
            };
            return;
          }

          // For non-shift clicks on inactive window
          if (!wasActive && !isShiftHeld) {
            // Normal click: activate window
            this.windowManager.setActiveWindow(win.id, true);
            
            // Start dragging if clicking title bar area
            if (isTitleBarArea) {
              this.dragState = {
                windowId: win.id,
                startPos: pos,
                offset: { x: win.position.x, y: win.position.y }
              };
            }
          }

          // Handle active window controls and dragging
          if (wasActive) {
            // Handle active window controls and dragging
            if (pos.x === win.position.x) { // Close button
              this.windowManager.closeWindow(win.id);
              this.markDirty();
              return;
            }
            if (pos.x === win.position.x + win.size.width - 1) { // Maximize button
              this.windowManager.toggleMaximize(win.id);
              this.markDirty();
              return;
            }

            // Start dragging if clicking title bar area
            if (isTitleBarArea) {
              this.dragState = {
                windowId: win.id,
                startPos: pos,
                offset: { x: win.position.x, y: win.position.y }
              };
            }
          }
        }

        // Handle resize handle (only for active windows)
        if (wasActive && pos.x === win.position.x + win.size.width - 1 &&
            pos.y === win.position.y + win.size.height - 1) {
          this.resizeState = {
            windowId: win.id,
            startPos: pos,
            startSize: { ...win.size }
          };
          return;
        }

        // For any other clicks on inactive window, activate and move to front
        // But only if shift is not held and we haven't already started dragging
        if (!wasActive && !isShiftHeld && !this.dragState) {
          this.windowManager.setActiveWindow(win.id, true);
        }
        break;
      }
    }

    // Clear last click info if clicking outside windows
    this.lastClickWindow = null;
    this.lastClickTime = 0;
  }

  private handleMouseUp(): void {
    // Clear drag/resize state
    this.dragState = null;
    this.resizeState = null;
    
    // Reset menu bar highlights if it exists
    if (this.menuBarWindowId) {
      let currentX = 0;
      const menuItems = [' System ', ' File ', ' Edit ', ' Database ', ' Record ', ' Program ', ' Window '];
      menuItems.forEach(item => {
        this.renderText(currentX, 0, [item], this.theme.menuBar.inactive);
        currentX += item.length;
      });
    }
    
    this.markDirty();

    // Clear last click info to prevent double-click after shift-drag
    this.lastClickWindow = null;
    this.lastClickTime = 0;
  }

  private isPointInWindow(pos: Position, win: any): boolean {
    return pos.x >= win.position.x && 
           pos.x < win.position.x + win.size.width &&
           pos.y >= win.position.y && 
           pos.y < win.position.y + win.size.height;
  }

  /**
   * Handle keyboard input
   */
  private handleKeyPress(key: string, modifiers: any): void {
    // TODO: Implement keyboard input handling
  }

  /**
   * Update the screen dimensions
   */
  /**
   * Fill the background window with the theme's screen color
   */
  private fillBackground(): void {
    if (this.backgroundWindowId) {
      // Fill entire background including extended edges with blue
      for (let y = 0; y < this.screenSize.height; y++) {
        for (let x = -1; x < this.screenSize.width + 1; x++) {
          this.writeChar(x, y, ' ', this.theme.screen);
        }
      }
      this.markDirty();
    }
  }

  public updateScreenSize(width: number, height: number): void {
    this.screenSize = { width, height };
    this.workspaceSize = { width, height: height - 1 };
    
    // Update background window size if it exists (maintain extended edges)
    if (this.backgroundWindowId) {
      this._windowManager.updateWindowPosition(this.backgroundWindowId, { x: -1, y: 0 });
      this._windowManager.updateWindowSize(this.backgroundWindowId, {
        width: this.screenSize.width + 2,
        height: this.screenSize.height + 1
      });
      // Refill background with blue color after resize
      this.fillBackground();
    }
    
    // Update menu bar width if it exists
    if (this.menuBarWindowId) {
      this._windowManager.updateWindowSize(this.menuBarWindowId, { width: this.screenSize.width, height: 1 });
    }
  }

  /**
   * Get the current screen size
   */
  public getScreenSize(): Size {
    return { ...this.screenSize };
  }

  /**
   * Get the workspace size (screen minus menu bar)
   */
  public getWorkspaceSize(): Size {
    return { ...this.workspaceSize };
  }

  /**
   * Set a new theme
   */
  public setTheme(theme: Theme): void {
    this.theme = theme;
    this.layerManager.updateTheme(theme);
    this.initializeScreen();
  }

  /**
   * Get the current theme
   */
  public getTheme(): Theme {
    return this.theme;
  }

  public update(): void {
    // Begin batch operation for cursor updates
    this.videoBuffer.beginBatch();

    // Draw layers in order
    this.layerManager.draw();
    this.windowManager.draw();
    this.drawMouseCursor();

    // End batch operation and flush changes
    this.videoBuffer.endBatch();
    this.videoBuffer.flush();
  }

  /**
   * Start the render loop
   */
  private lastCursorVisible: boolean = true;

  private startRenderLoop(): void {
    // Start the renderer's animation loop
    this.renderer.startRenderLoop();

    // Set up cursor visibility check
    const checkCursor = () => {
      const mouseState = this.mouse.getState();
      const cursorVisible = mouseState.isVisible && this.cursorManager.isCurrentlyVisible();
      
      if (cursorVisible !== this.lastCursorVisible) {
        this.update();
        this.renderer.markDirty();
        this.lastCursorVisible = cursorVisible;
      }

      requestAnimationFrame(checkCursor);
    };
    requestAnimationFrame(checkCursor);
  }

  private markDirty(): void {
    this.update();
    this.renderer.markDirty();
  }

  /**
   * Get the renderer instance
   */
  public getRenderer(): Renderer {
    return this.renderer;
  }

  /**
   * Render text at specified position
   * @param x Starting X coordinate
   * @param y Starting Y coordinate
   * @param lines Array of text lines to render
   * @param colors Optional color attributes (uses theme screen colors if not provided)
   */
  public renderText(x: number, y: number, lines: string[], colors?: ColorAttributes): void {
    const textColors = colors || this.theme.screen;
    
    lines.forEach((line, index) => {
      for (let i = 0; i < line.length; i++) {
        this.writeChar(x + i, y + index, line[i], textColors);
      }
    });
    this.markDirty();
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this.cursorManager.cleanup();
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.renderer) {
      this.renderer.stopRenderLoop();
    }
  }
}
