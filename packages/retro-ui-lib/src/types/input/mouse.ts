export interface MousePosition {
  x: number;
  y: number;
}

export interface InputModifiers {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;  // Command (⌘) key on macOS, Windows key on Windows
}

export interface MouseState {
  position: MousePosition | null;
  isVisible: boolean;
  isButtonDown: boolean;
  modifiers: InputModifiers;
}

export type MouseEventListener = (state: MouseState) => void;

export interface IMouseService {
  initialize(): void;
  cleanup(): void;
  addListener(listener: MouseEventListener): void;
  removeListener(listener: MouseEventListener): void;
  getState(): MouseState;
}

// Event types for mouse events
export enum MouseEventType {
  MOUSE_MOVE = 'MOUSE_MOVE',
  MOUSE_DOWN = 'MOUSE_DOWN',
  MOUSE_UP = 'MOUSE_UP',
  MOUSE_DRAG = 'MOUSE_DRAG',
  MOUSE_DOUBLE_CLICK = 'MOUSE_DOUBLE_CLICK'
}

// Mouse event data interface
export interface MouseEventData {
  position: MousePosition;
  isButtonDown: boolean;
  modifiers: InputModifiers;
  isVisible: boolean;
}
