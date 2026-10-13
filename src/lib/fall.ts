import { createContext, useContext } from "react";

/**
 * True inside a section card riding the convoy (see RideIn). Components with their own scroll-driven 3D
 * entrance (ScrollReveal3D) stand still there, so the ride-in is the one motion you see.
 */
export const FallContext = createContext(false);

export const useInsideFall = () => useContext(FallContext);
