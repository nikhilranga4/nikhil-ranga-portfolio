import type Lenis from "lenis";

/** Current Lenis instance, readable by non-React code (e.g. the 3D stage for scroll velocity). */
export const lenisRef: { current: Lenis | null } = { current: null };
