// Core UI components
export { UIManager } from './UIManager';
export { WindowManager } from './WindowManager';
export { Renderer } from './Renderer';

// Types
export type {
  Position,
  Size,
  ColorAttributes,
  BorderCharacters,
  WindowState,
  DialogState,
  MenuItem,
  Theme
} from './types';

export {
  DefaultTheme,
  WindowControls,
  DialogBorder,
  WindowBorder
} from './types';

// Color utilities
export { cssColorToDos, DosColor } from './colors';
