import { convoy } from "@/lib/convoy";
import { CAMERA_DRIFT, ROAD, ROAD_HALF, ROAD_X0, landedAt, roadScale, type WorldState } from "./timeline";

/**
 * The avenue past the hero, turning a corner between every two sections: right, then left, then
 * right … (a staircase, so it can never double back on itself). Which way the first corner goes is
 * new on every visit.
 *
 * Positions along it are a distance `d`, measured along the straight legs (leg 0 starts at the
 * tower, where world x = d). The camera's distance follows the scroll through one knot per section
 * boundary, placed so each corner is taken while the gap between two cards crosses the middle of
 * the screen. The cards stay upright on screen, so the camera turns with the road and the city
 * swings round under the convoy.
 */

/** Where the road begins, behind the tower */
export const ROUTE_FROM = -140;
/** Shortest leg between two corners: a junction, its pavements and a block of buildings */
const MIN_LEG = 62;
/** Scroll (share of the viewport) a turn takes on either side of its gap, at most */
const TURN_WINDOW = 0.42;
/** Radius the camera and the traffic turn on (about the junction's inner corner) */
export const TURN_R = ROAD_HALF;
/** Road kept beyond the end of the page */
const RUN_OUT = 160;
/** +1 = the first corner turns right, -1 = left (then they alternate) */
const FIRST_TURN: 1 | -1 = Math.random() < 0.5 ? 1 : -1;

export interface Leg {
  /** Start point (the corner it leaves from; the road's start for leg 0) */
  x: number;
  z: number;
  heading: number;
  /** Forward and right, on the ground (x, z) */
  tx: number;
  tz: number;
  nx: number;
  nz: number;
  /** Distance range along the route */
  from: number;
  to: number;
  /** Turn at its start / end corner: +1 right, -1 left, 0 none */
  turnIn: number;
  turnOut: number;
}

/** Scroll position, the camera's distance there, and how fast it's moving (distance per px) */
interface Knot {
  scroll: number;
  d: number;
  m: number;
}

/**
 * Slopes for a monotone cubic through the knots (Fritsch–Carlson), so the camera never stops or
 * runs backwards and its speed changes smoothly between the straights and the turns. It eases off
 * from the landing and leaves the last knot at the page's cruising speed.
 */
function smoothSlopes(knots: Knot[], cruise: number) {
  const n = knots.length;
  if (n < 2) return;
  const secant = (i: number) => (knots[i + 1].d - knots[i].d) / (knots[i + 1].scroll - knots[i].scroll);
  knots[0].m = 0;
  for (let i = 1; i < n - 1; i++) {
    const a = secant(i - 1);
    const b = secant(i);
    const ha = knots[i].scroll - knots[i - 1].scroll;
    const hb = knots[i + 1].scroll - knots[i].scroll;
    const w1 = 2 * hb + ha;
    const w2 = hb + 2 * ha;
    knots[i].m = a > 0 && b > 0 ? (w1 + w2) / (w1 / a + w2 / b) : 0;
  }
  knots[n - 1].m = Math.min(cruise, 3 * secant(n - 2));
}

export interface Route {
  legs: Leg[];
  /** Scroll position → camera distance */
  knots: Knot[];
  /** Changes only when the road itself moves, so the city isn't rebuilt for nothing */
  layoutKey: string;
}

export interface RoutePoint {
  x: number;
  z: number;
  heading: number;
}

function makeLeg(x: number, z: number, heading: number, from: number, to: number, turnIn: number, turnOut: number): Leg {
  const tx = Math.round(Math.cos(heading));
  const tz = Math.round(Math.sin(heading));
  return { x, z, heading, tx, tz, nx: -tz, nz: tx, from, to, turnIn, turnOut };
}

function buildRoute(w: WorldState): Route {
  const k = roadScale(w.vw);
  const land = landedAt(w);
  const knots: Knot[] = [{ scroll: Number.isFinite(land) ? land : 0, d: ROAD_X0, m: 0 }];
  const corners: number[] = [];
  const maxScroll = typeof document !== "undefined" ? document.documentElement.scrollHeight - w.vh : Infinity;
  const slots = [...convoy.slots.values()].filter((s) => s.width > 0);
  slots.sort((a, b) => a.top - b.top);
  if (Number.isFinite(land)) {
    // The gap above each section (after the first) crossing the middle of the screen. The name
    // truck follows the footer down the same straight, so the page ends on a street lined with
    // buildings rather than in a junction
    const at = slots
      .slice(1)
      .filter((slot) => slot.kind === "card")
      .map((slot) => slot.top - slot.gap / 2 - w.vh / 2);
    at.forEach((scroll, i) => {
      const prev = knots[knots.length - 1];
      const room = scroll - prev.scroll;
      if (room < 20) return;
      // Each turn takes its own stretch of scroll round the gap, and is over before the page ends
      const before = Math.min(TURN_WINDOW * w.vh, room * 0.45);
      const next = i + 1 < at.length ? at[i + 1] : Infinity;
      const after = Math.max(30, Math.min(TURN_WINDOW * w.vh, (next - scroll) * 0.45, maxScroll - 0.04 * w.vh - scroll));
      const minStraight = corners.length ? MIN_LEG - 2 * TURN_R : MIN_LEG - TURN_R;
      const straight = Math.max(minStraight, CAMERA_DRIFT * k * (scroll - before - prev.scroll));
      // Whole units, so a re-measure that moves nothing visible leaves the city alone
      const d = Math.round(prev.d + straight + TURN_R);
      corners.push(d);
      knots.push({ scroll: scroll - before, d: d - TURN_R, m: 0 }, { scroll: scroll + after, d: d + TURN_R, m: 0 });
    });
  }
  smoothSlopes(knots, CAMERA_DRIFT * k);
  const last = knots[knots.length - 1];
  const bottom = Number.isFinite(maxScroll) ? maxScroll : last.scroll;
  const end = Math.ceil((last.d + CAMERA_DRIFT * k * Math.max(0, bottom - last.scroll) + RUN_OUT) / 40) * 40;

  const legs: Leg[] = [];
  let x = ROUTE_FROM;
  let z = ROAD.z;
  let heading = 0;
  let from = ROUTE_FROM;
  for (let i = 1; i <= corners.length + 1; i++) {
    const to = i <= corners.length ? corners[i - 1] : Math.max(end, from + MIN_LEG);
    const turnIn = i === 1 ? 0 : FIRST_TURN * (i % 2 === 0 ? 1 : -1);
    const turnOut = i <= corners.length ? FIRST_TURN * (i % 2 === 1 ? 1 : -1) : 0;
    const leg = makeLeg(x, z, heading, from, to, turnIn, turnOut);
    legs.push(leg);
    x += leg.tx * (to - from);
    z += leg.tz * (to - from);
    heading += (turnOut * Math.PI) / 2;
    from = to;
  }
  const layoutKey = legs.map((l) => l.to).join(",") + `|${FIRST_TURN}`;
  return { legs, knots, layoutKey };
}

let cached: Route | null = null;
let cacheFor = "";

/** The route for the page as it's laid out now (rebuilt when the sections are re-measured) */
export function getRoute(w: WorldState): Route {
  const key = `${convoy.version}|${w.vw}|${w.vh}|${w.heroEnd}`;
  if (!cached || key !== cacheFor) {
    cached = buildRoute(w);
    cacheFor = key;
  }
  return cached;
}

/** The leg a distance falls on (the first and last legs run on past the ends) */
export function legAt(route: Route, d: number) {
  const { legs } = route;
  for (let i = 0; i < legs.length - 1; i++) if (d < legs[i].to) return i;
  return legs.length - 1;
}

/**
 * The point `d` along the route, `lateral` to the right of its centre line, and the heading there.
 * Near a corner it follows a quarter circle round the junction's inner corner, so lanes keep their
 * spacing through the turn.
 */
export function routeAt(route: Route, d: number, lateral: number, out: RoutePoint) {
  const i = legAt(route, d);
  const leg = route.legs[i];
  // Corner at the end of this leg, or at its start
  let a: Leg | null = null;
  let turn = 0;
  let cornerD = 0;
  if (leg.turnOut && d > leg.to - TURN_R) {
    a = leg;
    turn = leg.turnOut;
    cornerD = leg.to;
  } else if (leg.turnIn && d < leg.from + TURN_R) {
    a = route.legs[i - 1];
    turn = leg.turnIn;
    cornerD = leg.from;
  }
  let cx: number;
  let cz: number;
  let heading: number;
  if (a) {
    const phi = ((d - (cornerD - TURN_R)) / (2 * TURN_R)) * (Math.PI / 2);
    // Corner point, then the circle's centre at the junction's inner corner
    const px = a.x + a.tx * (cornerD - a.from);
    const pz = a.z + a.tz * (cornerD - a.from);
    const ox = px - a.tx * TURN_R + turn * a.nx * TURN_R;
    const oz = pz - a.tz * TURN_R + turn * a.nz * TURN_R;
    cx = ox + TURN_R * (-turn * a.nx * Math.cos(phi) + a.tx * Math.sin(phi));
    cz = oz + TURN_R * (-turn * a.nz * Math.cos(phi) + a.tz * Math.sin(phi));
    heading = a.heading + turn * phi;
  } else {
    cx = leg.x + leg.tx * (d - leg.from);
    cz = leg.z + leg.tz * (d - leg.from);
    heading = leg.heading;
  }
  out.x = cx - Math.sin(heading) * lateral;
  out.z = cz + Math.cos(heading) * lateral;
  out.heading = heading;
  return out;
}

/** How far along the route the camera is for the current scroll */
export function cameraD(w: WorldState) {
  const { knots } = getRoute(w);
  const s = w.scroll;
  if (!(s > knots[0].scroll)) return knots[0].d;
  for (let i = 1; i < knots.length; i++) {
    const b = knots[i];
    if (s < b.scroll) {
      // Cubic Hermite between the two knots
      const a = knots[i - 1];
      const h = b.scroll - a.scroll;
      const t = (s - a.scroll) / h;
      const t2 = t * t;
      const t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * a.d + (t3 - 2 * t2 + t) * h * a.m + (3 * t2 - 2 * t3) * b.d + (t3 - t2) * h * b.m;
    }
  }
  const last = knots[knots.length - 1];
  return last.d + (knots.length > 1 ? last.m : CAMERA_DRIFT * roadScale(w.vw)) * (s - last.scroll);
}

/** The hovering camera's spot on the road (x, z) and the way it faces (screen-up) */
export function cameraPose(w: WorldState, out: RoutePoint) {
  return routeAt(getRoute(w), cameraD(w), 0, out);
}

const camTmp: RoutePoint = { x: 0, z: 0, heading: 0 };

/**
 * Where a point of the page (CSS px, page coordinates) is on the card plane right now. The camera
 * looks straight down with screen-up along the road's heading, so the mapping is one uniform scale
 * and a rotation. Writes x, z and the heading the page's "up" points along.
 */
export function pageToRoad(w: WorldState, pageX: number, pageY: number, out: RoutePoint) {
  const k = roadScale(w.vw);
  const cam = cameraPose(w, camTmp);
  const along = -(pageY - w.scroll - w.vh / 2) * k;
  const lat = (pageX - w.vw / 2) * k;
  const tx = Math.cos(cam.heading);
  const tz = Math.sin(cam.heading);
  out.x = cam.x + tx * along - tz * lat;
  out.z = cam.z + tz * along + tx * lat;
  out.heading = cam.heading;
  return out;
}
