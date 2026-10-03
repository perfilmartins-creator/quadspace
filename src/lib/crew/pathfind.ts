// Navegação em grade (BFS): usada pelo Júlio (a cabra) e pelos bots de teste.
// Um navegador por cena (mapa da partida e lobby), criado sob demanda.

import { PLAYER_HALF } from "./constants";
import { LOBBY_HEIGHT, LOBBY_SOLIDS, LOBBY_WIDTH } from "./lobby";
import { MAP_HEIGHT, MAP_WIDTH, type Point, type Rect } from "./map";
import { collides, solidsWith } from "./physics";

const CELL = 20;

export type Navigator = {
  path(from: Point, to: Point): Point[];
  nearestFree(p: Point): Point;
};

export function createNavigator(solids: readonly Rect[], width: number, height: number): Navigator {
  const GW = Math.floor(width / CELL);
  const GH = Math.floor(height / CELL);
  let free: boolean[] | null = null;
  const grid = () => {
    if (free) return free;
    free = [];
    for (let gy = 0; gy < GH; gy++)
      for (let gx = 0; gx < GW; gx++) free.push(!collides(gx * CELL + CELL / 2, gy * CELL + CELL / 2, solids, PLAYER_HALF + 2));
    return free;
  };
  const nearestIndex = (gx: number, gy: number, radius: number) => {
    const f = grid();
    let best = -1;
    let bestD = Infinity;
    for (let y = gy - radius; y <= gy + radius; y++)
      for (let x = gx - radius; x <= gx + radius; x++) {
        if (x < 0 || y < 0 || x >= GW || y >= GH || !f[y * GW + x]) continue;
        const d = (x - gx) ** 2 + (y - gy) ** 2;
        if (d < bestD) {
          bestD = d;
          best = y * GW + x;
        }
      }
    return best;
  };
  const center = (c: number): Point => ({ x: (c % GW) * CELL + CELL / 2, y: Math.floor(c / GW) * CELL + CELL / 2 });

  return {
    path(from, to) {
      const f = grid();
      const sIdx = nearestIndex(Math.floor(from.x / CELL), Math.floor(from.y / CELL), 4);
      const gIdx = nearestIndex(Math.floor(to.x / CELL), Math.floor(to.y / CELL), 4);
      if (sIdx < 0 || gIdx < 0) return [to];
      const prev = new Int32Array(GW * GH).fill(-1);
      prev[sIdx] = sIdx;
      const queue = [sIdx];
      for (let qi = 0; qi < queue.length; qi++) {
        const c = queue[qi];
        if (c === gIdx) break;
        const x = c % GW;
        const y = Math.floor(c / GW);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
          const n = ny * GW + nx;
          if (!f[n] || prev[n] !== -1) continue;
          prev[n] = c;
          queue.push(n);
        }
      }
      const out: Point[] = [];
      for (let c = gIdx; c !== sIdx && prev[c] !== -1; c = prev[c]) out.push(center(c));
      out.reverse();
      out.push(to);
      return out;
    },
    nearestFree(p) {
      const idx = nearestIndex(Math.floor(p.x / CELL), Math.floor(p.y / CELL), 20);
      return idx < 0 ? p : center(idx);
    },
  };
}

let gameNav: Navigator | null = null;
let lobbyNav: Navigator | null = null;

export function gameNavigator() {
  gameNav ??= createNavigator(solidsWith([]), MAP_WIDTH, MAP_HEIGHT);
  return gameNav;
}

export function lobbyNavigator() {
  lobbyNav ??= createNavigator(LOBBY_SOLIDS, LOBBY_WIDTH, LOBBY_HEIGHT);
  return lobbyNav;
}

/** Caminho no mapa da partida (compatível com os bots de teste). */
export function path(from: Point, to: Point): Point[] {
  return gameNavigator().path(from, to);
}

export function nearestFreePoint(p: Point): Point {
  return gameNavigator().nearestFree(p);
}

/** Remove pontos intermediários colineares (caminhos mais curtos para seguir). */
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
