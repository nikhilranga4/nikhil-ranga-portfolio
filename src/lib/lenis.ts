import type Lenis from "lenis";

/** Current Lenis instance, readable by non-React code (e.g. the 3D stage for scroll velocity). */
export const lenisRef: { current: Lenis | null } = { current: null };

/**
 * Called on every animation frame right after Lenis has moved the page, with the frame's
 * timestamp. The 3D world draws from here, so what it shows always matches the scroll position
 * the browser is about to paint (a separate requestAnimationFrame could run first and lag a frame).
 */
export const afterScrollFrame = new Set<(time: number) => void>();
