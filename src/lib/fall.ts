import { createContext, useContext } from "react";

/**
 * True inside a falling section slab (see FallIn). Components with their own scroll-driven 3D
 * entrance (ScrollReveal3D) stand still there, so the drop is the one motion you see.
 */
export const FallContext = createContext(false);

export const useInsideFall = () => useContext(FallContext);
