// Converts just the glyphs the 3D intro needs from each theme's display font into three.js
// typeface JSON (public/fonts/intro-*.json). Run with `node scripts/build-name-font.mjs` after
// changing fonts or the intro text; the output is committed so the build doesn't depend on it.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const root = new URL("..", import.meta.url);
const CHARS = [...new Set("NikhilRanga NIKHILRANGA 200 OK")];
const FONTS = {
  lagoon: "@fontsource/fredoka/files/fredoka-latin-700-normal.woff",
  glacier: "@fontsource/unbounded/files/unbounded-latin-700-normal.woff",
  ink: "@fontsource/fraunces/files/fraunces-latin-700-normal.woff",
};

const round = (n) => Math.round(n * 10) / 10;

/** Split path commands into contours of segments with explicit start/end points. */
function contours(commands) {
  const list = [];
  let current = null;
  let pen = null;
  for (const c of commands) {
    if (c.type === "M") {
      current = { start: { x: c.x, y: c.y }, segs: [] };
      list.push(current);
      pen = { x: c.x, y: c.y };
    } else if (c.type === "Z") {
      if (current && (pen.x !== current.start.x || pen.y !== current.start.y)) {
        current.segs.push({ type: "L", from: pen, to: current.start });
      }
      pen = current?.start ?? pen;
    } else {
      const to = { x: c.x, y: c.y };
      const seg = { type: c.type, from: pen, to };
      if (c.type === "Q") seg.c = [{ x: c.x1, y: c.y1 }];
      if (c.type === "C") seg.c = [{ x: c.x1, y: c.y1 }, { x: c.x2, y: c.y2 }];
      current.segs.push(seg);
      pen = to;
    }
  }
  return list.filter((k) => k.segs.length);
}

/** Polygon approximation of a contour (curves sampled), for area and containment tests. */
function polygon(contour) {
  const pts = [];
  for (const s of contour.segs) {
    const steps = s.type === "L" ? 1 : 8;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (s.type === "L") pts.push(s.to);
      else if (s.type === "Q") {
        const [c] = s.c;
        const u = 1 - t;
        pts.push({ x: u * u * s.from.x + 2 * u * t * c.x + t * t * s.to.x, y: u * u * s.from.y + 2 * u * t * c.y + t * t * s.to.y });
      } else {
        const [a, b] = s.c;
        const u = 1 - t;
        pts.push({
          x: u ** 3 * s.from.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t ** 3 * s.to.x,
          y: u ** 3 * s.from.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t ** 3 * s.to.y,
        });
      }
    }
  }
  return pts;
}

const area = (pts) => pts.reduce((sum, p, i) => {
  const q = pts[(i + 1) % pts.length];
  return sum + (p.x * q.y - q.x * p.y);
}, 0) / 2;

function inside(pt, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

function reverse(contour) {
  const segs = contour.segs
    .slice()
    .reverse()
    .map((s) => ({ type: s.type, from: s.to, to: s.from, c: s.c ? s.c.slice().reverse() : undefined }));
  return { start: segs[0].from, segs };
}

/**
 * three.js typeface outline for a glyph. Contour direction is normalised so solid parts run
 * clockwise and holes counter-clockwise: some fonts (e.g. Fraunces) have overlapping contours
 * drawn the "wrong" way, which three.js would otherwise read as holes.
 */
function outline(commands, scale) {
  const list = contours(commands);
  const polys = list.map(polygon);
  const p = (pt) => `${round(pt.x * scale)} ${round(pt.y * scale)}`;
  let o = "";
  list.forEach((contour, i) => {
    // Nested only if (nearly) all of it lies inside the other contour; overlapping parts are solids
    const contained = (poly) => polys[i].filter((pt) => inside(pt, poly)).length >= polys[i].length * 0.9;
    const depth = polys.filter((poly, j) => j !== i && contained(poly)).length;
    const wantClockwise = depth % 2 === 0;
    const clockwise = area(polys[i]) < 0;
    const k = clockwise === wantClockwise ? contour : reverse(contour);
    o += `m ${p(k.start)} `;
    for (const s of k.segs) {
      if (s.type === "L") o += `l ${p(s.to)} `;
      // three.js expects the end point first, then the control point(s)
      else if (s.type === "Q") o += `q ${p(s.to)} ${p(s.c[0])} `;
      else o += `b ${p(s.to)} ${p(s.c[0])} ${p(s.c[1])} `;
    }
  });
  return o.trim();
}

for (const [theme, file] of Object.entries(FONTS)) {
  const path = fileURLToPath(new URL(`node_modules/${file}`, root));
  const buffer = readFileSync(path);
  const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  const scale = 1000 / font.unitsPerEm;
  const glyphs = {};
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;

  for (const char of CHARS) {
    const glyph = font.charToGlyph(char);
    const o = outline(glyph.path.commands, scale);
    const box = glyph.getBoundingBox();
    xMin = Math.min(xMin, box.x1 * scale);
    xMax = Math.max(xMax, box.x2 * scale);
    yMin = Math.min(yMin, box.y1 * scale);
    yMax = Math.max(yMax, box.y2 * scale);
    glyphs[char] = {
      ha: Math.round(glyph.advanceWidth * scale),
      x_min: Math.round(box.x1 * scale),
      x_max: Math.round(box.x2 * scale),
      o,
    };
  }

  const json = {
    glyphs,
    familyName: font.names.fontFamily?.en ?? theme,
    ascender: Math.round(font.ascender * scale),
    descender: Math.round(font.descender * scale),
    underlinePosition: Math.round((font.tables.post?.underlinePosition ?? -100) * scale),
    underlineThickness: Math.round((font.tables.post?.underlineThickness ?? 50) * scale),
    boundingBox: { xMin: Math.round(xMin), xMax: Math.round(xMax), yMin: Math.round(yMin), yMax: Math.round(yMax) },
    resolution: 1000,
    original_font_information: { license: "SIL Open Font License 1.1", source: file },
    cssFontWeight: "bold",
    cssFontStyle: "normal",
  };
  mkdirSync(fileURLToPath(new URL("public/fonts/", root)), { recursive: true });
  const out = fileURLToPath(new URL(`public/fonts/intro-${theme}.json`, root));
  writeFileSync(out, JSON.stringify(json));
  console.log(theme, Object.keys(glyphs).length, "glyphs", `${(JSON.stringify(json).length / 1024).toFixed(1)} KB`);
}
