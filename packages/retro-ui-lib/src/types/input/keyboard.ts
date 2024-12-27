import { type InputModifiers } from './mouse';

export interface KeyboardState {
  lastKeyPressed: string | null;
  modifiers: InputModifiers;
}

export type KeyboardEventListener = (state: KeyboardState) => void;
