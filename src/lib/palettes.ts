/**
 * Colour themes. The actual colour values live in `src/index.css` (one block per palette and
 * mode) so there is a single source of truth; this file lists the palettes and reads the
 * resolved values back as hex for places CSS can't reach (WebGL materials, image URLs).
 */
export const PALETTES = [
  { id: "candy", name: "Neon Candy", emoji: "🍬" },
  { id: "aurora", name: "Cyber Aurora", emoji: "🌌" },
  { id: "sunset", name: "Sunset Pop", emoji: "🌅" },
  { id: "ocean", name: "Ocean Depths", emoji: "🌊" },
  { id: "gold", name: "Midnight Gold", emoji: "👑" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "ocean";

export const isPaletteId = (value: unknown): value is PaletteId =>
  PALETTES.some((p) => p.id === value);

export interface PaletteColors {
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  c5: string;
  background: string;
  foreground: string;
}

export const FALLBACK_COLORS: PaletteColors = {
  c1: "#4289fa",
  c2: "#7274f3",
  c3: "#08d3f7",
  c4: "#43e5c5",
  c5: "#4cc3fa",
  background: "#060b18",
  foreground: "#f4f7fb",
};

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** Parses a raw token like "328 100% 62%" into a hex colour. */
function tokenToHex(raw: string, fallback: string) {
  const match = raw.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!match) return fallback;
  return hslToHex(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** Reads the currently applied palette tokens from the document as hex colours. */
export function readPaletteColors(el: Element = document.documentElement): PaletteColors {
  const style = getComputedStyle(el);
  const read = (name: string, key: keyof PaletteColors) =>
    tokenToHex(style.getPropertyValue(name), FALLBACK_COLORS[key]);
  return {
    c1: read("--brand-1", "c1"),
    c2: read("--brand-2", "c2"),
    c3: read("--brand-3", "c3"),
    c4: read("--brand-4", "c4"),
    c5: read("--brand-5", "c5"),
    background: read("--background", "background"),
    foreground: read("--foreground", "foreground"),
  };
}
