/**
 * Shared, mutable pointer state. Written by DOM listeners (see `CustomCursor`) and read every
 * frame by the WebGL cursor, so it lives outside React to avoid re-renders.
 */
export const cursorState = {
  x: -9999,
  y: -9999,
  active: false,
  hovering: false,
  pressed: false,
};
