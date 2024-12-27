export * from './input/mouse';
export * from './input/keyboard';

/**
 * Base event interface that all events must implement
 */
export interface BaseEvent {
  type: string;
  timestamp: number;
  priority: number;
  source: string;
  data: any;
}

/**
 * Input event types
 */
export enum InputEventType {
  MOUSE_MOVE = 'MOUSE_MOVE',
  MOUSE_DOWN = 'MOUSE_DOWN',
  MOUSE_UP = 'MOUSE_UP',
  MOUSE_DRAG = 'MOUSE_DRAG',
  MOUSE_DOUBLE_CLICK = 'MOUSE_DOUBLE_CLICK',
  KEY_DOWN = 'KEY_DOWN',
  KEY_UP = 'KEY_UP'
}

/**
 * UI event types
 */
export enum UIEventType {
  SHOW_CURSOR = 'SHOW_CURSOR',
  HIDE_CURSOR = 'HIDE_CURSOR',
  UPDATE_BUFFER = 'UPDATE_BUFFER'
}

/**
 * Input event interface
 */
export interface InputEvent extends BaseEvent {
  type: InputEventType;
  source: 'mouse' | 'keyboard';
  data: any; // Will be typed based on event type
}

/**
 * UI event interface
 */
export interface SystemUIEvent extends BaseEvent {
  type: UIEventType;
  source: 'mouse' | 'keyboard' | 'system';
  data: any; // Will be typed based on event type
}

/**
 * Event handler type
 */
export type EventHandler<T extends BaseEvent = InputEvent | SystemUIEvent> = (event: T) => void;

/**
 * Event subscription options
 */
export interface SubscriptionOptions {
  eventTypes?: string[];
  minPriority?: number;
}

/**
 * Keyboard state interface
 */
export interface KeyboardState {
  lastKeyPressed: string | null;
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
}
