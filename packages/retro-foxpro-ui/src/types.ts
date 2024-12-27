/**
 * Basic position interface for x,y coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Basic size interface for width and height
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Color attributes for text and background
 */
export interface ColorAttributes {
  foreground: string;
  background: string;
}

/**
 * Window border characters
 */
export interface BorderCharacters {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
}

/**
 * Window type discriminator
 */
export type WindowType = 'system' | 'dialog' | undefined;

/**
 * Base window state interface
 */
export interface BaseWindowState {
  id: string;
  title: string;
  position: Position;
  size: Size;
  isActive: boolean;
  isMaximized: boolean;
  isMinimized: boolean;
  hasScrollbars: boolean;
  scrollPosition: Position;
  originalSize?: Size;
  borderless?: boolean;
  shadowless?: boolean;
  type?: WindowType;
}

/**
 * System window state interface
 */
export interface SystemWindowState extends BaseWindowState {
  type: 'system';
  role: 'background' | 'menubar';
}

/**
 * Dialog box state interface
 */
export interface DialogState extends BaseWindowState {
  type: 'dialog';
  buttons: string[];
  selectedButton: number;
}

/**
 * Application window state interface
 */
export interface WindowState extends BaseWindowState {
  type?: undefined;
}

/**
 * Union type for all window states
 */
export type AnyWindowState = WindowState | SystemWindowState | DialogState;

/**
 * Menu item interface
 */
export interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  submenu?: MenuItem[];
}

/**
 * Theme interface for UI components
 */
export interface Theme {
  // System colors
  system: {
    background: ColorAttributes; // Blue background
    menuBar: {
      active: ColorAttributes;
      inactive: ColorAttributes;
    };
  };
  
  // For backward compatibility
  menuBar: {
    active: ColorAttributes;
    inactive: ColorAttributes;
  };
  
  // Window colors
  window: {
    border: {
      active: ColorAttributes;
      inactive: ColorAttributes;
    };
    background: {
      active: ColorAttributes;
      inactive: ColorAttributes;
    };
    shadow: ColorAttributes;
    scrollbar: ColorAttributes;
  };
  
  // Dialog colors
  dialog: {
    border: ColorAttributes;
    background: ColorAttributes;
    button: {
      active: ColorAttributes;
      inactive: ColorAttributes;
    };
  };
  
  // Background screen color
  screen: ColorAttributes;
}

/**
 * Default FoxPro-like theme
 */
export const DefaultTheme: Theme = {
  system: {
    background: { foreground: 'white', background: '#000080' }, // Blue background
    menuBar: {
      active: { foreground: 'black', background: '#AAAAAA' },
      inactive: { foreground: 'black', background: '#AAAAAA' }
    }
  },
  // For backward compatibility
  menuBar: {
    active: { foreground: 'black', background: '#AAAAAA' },
    inactive: { foreground: 'black', background: '#AAAAAA' }
  },
  window: {
    border: {
      active: { foreground: 'yellow', background: '#AAAAAA' },
      inactive: { foreground: 'gray', background: '#AAAAAA' }
    },
    background: {
      active: { foreground: 'white', background: '#00AAAA' }, // Teal for application windows
      inactive: { foreground: 'gray', background: '#00AAAA' }
    },
    shadow: { foreground: 'gray', background: 'black' },
    scrollbar: { foreground: 'white', background: '#000080' }
  },
  dialog: {
    border: { foreground: 'white', background: 'DarkMagenta' },
    background: { foreground: 'white', background: 'DarkMagenta' },
    button: {
      active: { foreground: 'yellow', background: 'DarkMagenta' },
      inactive: { foreground: 'white', background: 'DarkMagenta' }
    }
  },
  screen: { foreground: 'white', background: '#000080' } // Keep for backwards compatibility
};

/**
 * Window control characters
 */
export const WindowControls = {
  close: '■',      // Close button
  maximize: '≡',   // Maximize button
  resize: '.',     // Resize handle
  scrollUp: '▲',   // Scroll up indicator
  scrollDown: '▼', // Scroll down indicator
  scrollLeft: '◄', // Scroll left indicator
  scrollRight: '►' // Scroll right indicator
};

/**
 * Dialog box border characters
 */
export const DialogBorder: BorderCharacters = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║'
};

/**
 * Window border characters
 */
export const WindowBorder: BorderCharacters = {
  topLeft: ' ',
  topRight: ' ',
  bottomLeft: ' ',
  bottomRight: ' ',
  horizontal: ' ',
  vertical: ' '
};
