/**
 * CSS colour at position `u` (0–1) along the theme's brand ramp (brand-1 → brand-2 → brand-3),
 * for stepping colours across a row of items such as keycaps.
 */
export function brandMix(u: number) {
  const t = Math.min(1, Math.max(0, u));
  return t < 0.5
    ? `color-mix(in oklab, hsl(var(--brand-1)) ${Math.round((1 - t * 2) * 100)}%, hsl(var(--brand-2)))`
    : `color-mix(in oklab, hsl(var(--brand-2)) ${Math.round((1 - (t - 0.5) * 2) * 100)}%, hsl(var(--brand-3)))`;
}
