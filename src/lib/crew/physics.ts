// Colisão e linha de visão. Usado igual no cliente (predição) e no servidor (validação).

import { PLAYER_HALF } from "./constants";
import { DOORS, MAP_HEIGHT, MAP_WIDTH, SOLIDS, WALLS, type DoorId, type Point, type Rect } from "./map";

function overlaps(x: number, y: number, half: number, r: Rect) {
  return x + half > r.x && x - half < r.x + r.w && y + half > r.y && y - half < r.y + r.h;
}

export function solidsWith(closedDoors: readonly DoorId[]): Rect[] {
  if (closedDoors.length === 0) return SOLIDS;
  return [...SOLIDS, ...DOORS.filter((d) => closedDoors.includes(d.id)).map((d) => d.rect)];
}

/** Verdadeiro se a caixa do personagem em (x, y) atravessa algo sólido. */
export function collides(x: number, y: number, solids: readonly Rect[], half = PLAYER_HALF) {
  if (x - half < 0 || y - half < 0 || x + half > MAP_WIDTH || y + half > MAP_HEIGHT) return true;
  return solids.some((r) => overlaps(x, y, half, r));
}

/**
 * Move a caixa do personagem deslizando nas paredes (eixo X depois Y),
 * em subpassos pequenos para nunca atravessar paredes finas.
 */
export function moveWithCollision(from: Point, dx: number, dy: number, solids: readonly Rect[]): Point {
  let { x, y } = from;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
  const sx = dx / steps;
  const sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (sx !== 0 && !collides(x + sx, y, solids)) x += sx;
    if (sy !== 0 && !collides(x, y + sy, solids)) y += sy;
  }
  return { x, y };
}

/** Fantasmas ignoram móveis e paredes, só não saem do mapa. */
export function moveGhost(from: Point, dx: number, dy: number): Point {
  return {
    x: Math.min(MAP_WIDTH - PLAYER_HALF, Math.max(PLAYER_HALF, from.x + dx)),
    y: Math.min(MAP_HEIGHT - PLAYER_HALF, Math.max(PLAYER_HALF, from.y + dy)),
  };
}

/** Verifica se o caminho reto entre dois pontos é livre (amostrado a cada 6 unidades). */
export function pathClear(from: Point, to: Point, solids: readonly Rect[]) {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (collides(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, solids)) return false;
  }
  return true;
}

// ---- Linha de visão (só paredes e portas fechadas bloqueiam a visão) ----

export type Segment = { ax: number; ay: number; bx: number; by: number };

function rectSegments(r: Rect): Segment[] {
  const { x, y, w, h } = r;
  return [
    { ax: x, ay: y, bx: x + w, by: y },
    { ax: x + w, ay: y, bx: x + w, by: y + h },
    { ax: x + w, ay: y + h, bx: x, by: y + h },
    { ax: x, ay: y + h, bx: x, by: y },
  ];
}

const WALL_SEGMENTS = WALLS.flatMap(rectSegments);

export function visionSegments(closedDoors: readonly DoorId[]): Segment[] {
  if (closedDoors.length === 0) return WALL_SEGMENTS;
  return [...WALL_SEGMENTS, ...DOORS.filter((d) => closedDoors.includes(d.id)).flatMap((d) => rectSegments(d.rect))];
}

/** Distância (fração 0..1 do raio) até a primeira parede na direção do raio. */
function castRay(ox: number, oy: number, dx: number, dy: number, segments: readonly Segment[]) {
  let best = 1;
  for (const s of segments) {
    const ex = s.bx - s.ax;
    const ey = s.by - s.ay;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-9) continue;
    const t = ((s.ax - ox) * ey - (s.ay - oy) * ex) / denom;
    const u = ((s.ax - ox) * dy - (s.ay - oy) * dx) / denom;
    if (t > 0 && t < best && u >= 0 && u <= 1) best = t;
  }
  return best;
}

/** Polígono de visão a partir de `origin`, com raio `radius`. */
export function visibilityPolygon(origin: Point, radius: number, segments: readonly Segment[], rays = 160): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const dx = Math.cos(a) * radius;
    const dy = Math.sin(a) * radius;
    const t = castRay(origin.x, origin.y, dx, dy, segments);
    points.push({ x: origin.x + dx * t, y: origin.y + dy * t });
  }
  return points;
}

/** Verdadeiro se `target` está dentro do raio e sem parede no caminho. */
export function canSee(origin: Point, target: Point, radius: number, segments: readonly Segment[]) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  if (dx * dx + dy * dy > radius * radius) return false;
  return castRay(origin.x, origin.y, dx, dy, segments) >= 0.999;
}
