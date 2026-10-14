import { createContext, useCallback, useContext, useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import {
  DEFAULT_PALETTE,
  FALLBACK_COLORS,
  isPaletteId,
  readPaletteColors,
  type PaletteColors,
  type PaletteId,
} from "@/lib/palettes";

type Theme = "dark" | "light" | "system";

/** Screen point the circular theme-reveal animation expands from. */
export type RevealOrigin = { x: number; y: number };

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedMode: "dark" | "light";
  setTheme: (theme: Theme, origin?: RevealOrigin) => void;
  palette: PaletteId;
  setPalette: (palette: PaletteId, origin?: RevealOrigin) => void;
  /** Resolved hex colours of the active palette, for WebGL and image URLs */
  colors: PaletteColors;
  /** Whether the scroll-guide robot is shown */
  buddy: boolean;
  setBuddy: (on: boolean) => void;
};

const PALETTE_KEY = "vite-ui-palette";
const BUDDY_KEY = "vite-ui-buddy";

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedMode: "dark",
  setTheme: () => null,
  palette: DEFAULT_PALETTE,
  setPalette: () => null,
  colors: FALLBACK_COLORS,
  buddy: true,
  setBuddy: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const readStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode etc.) — the choice just won't persist
  }
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

/** Runs a theme change inside a circular View Transition reveal when supported. */
function withReveal(update: () => void, origin?: RevealOrigin) {
  const doc = document as ViewTransitionDocument;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduceMotion) {
    update();
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? 0;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const root = document.documentElement;

  root.classList.add("theme-switching");
  const transition = doc.startViewTransition(() => flushSync(update));
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    })
    .catch(() => undefined);
  transition.finished.finally(() => root.classList.remove("theme-switching"));
}

const systemMode = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (readStorage(storageKey) as Theme) || defaultTheme
  );
  const [palette, setPaletteState] = useState<PaletteId>(() => {
    const saved = readStorage(PALETTE_KEY);
    return isPaletteId(saved) ? saved : DEFAULT_PALETTE;
  });
  const [buddy, setBuddyState] = useState(() => readStorage(BUDDY_KEY) !== "off");
  const [colors, setColors] = useState<PaletteColors>(FALLBACK_COLORS);

  const resolvedMode = theme === "system" ? systemMode() : theme;

  // Layout effect so the DOM is updated before the view-transition snapshot is taken
  useLayoutEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedMode);
    root.dataset.palette = palette;

    const next = readPaletteColors(root);
    setColors(next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next.background);
  }, [resolvedMode, palette]);

  const setTheme = useCallback(
    (next: Theme, origin?: RevealOrigin) => {
      writeStorage(storageKey, next);
      withReveal(() => setThemeState(next), origin);
    },
    [storageKey]
  );

  const setPalette = useCallback((next: PaletteId, origin?: RevealOrigin) => {
    writeStorage(PALETTE_KEY, next);
    withReveal(() => setPaletteState(next), origin);
  }, []);

  const setBuddy = useCallback((on: boolean) => {
    writeStorage(BUDDY_KEY, on ? "on" : "off");
    setBuddyState(on);
  }, []);

  const value = { theme, resolvedMode, setTheme, palette, setPalette, colors, buddy, setBuddy };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
