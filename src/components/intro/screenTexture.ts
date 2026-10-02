import * as THREE from "three";
import type { PaletteColors } from "@/lib/palettes";

export const SCREEN_W = 1024;
export const SCREEN_H = 640;

export type ScreenState = { kind: "off" } | { kind: "boot"; progress: number } | { kind: "site" };

const MONO = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace';

export function displayFont() {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim();
  return family || "system-ui, sans-serif";
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawOff(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, SCREEN_W, SCREEN_H);
  g.addColorStop(0, "#0b0f19");
  g.addColorStop(1, "#05070c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(SCREEN_W * 0.45, 0);
  ctx.lineTo(SCREEN_W * 0.2, SCREEN_H);
  ctx.lineTo(0, SCREEN_H);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = `500 22px ${MONO}`;
  ctx.textAlign = "center";
  ctx.fillText("waiting for deploy…", SCREEN_W / 2, SCREEN_H / 2 + 8);
}

function drawBoot(ctx: CanvasRenderingContext2D, colors: PaletteColors, progress: number) {
  ctx.fillStyle = "#070b14";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.textAlign = "left";
  ctx.font = `600 28px ${MONO}`;
  const lines = [
    { at: 0, text: "$ npm run deploy", color: "#e6ebf5" },
    { at: 0.15, text: "✓ fetched portfolio from server", color: colors.c3 },
    { at: 0.4, text: "✓ compiled React components", color: colors.c3 },
    { at: 0.65, text: "✓ painting pixels", color: colors.c3 },
    { at: 0.9, text: "➜ live on your screen", color: colors.c1 },
  ];
  lines.forEach((line, i) => {
    if (progress < line.at) return;
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, 70, 110 + i * 56);
  });
  // Progress bar
  const x = 70;
  const y = SCREEN_H - 130;
  const w = SCREEN_W - 140;
  roundRect(ctx, x, y, w, 26, 13);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, colors.c1);
  g.addColorStop(1, colors.c2);
  roundRect(ctx, x, y, Math.max(26, w * progress), 26, 13);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = "#e6ebf5";
  ctx.font = `700 26px ${MONO}`;
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(progress * 100)}%`, x + w, y - 18);
}

/** A miniature of the real hero, so flying into the screen hands over to the actual page. */
function drawSite(ctx: CanvasRenderingContext2D, colors: PaletteColors) {
  const { background: bg, foreground: fg, c1, c2, c3 } = colors;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  const glow = ctx.createRadialGradient(SCREEN_W / 2, SCREEN_H * 0.45, 0, SCREEN_W / 2, SCREEN_H * 0.45, SCREEN_W * 0.55);
  glow.addColorStop(0, `${c1}40`);
  glow.addColorStop(1, `${c1}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // Nav pill
  ctx.globalAlpha = 0.9;
  roundRect(ctx, 150, 22, SCREEN_W - 300, 46, 23);
  ctx.fillStyle = `${fg}14`;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(176, 45, 15, 0, Math.PI * 2);
  ctx.fillStyle = c1;
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    roundRect(ctx, 400 + i * 62, 40, 44, 10, 5);
    ctx.fillStyle = i === 0 ? c1 : `${fg}40`;
    ctx.fill();
  }

  // Floating keycaps in the corners
  const keys: [number, number, number, string][] = [
    [70, 150, -0.3, c1],
    [930, 140, 0.35, c2],
    [100, 470, 0.25, c3],
    [920, 460, -0.2, `${fg}30`],
  ];
  keys.forEach(([x, y, r, color]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r);
    roundRect(ctx, -38, -34, 76, 76, 16);
    ctx.fillStyle = `${fg}22`;
    ctx.fill();
    roundRect(ctx, -38, -40, 76, 72, 16);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  });

  // Name, fitted to ~78% of the width
  const family = displayFont();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let size = 120;
  ctx.font = `700 ${size}px ${family}`;
  const full = ctx.measureText("Nikhil Ranga").width;
  size = Math.min(150, (size * SCREEN_W * 0.74) / full);
  ctx.font = `700 ${size}px ${family}`;
  const first = ctx.measureText("Nikhil ").width;
  const last = ctx.measureText("Ranga").width;
  const startX = (SCREEN_W - first - last) / 2;
  const baseY = 280;
  ctx.fillStyle = fg;
  ctx.fillText("Nikhil", startX, baseY);
  const grad = ctx.createLinearGradient(startX + first, 0, startX + first + last, 0);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.5, c3);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillText("Ranga", startX + first, baseY);

  // Role pill, bio lines, buttons and stat tiles
  roundRect(ctx, SCREEN_W / 2 - 170, 315, 340, 44, 22);
  ctx.fillStyle = `${fg}12`;
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = `600 22px ${MONO}`;
  ctx.textAlign = "center";
  ctx.fillText("$ whoami → Full Stack Dev", SCREEN_W / 2, 344);
  [0, 1].forEach((i) => {
    roundRect(ctx, SCREEN_W / 2 - (i ? 190 : 240), 385 + i * 24, i ? 380 : 480, 10, 5);
    ctx.fillStyle = `${fg}30`;
    ctx.fill();
  });
  const btn = ctx.createLinearGradient(SCREEN_W / 2 - 180, 0, SCREEN_W / 2 - 20, 0);
  btn.addColorStop(0, c1);
  btn.addColorStop(1, c2);
  roundRect(ctx, SCREEN_W / 2 - 180, 448, 160, 50, 25);
  ctx.fillStyle = btn;
  ctx.fill();
  roundRect(ctx, SCREEN_W / 2 + 10, 448, 160, 50, 25);
  ctx.strokeStyle = `${fg}40`;
  ctx.lineWidth = 3;
  ctx.stroke();
  [-1, 0, 1].forEach((i) => {
    roundRect(ctx, SCREEN_W / 2 - 60 + i * 140, 528, 120, 58, 14);
    ctx.fillStyle = `${fg}18`;
    ctx.fill();
  });

  // Gradient tape across the bottom
  ctx.save();
  ctx.translate(SCREEN_W / 2, SCREEN_H - 14);
  ctx.rotate(-0.035);
  const tape = ctx.createLinearGradient(-SCREEN_W / 2, 0, SCREEN_W / 2, 0);
  tape.addColorStop(0, c1);
  tape.addColorStop(1, c3);
  ctx.fillStyle = tape;
  ctx.fillRect(-SCREEN_W * 0.6, -18, SCREEN_W * 1.2, 36);
  ctx.restore();
}

/** Canvas texture for the desktop monitor. `draw` is cheap to call; it only repaints on change. */
export function createScreen() {
  const canvas = document.createElement("canvas");
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  let last = "";

  const draw = (state: ScreenState, colors: PaletteColors, force = false) => {
    const key = `${state.kind}:${state.kind === "boot" ? Math.round(state.progress * 40) : ""}:${colors.c1}${colors.background}`;
    if (!force && key === last) return;
    last = key;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    if (state.kind === "off") drawOff(ctx);
    else if (state.kind === "boot") drawBoot(ctx, colors, Math.round(state.progress * 40) / 40);
    else drawSite(ctx, colors);
    ctx.restore();
    texture.needsUpdate = true;
  };

  return { texture, draw };
}
