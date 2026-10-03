// Navegação em grade (BFS) pelo mapa da QUAD: usada pelo Júlio (a cabra) e pelos bots de teste.

import { PLAYER_HALF } from "./constants";
import { MAP_HEIGHT, MAP_WIDTH, type Point } from "./map";
import { collides, solidsWith } from "./physics";

const CELL = 20;
const GW = Math.floor(MAP_WIDTH / CELL);
const GH = Math.floor(MAP_HEIGHT / CELL);
let free: boolean[] | null = null;

function grid() {
  if (free) return free;
  const solids = solidsWith([]);
  free = [];
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) free.push(!collides(gx * CELL + CELL / 2, gy * CELL + CELL / 2, solids, PLAYER_HALF + 2));
  return free;
}

/** Caminho de pontos (centros de células livres) de `from` até `to`, terminando em `to`. */
export function path(from: Point, to: Point): Point[] {
  const free = grid();
  const cell = (p: Point) => [Math.floor(p.x / CELL), Math.floor(p.y / CELL)] as const;
  const [sx, sy] = cell(from);
  const nearestFree = (gx: number, gy: number) => {
    let best = gy * GW + gx;
    let bestD = Infinity;
    for (let y = gy - 4; y <= gy + 4; y++)
      for (let x = gx - 4; x <= gx + 4; x++) {
        if (x < 0 || y < 0 || x >= GW || y >= GH || !free[y * GW + x]) continue;
        const d = (x - gx) ** 2 + (y - gy) ** 2;
        if (d < bestD) {
          bestD = d;
          best = y * GW + x;
        }
      }
    return best;
  };
  const start = nearestFree(sx, sy);
  const [tx, ty] = cell(to);
  const goal = nearestFree(tx, ty);
  const prev = new Int32Array(GW * GH).fill(-1);
  prev[start] = start;
  const queue = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    const c = queue[qi];
    if (c === goal) break;
    const x = c % GW;
    const y = Math.floor(c / GW);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const n = ny * GW + nx;
      if (!free[n] || prev[n] !== -1) continue;
      prev[n] = c;
      queue.push(n);
    }
  }
  const out: Point[] = [];
  for (let c = goal; c !== start && prev[c] !== -1; c = prev[c]) out.push({ x: (c % GW) * CELL + CELL / 2, y: Math.floor(c / GW) * CELL + CELL / 2 });
  out.reverse();
  out.push(to);
  return out;
}

/** Remove pontos intermediários colineares (caminhos mais curtos para enviar/seguir). */
export function simplify(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    if ((b.x - a.x) * (c.y - b.y) !== (b.y - a.y) * (c.x - b.x)) out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Centro da célula livre mais próxima de `p` (para nascer sem ficar preso em móveis). */
export function nearestFreePoint(p: Point): Point {
  const free = grid();
  const gx0 = Math.floor(p.x / CELL);
  const gy0 = Math.floor(p.y / CELL);
  for (let r = 0; r < 20; r++)
    for (let y = gy0 - r; y <= gy0 + r; y++)
      for (let x = gx0 - r; x <= gx0 + r; x++) {
        if (x < 0 || y < 0 || x >= GW || y >= GH || !free[y * GW + x]) continue;
        return { x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 };
      }
  return p;
}
