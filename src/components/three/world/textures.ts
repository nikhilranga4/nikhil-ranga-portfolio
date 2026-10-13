import * as THREE from "three";

/** Small deterministic random so the textures look the same on every visit. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Blotchy cast concrete with faint form-tie holes and panel seams. */
export function concreteTexture() {
  const rand = rng(7);
  const texture = canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#56676a";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1400; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const r = 2 + rand() * 26;
      const light = rand() > 0.5;
      ctx.fillStyle = light ? `rgba(170,200,200,${rand() * 0.06})` : `rgba(0,0,0,${rand() * 0.1})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Seams
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.stroke();
    // Form-tie holes
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    for (const [x, y] of [
      [64, 64],
      [192, 64],
      [320, 64],
      [448, 64],
      [64, 320],
      [192, 320],
      [320, 320],
      [448, 320],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Rainy night skyline seen through the room's window (emissive). */
export function cityTexture() {
  const rand = rng(21);
  return canvasTexture(1024, 448, (ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, 448);
    sky.addColorStop(0, "#0c1c22");
    sky.addColorStop(0.6, "#173238");
    sky.addColorStop(1, "#1e3a3c");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1024, 448);
    // Far towers, then near towers, each with lit windows
    for (const layer of [
      { count: 26, min: 120, max: 300, color: "#0f2227", lit: 0.12 },
      { count: 14, min: 180, max: 400, color: "#08161a", lit: 0.2 },
    ]) {
      for (let i = 0; i < layer.count; i++) {
        const w = 30 + rand() * 70;
        const x = rand() * 1024 - w / 2;
        const h = layer.min + rand() * (layer.max - layer.min);
        ctx.fillStyle = layer.color;
        ctx.fillRect(x, 448 - h, w, h);
        for (let wy = 448 - h + 8; wy < 440; wy += 9) {
          for (let wx = x + 5; wx < x + w - 5; wx += 8) {
            if (rand() < layer.lit) {
              const warm = rand() > 0.35;
              ctx.fillStyle = warm ? `rgba(255,${170 + rand() * 60},${110 + rand() * 50},${0.5 + rand() * 0.5})` : `rgba(120,240,230,${0.4 + rand() * 0.5})`;
              ctx.fillRect(wx, wy, 3, 4);
            }
          }
        }
        // Aircraft warning light
        if (rand() > 0.6) {
          ctx.fillStyle = "rgba(255,80,70,0.95)";
          ctx.fillRect(x + w / 2, 448 - h - 4, 3, 3);
        }
      }
    }
    // Rain streaks
    ctx.strokeStyle = "rgba(180,230,230,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 220; i++) {
      const x = rand() * 1024;
      const y = rand() * 448;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 18 + rand() * 20);
      ctx.stroke();
    }
  });
}

const CODE_COLORS = ["#7cf5c8", "#19e3d4", "#ff7a5c", "#ffd6a5", "#c792ea", "#82aaff", "#e6eef0"];

/** An editor full of syntax-highlighted code (emissive). */
export function codeTexture(seed: number) {
  const rand = rng(seed);
  return canvasTexture(512, 300, (ctx) => {
    ctx.fillStyle = "#0b1518";
    ctx.fillRect(0, 0, 512, 300);
    // Title bar and file tree
    ctx.fillStyle = "#13242a";
    ctx.fillRect(0, 0, 512, 16);
    ctx.fillRect(0, 16, 90, 284);
    for (const [i, c] of ["#ff5f57", "#febc2e", "#28c840"].entries()) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(10 + i * 12, 8, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let y = 26; y < 290; y += 11) {
      ctx.fillStyle = `rgba(200,230,230,${0.25 + rand() * 0.25})`;
      ctx.fillRect(10 + (rand() > 0.6 ? 10 : 0), y, 30 + rand() * 40, 4);
    }
    // Code lines
    for (let y = 26, indent = 0; y < 292; y += 10) {
      indent = Math.max(0, Math.min(5, indent + (rand() > 0.7 ? 1 : rand() > 0.75 ? -1 : 0)));
      ctx.fillStyle = "rgba(120,150,150,0.4)";
      ctx.fillRect(98, y, 10, 4);
      let x = 116 + indent * 14;
      const tokens = 1 + Math.floor(rand() * 5);
      for (let t = 0; t < tokens && x < 500; t++) {
        const w = 10 + rand() * 50;
        ctx.fillStyle = CODE_COLORS[Math.floor(rand() * CODE_COLORS.length)];
        ctx.fillRect(x, y, w, 4);
        x += w + 6;
      }
    }
  });
}

/** Soft radial blob, used for glows and contact shadows. */
export function radialTexture(inner: string, outer: string) {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

/** Vertical fade (opaque at the bottom), for light shafts. */
export function shaftTexture() {
  return canvasTexture(
    4,
    256,
    (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(255,255,255,1)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, 256);
    },
    false
  );
}

/**
 * Glossy-plastic matcap: lighting baked into a sphere image, so keycaps shade nicely with no
 * lights or environment map at all (the material colour tints it).
 */
export function plasticMatcap() {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 256, 256);
    const body = ctx.createRadialGradient(100, 88, 6, 128, 128, 128);
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.2, "#f4f7f7");
    body.addColorStop(0.55, "#cfd6d6");
    body.addColorStop(0.85, "#8a9496");
    body.addColorStop(1, "#4f585a");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();
    // Cool rim from below, like the corridor's teal bounce
    const rim = ctx.createRadialGradient(128, 128, 96, 128, 128, 128);
    rim.addColorStop(0, "rgba(120,240,230,0)");
    rim.addColorStop(1, "rgba(120,240,230,0.35)");
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineTo(128, 128);
    ctx.fill();
    // Hot specular
    const spec = ctx.createRadialGradient(92, 78, 0, 92, 78, 34);
    spec.addColorStop(0, "rgba(255,255,255,0.95)");
    spec.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = spec;
    ctx.fillRect(0, 0, 256, 256);
  });
}

/**
 * Fractured glass, centred on the impact point: radial cracks that fork as they run out, with
 * a few concentric rings. White on transparent (tinted by the material).
 */
export function crackTexture() {
  const rand = rng(41);
  const texture = canvasTexture(
    1024,
    1024,
    (ctx) => {
      ctx.clearRect(0, 0, 1024, 1024);
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineCap = "round";
      const cx = 512;
      const cy = 512;
      // Radial fractures, each wandering and forking
      const crack = (x: number, y: number, angle: number, length: number, width: number) => {
        let px = x;
        let py = y;
        let a = angle;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(px, py);
        const steps = Math.ceil(length / 18);
        for (let i = 0; i < steps; i++) {
          a += (rand() - 0.5) * 0.45;
          px += Math.cos(a) * 18;
          py += Math.sin(a) * 18;
          ctx.lineTo(px, py);
          if (rand() < 0.08 && width > 0.8) {
            ctx.stroke();
            crack(px, py, a + (rand() > 0.5 ? 0.6 : -0.6), length * 0.45 * rand(), width * 0.6);
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(px, py);
          }
        }
        ctx.stroke();
      };
      for (let i = 0; i < 16; i++) crack(cx, cy, (i / 16) * Math.PI * 2 + rand() * 0.3, 260 + rand() * 260, 2.6);
      // Concentric rings, broken into arcs
      for (const r of [38, 90, 160]) {
        ctx.lineWidth = r < 60 ? 2.2 : 1.4;
        for (let a = 0; a < Math.PI * 2; a += 0.35 + rand() * 0.3) {
          ctx.beginPath();
          ctx.arc(cx, cy, r + (rand() - 0.5) * 10, a, a + 0.18 + rand() * 0.25);
          ctx.stroke();
        }
      }
      // Crushed centre
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 34);
      core.addColorStop(0, "rgba(255,255,255,0.8)");
      core.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = core;
      ctx.fillRect(cx - 40, cy - 40, 80, 80);
    },
    false
  );
  return texture;
}

/**
 * A tower's curtain wall: a grid of windows, some lit. Night: dark glass with warm and teal
 * rooms. Day: sky-blue glass with bright reflections. Repeats seamlessly.
 */
export function windowsTexture(variant: "night" | "day") {
  const rand = rng(variant === "night" ? 61 : 67);
  const texture = canvasTexture(256, 512, (ctx) => {
    ctx.fillStyle = variant === "night" ? "#0b161a" : "#5d87a6";
    ctx.fillRect(0, 0, 256, 512);
    for (let y = 0; y < 512; y += 16) {
      for (let x = 0; x < 256; x += 16) {
        const r = rand();
        if (variant === "night") {
          ctx.fillStyle =
            r < 0.26 ? `rgba(255,${180 + rand() * 50},${120 + rand() * 40},${0.75 + rand() * 0.25})` : r < 0.36 ? `rgba(110,235,225,${0.6 + rand() * 0.4})` : "rgba(26,44,52,1)";
        } else {
          const l = 150 + rand() * 70;
          ctx.fillStyle = r < 0.12 ? `rgb(${l + 40},${l + 55},${l + 60})` : `rgb(${l * 0.55},${l * 0.75},${l * 0.95})`;
        }
        ctx.fillRect(x + 2, y + 3, 12, 10);
      }
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Wet street from above: dark asphalt, lane lines and pools of neon and streetlight. */
export function streetTexture(variant: "night" | "day") {
  const rand = rng(variant === "night" ? 71 : 73);
  return canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = variant === "night" ? "#0b1214" : "#7d878b";
    ctx.fillRect(0, 0, 1024, 1024);
    // Lane markings
    ctx.fillStyle = variant === "night" ? "rgba(230,240,240,0.35)" : "rgba(255,255,255,0.8)";
    for (let y = 0; y < 1024; y += 90) ctx.fillRect(506, y, 12, 50);
    ctx.fillRect(250, 0, 6, 1024);
    ctx.fillRect(768, 0, 6, 1024);
    if (variant === "night") {
      // Reflected neon and streetlights
      for (let i = 0; i < 26; i++) {
        const x = rand() * 1024;
        const y = rand() * 1024;
        const r = 30 + rand() * 90;
        const teal = rand() > 0.5;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, teal ? "rgba(25,227,212,0.45)" : "rgba(255,122,92,0.4)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    } else {
      // Puddles catching the sky
      for (let i = 0; i < 16; i++) {
        const x = rand() * 1024;
        const y = rand() * 1024;
        ctx.fillStyle = "rgba(190,220,240,0.35)";
        ctx.beginPath();
        ctx.ellipse(x, y, 30 + rand() * 60, 12 + rand() * 30, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

/**
 * Sky dome gradient (top → bottom). Day: deep blue overhead fading to a warm haze. Night: inky
 * overhead with the city's teal glow along the horizon, so towers read as silhouettes.
 */
export function skyTexture(variant: "night" | "day" = "day") {
  return canvasTexture(4, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    const stops = variant === "day" ? ["#3f86c6", "#9ccbea", "#f3e3cf"] : ["#01040a", "#061a24", "#14424a"];
    g.addColorStop(0, stops[0]);
    g.addColorStop(0.55, stops[1]);
    g.addColorStop(1, stops[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
  });
}

/** The avenue seen along its length: asphalt with dashed centre lines and solid edges (repeats along u). */
export function avenueTexture(variant: "night" | "day") {
  const texture = canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = variant === "night" ? "#10171a" : "#6f777b";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = variant === "night" ? "rgba(235,240,240,0.55)" : "rgba(255,255,255,0.9)";
    ctx.fillRect(0, 6, 512, 3);
    ctx.fillRect(0, 119, 512, 3);
    for (let x = 0; x < 512; x += 64) {
      ctx.fillRect(x, 44, 36, 3);
      ctx.fillRect(x, 81, 36, 3);
    }
    ctx.fillStyle = variant === "night" ? "rgba(255,200,120,0.6)" : "rgba(255,220,120,0.95)";
    ctx.fillRect(0, 62, 512, 2);
    ctx.fillRect(0, 66, 512, 2);
  });
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}


/**
 * Six-lane road seen from above, one 12-unit stretch along the road (u) by its full width (v):
 * asphalt grain, dashed lane lines, a double yellow centre line and solid edge lines.
 */
export function roadTexture(variant: "night" | "day") {
  const W = 256;
  const H = 512;
  const texture = canvasTexture(W, H, (ctx) => {
    const rand = rng(variant === "night" ? 21 : 22);
    ctx.fillStyle = variant === "night" ? "#1e2629" : "#5d6468";
    ctx.fillRect(0, 0, W, H);
    // Grain and tyre-worn bands down the middle of each lane
    for (let i = 0; i < 2600; i++) {
      const v = variant === "night" ? 22 + rand() * 26 : 80 + rand() * 40;
      ctx.fillStyle = `rgba(${v},${v + 4},${v + 6},0.35)`;
      ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 2, 1 + rand() * 2);
    }
    const lane = H / 6;
    ctx.fillStyle = variant === "night" ? "rgba(0,0,0,0.18)" : "rgba(30,34,36,0.16)";
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(0, i * lane + lane * 0.22, W, lane * 0.14);
      ctx.fillRect(0, i * lane + lane * 0.64, W, lane * 0.14);
    }
    const white = variant === "night" ? "rgba(225,232,232,0.7)" : "rgba(250,250,245,0.92)";
    ctx.fillStyle = white;
    // Edge lines
    ctx.fillRect(0, 6, W, 5);
    ctx.fillRect(0, H - 11, W, 5);
    // Dashed lane lines (4 on, 8 off per 12 units)
    for (const i of [1, 2, 4, 5]) ctx.fillRect(0, i * lane - 2, W / 3, 4);
    // Double yellow in the middle
    ctx.fillStyle = variant === "night" ? "rgba(255,196,90,0.75)" : "rgba(255,206,64,0.95)";
    ctx.fillRect(0, H / 2 - 7, W, 4);
    ctx.fillRect(0, H / 2 + 3, W, 4);
  });
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/** A zebra crossing: white bars across the full width of the road */
export function zebraTexture() {
  return canvasTexture(64, 512, (ctx) => {
    ctx.clearRect(0, 0, 64, 512);
    ctx.fillStyle = "rgba(245,245,240,0.92)";
    for (let y = 12; y < 500; y += 30) ctx.fillRect(4, y, 56, 16);
  });
}

/** Soft-edged rounded rectangle, for shadows cast on the road */
export function softRectTexture() {
  return canvasTexture(
    128,
    128,
    (ctx) => {
      ctx.clearRect(0, 0, 128, 128);
      ctx.filter = "blur(14px)";
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(30, 30, 68, 68, 18);
      ctx.fill();
    },
    false
  );
}

/** The yellow "OVERSIZE LOAD" plate on the back of a wide-load trailer */
export function oversizeTexture() {
  return canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = "#f6c41a";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = "#111";
    ctx.font = "bold 62px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("OVERSIZE LOAD", 256, 68);
  });
}
