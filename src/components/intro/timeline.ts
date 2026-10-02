/**
 * The intro's storyboard as ranges of scroll progress (0–1). Both the 3D scene and the lite
 * fallback read these, and everything is a pure function of progress so scrolling up rewinds it.
 */
export const PHASES = {
  name: [0, 0.3],
  request: [0.3, 0.45],
  respond: [0.45, 0.58],
  deploy: [0.58, 0.78],
  enter: [0.78, 1],
} as const;

export type Phase = keyof typeof PHASES;

export const STEPS: { phase: Phase; label: string; caption: string }[] = [
  { phase: "name", label: "Name", caption: "scroll to boot" },
  { phase: "request", label: "Request", caption: "GET /nikhil-ranga" },
  { phase: "respond", label: "Response", caption: "200 OK · portfolio found" },
  { phase: "deploy", label: "Deploy", caption: "deploying to your screen…" },
  { phase: "enter", label: "Launch", caption: "welcome in" },
];

export const NAME_WORDS = ["Nikhil", "Ranga"];
export const NAME_LETTERS = NAME_WORDS.join("").length;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Local 0–1 progress of `p` between `a` and `b`. */
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

/** Local progress through a named phase, optionally only part of it (from/to as 0–1 of the phase). */
export const phase = (p: number, name: Phase, from = 0, to = 1) => {
  const [a, b] = PHASES[name];
  return seg(p, a + (b - a) * from, a + (b - a) * to);
};

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Entrance progress for letter `i`: letters arrive one after another across the name phase. */
export const letterProgress = (p: number, i: number) => {
  const start = 0.04 + (i / NAME_LETTERS) * 0.7;
  return phase(p, "name", start, start + 0.2);
};

/** Index of the active step for the progress rail and captions. */
export const stepAt = (p: number) => {
  const i = STEPS.findIndex((s) => p < PHASES[s.phase][1]);
  return i === -1 ? STEPS.length - 1 : i;
};
