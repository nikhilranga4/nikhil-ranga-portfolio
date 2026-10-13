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
