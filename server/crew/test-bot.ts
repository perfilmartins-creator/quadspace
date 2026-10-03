// Cliente bot para testes do servidor do QUAD CREW (anda pelo mapa com BFS).

import WebSocket from "ws";
import { BASE_SPEED } from "../../src/lib/crew/constants";
import type { Point } from "../../src/lib/crew/map";
import type { ChatMessage, ClientMessage, RoomState, ServerMessage } from "../../src/lib/crew/protocol";

export const URL = process.env.CREW_URL ?? "ws://localhost:3031";
const ORIGIN = "http://localhost:3000";
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

import { path } from "../../src/lib/crew/pathfind";
export { path };

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

