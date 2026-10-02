// Cliente bot para testes do servidor do QUAD CREW (anda pelo mapa com BFS).

import WebSocket from "ws";
import { BASE_SPEED, PLAYER_HALF } from "../../src/lib/crew/constants";
import { MAP_HEIGHT, MAP_WIDTH, type Point } from "../../src/lib/crew/map";
import { collides, solidsWith } from "../../src/lib/crew/physics";
import type { ChatMessage, ClientMessage, RoomState, ServerMessage } from "../../src/lib/crew/protocol";

export const URL = process.env.CREW_URL ?? "ws://localhost:3031";
const ORIGIN = "http://localhost:3000";
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- Navegação em grade (BFS) para andar legalmente pelo mapa ----------

const CELL = 20;
const GW = Math.floor(MAP_WIDTH / CELL);
const GH = Math.floor(MAP_HEIGHT / CELL);
const solids = solidsWith([]);
const free: boolean[] = [];
for (let gy = 0; gy < GH; gy++)
  for (let gx = 0; gx < GW; gx++) free.push(!collides(gx * CELL + CELL / 2, gy * CELL + CELL / 2, solids, PLAYER_HALF + 2));

export function path(from: Point, to: Point): Point[] {
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

// ---------- Cliente bot ----------

export class Bot {
  ws!: WebSocket;
  state: RoomState | null = null;
  playerId = "";
  token = "";
  code = "";
  pos: Point = { x: 0, y: 0 };
  errors: string[] = [];
  notices: string[] = [];
  chats: ChatMessage[] = [];
  killed: string[] = [];
  raw: string[] = [];
  corrections = 0;
  kicked = false;
  closed = false;
  snapIds = new Set<string>();

  constructor(public name: string) {}

  connect() {
    return new Promise<void>((resolve, reject) => {
      this.closed = false;
      this.ws = new WebSocket(URL, { headers: { Origin: ORIGIN } });
      this.ws.on("open", () => resolve());
      this.ws.on("error", reject);
      this.ws.on("close", () => (this.closed = true));
      this.ws.on("message", (data) => {
        const text = data.toString();
        this.raw.push(text);
        const msg = JSON.parse(text) as ServerMessage;
        if (msg.type === "welcome") {
          this.playerId = msg.playerId;
          this.token = msg.token;
          this.code = msg.code;
        } else if (msg.type === "state") {
          this.state = msg.state;
          const me = msg.state.players.find((p) => p.id === this.playerId);
          if (me && this.pos.x === 0) this.syncPos();
        } else if (msg.type === "snap") {
          this.snapIds = new Set(msg.p.map((e) => e[0]));
          const mine = msg.p.find((e) => e[0] === this.playerId);
          if (mine && this.pos.x === 0) this.pos = { x: mine[1], y: mine[2] };
          this.lastSnap = msg.p;
        } else if (msg.type === "correct") {
          this.corrections++;
          this.pos = { x: msg.x, y: msg.y };
        } else if (msg.type === "error") this.errors.push(msg.code);
        else if (msg.type === "notice") this.notices.push(msg.text);
        else if (msg.type === "chat") this.chats.push(msg.message);
        else if (msg.type === "killed") this.killed.push(msg.victimId);
        else if (msg.type === "kicked") this.kicked = true;
      });
    });
  }
  lastSnap: [string, number, number, 0 | 1][] = [];
  syncPos() {
    const mine = this.lastSnap.find((e) => e[0] === this.playerId);
    if (mine) this.pos = { x: mine[1], y: mine[2] };
  }
  send(msg: ClientMessage) {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
  get you() {
    return this.state!.you;
  }
  async walkTo(target: Point, speedMul = 1) {
    const step = (BASE_SPEED * speedMul) / 15;
    for (const wp of path(this.pos, target)) {
      while (Math.hypot(wp.x - this.pos.x, wp.y - this.pos.y) > 1) {
        const dx = wp.x - this.pos.x;
        const dy = wp.y - this.pos.y;
        const d = Math.hypot(dx, dy);
        const k = Math.min(1, step / d);
        this.pos = { x: this.pos.x + dx * k, y: this.pos.y + dy * k };
        this.send({ type: "move", x: this.pos.x, y: this.pos.y });
        await sleep(1000 / 15);
      }
    }
  }
  close() {
    this.ws.close();
  }
}

