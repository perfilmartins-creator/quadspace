// Núcleo do servidor multiplayer do QUAD CREW (AMOUNG QUAD): salas, senhas,
// limites e roteamento de mensagens. Usado pelo servidor Node dedicado
// (server/crew/index.ts) e pela rota WebSocket da Vercel (/api/crew).

import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { RawData, WebSocket } from "ws";
import {
  EMPTY_ROOM_TTL_MS,
  NET_RATE,
  PASSWORD_MAX,
  PASSWORD_MIN,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  normalizeRoomCode,
  sanitizeName,
} from "../../src/lib/crew/constants";
import { ERROR_MESSAGES, type ClientMessage, type ErrorCode, type ServerMessage } from "../../src/lib/crew/protocol";
import { Room, type Player } from "./room";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const MAX_ROOMS = Number(process.env.CREW_MAX_ROOMS ?? 200);
const ROOM_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const DEFAULT_ORIGINS = [
  "https://quadspace.com.br",
  "https://www.quadspace.com.br",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const ALLOWED_ORIGINS = (process.env.CREW_ALLOWED_ORIGINS ?? DEFAULT_ORIGINS.join(","))
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const rooms = new Map<string, Room>();

// ---------- Senhas ----------

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 32);
  return `${salt.toString("base64")}:${hash.toString("base64")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [saltB64, hashB64] = stored.split(":");
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(expected, actual);
}

function validPassword(raw: unknown): raw is string {
  return typeof raw === "string" && raw.length >= PASSWORD_MIN && raw.length <= PASSWORD_MAX;
}

// ---------- Limites de taxa ----------

class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private limit: number,
    private windowMs: number,
  ) {}
  allow(key: string) {
    const now = Date.now();
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (list.length >= this.limit) {
      this.hits.set(key, list);
      return false;
    }
    list.push(now);
    this.hits.set(key, list);
    return true;
  }
  /** Consulta sem registrar uma nova tentativa. */
  blocked(key: string) {
    const now = Date.now();
    return (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs).length >= this.limit;
  }
  sweep() {
    const now = Date.now();
    for (const [key, list] of this.hits) {
      if (list.every((t) => now - t >= this.windowMs)) this.hits.delete(key);
    }
  }
}

// Na QUAD todos podem estar no mesmo Wi-Fi (mesmo IP público): limites generosos.
const createLimiter = new RateLimiter(Number(process.env.CREW_CREATE_PER_MIN ?? 20), 60_000);
const joinLimiter = new RateLimiter(Number(process.env.CREW_JOIN_PER_MIN ?? 120), 60_000);
/** Senhas erradas por IP + sala em 5 minutos (proteção contra força bruta). */
const wrongPasswordLimiter = new RateLimiter(Number(process.env.CREW_WRONG_PASSWORD_LIMIT ?? 15), 5 * 60_000);

export function originAllowed(origin: string | null | undefined) {
  if (!origin) return process.env.NODE_ENV !== "production";
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Previews da Vercel do projeto.
  return /^https:\/\/quadspace-[a-z0-9-]+\.vercel\.app$/.test(origin);
}

// ---------- Salas ----------

function generateCode() {
  for (let attempt = 0; attempt < 200; attempt++) {
    let code = "";
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
    if (!rooms.has(code)) return code;
  }
  return null;
}

// ---------- Conexões ----------

type Connection = {
  socket: WebSocket;
  ip: string;
  room: Room | null;
  player: Player | null;
  /** Fila de autenticação: processa criar/entrar/reconectar em ordem, um por vez. */
  authQueue: Promise<void>;
  tokens: number;
  lastRefill: number;
};

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function fail(socket: WebSocket, code: ErrorCode) {
  send(socket, { type: "error", code, message: ERROR_MESSAGES[code] });
}

/** ~40 mensagens/s com rajada de 60 (movimento usa 15/s). */
function takeToken(conn: Connection) {
  const now = Date.now();
  conn.tokens = Math.min(60, conn.tokens + ((now - conn.lastRefill) / 1000) * 40);
  conn.lastRefill = now;
  if (conn.tokens < 1) return false;
  conn.tokens -= 1;
  return true;
}

function attach(conn: Connection, room: Room, player: Player) {
  conn.room = room;
  conn.player = player;
  send(conn.socket, { type: "welcome", playerId: player.id, token: player.token, code: room.code });
  room.markDirty();
  room.flush();
}

async function handleAuth(conn: Connection, msg: ClientMessage) {
  const { socket, ip } = conn;

  if (msg.type === "create") {
    if (!createLimiter.allow(ip)) return fail(socket, "RATE_LIMITED");
    const name = sanitizeName(msg.name);
    if (!name) return fail(socket, "INVALID_NAME");
    if (!validPassword(msg.password)) return fail(socket, "INVALID_PASSWORD");
    if (rooms.size >= MAX_ROOMS) return fail(socket, "RATE_LIMITED");
    const passwordHash = await hashPassword(msg.password);
    const code = generateCode();
    if (!code) return fail(socket, "RATE_LIMITED");
    const room = new Room(code, passwordHash);
    rooms.set(code, room);
    const player = room.addPlayer(name, socket);
    return attach(conn, room, player);
  }

  if (msg.type === "join") {
    if (!joinLimiter.allow(ip)) return fail(socket, "RATE_LIMITED");
    const code = normalizeRoomCode(msg.code);
    const room = code ? rooms.get(code) : undefined;
    if (!room) return fail(socket, "ROOM_NOT_FOUND");
    // Força bruta na senha: bloqueia após várias tentativas erradas por IP + sala.
    const guessKey = `${ip}:${room.code}`;
    if (wrongPasswordLimiter.blocked(guessKey)) return fail(socket, "RATE_LIMITED");
    const name = sanitizeName(msg.name);
    if (!name) return fail(socket, "INVALID_NAME");
    if (!validPassword(msg.password)) return fail(socket, "WRONG_PASSWORD");
    const ok = await verifyPassword(msg.password, room.passwordHash);
    if (!ok) {
      wrongPasswordLimiter.allow(guessKey);
      return fail(socket, "WRONG_PASSWORD");
    }
    // Revalida depois do await (outro jogador pode ter entrado no meio).
    if (rooms.get(room.code) !== room) return fail(socket, "ROOM_NOT_FOUND");
    if (room.phase !== "lobby") return fail(socket, "GAME_STARTED");
    if (room.players.size >= room.settings.maxPlayers) return fail(socket, "ROOM_FULL");
    if (room.isNameTaken(name)) return fail(socket, "NAME_TAKEN");
    const player = room.addPlayer(name, socket);
    return attach(conn, room, player);
  }

  if (msg.type === "resume") {
    const code = normalizeRoomCode(msg.code);
    const room = code ? rooms.get(code) : undefined;
    if (!room || typeof msg.playerId !== "string" || typeof msg.token !== "string") {
      return fail(socket, "SESSION_EXPIRED");
    }
    const player = room.resume(msg.playerId, msg.token, socket);
    if (!player) return fail(socket, "SESSION_EXPIRED");
    return attach(conn, room, player);
  }

  if (msg.type === "ping") return send(socket, { type: "pong", c: msg.c, s: Date.now() });
  fail(socket, "BAD_REQUEST");
}

function handleGame(conn: Connection, msg: ClientMessage) {
  const room = conn.room!;
  const player = conn.player!;
  if (room.players.get(player.id) !== player || player.socket !== conn.socket) return;

  switch (msg.type) {
    case "ping":
      return send(conn.socket, { type: "pong", c: msg.c, s: Date.now() });
    case "move":
      return room.move(player, msg.x, msg.y);
    case "leave":
      room.removePlayer(player.id, "leave");
      conn.room = null;
      conn.player = null;
      break;
    case "color":
      room.setColor(player, msg.color);
      break;
    case "settings":
      if (msg.settings && typeof msg.settings === "object") room.updateSettings(player, msg.settings);
      break;
    case "kick":
      room.kick(player, String(msg.playerId));
      break;
    case "start": {
      const error = room.start(player);
      if (error) send(conn.socket, { type: "notice", text: error });
      break;
    }
    case "chat":
      room.chat(player, msg.channel, msg.text);
      break;
    case "kill":
      room.kill(player, String(msg.targetId));
      break;
    case "report":
      room.report(player, String(msg.bodyId));
      break;
    case "emergency":
      room.emergency(player);
      break;
    case "vote":
      room.vote(player, msg.target === "skip" ? "skip" : String(msg.target));
      break;
    case "taskStart":
      room.taskStart(player, msg.taskId);
      break;
    case "taskComplete":
      room.taskComplete(player, msg.taskId);
      break;
    case "sabotage":
      room.sabotageAction(player, msg.kind);
      break;
    case "fixLights":
      room.fixLights(player);
      break;
    case "panel":
      room.holdPanel(player, msg.panelId);
      break;
    case "vent":
      room.vent(player, msg.action === "exit" ? "exit" : "enter");
      break;
    case "ventMove":
      room.ventMove(player, msg.ventId);
      break;
    case "pet":
      room.pet(player);
      break;
    case "backToLobby":
      if (player.id === room.hostId || !room.players.get(room.hostId)?.connected) room.backToLobby();
      break;
    default:
      return;
  }
  room.flush();
}

function parse(data: RawData): ClientMessage | null {
  try {
    const text = data.toString();
    if (text.length > 4096) return null;
    const msg = JSON.parse(text);
    return msg && typeof msg === "object" && typeof msg.type === "string" ? (msg as ClientMessage) : null;
  } catch {
    return null;
  }
}

// ---------- Conexões e loop ----------

/** Atende uma conexão WebSocket já aberta. */
export function handleConnection(socket: WebSocket, info: { ip: string; origin: string | null | undefined }) {
  ensureLoop();
  if (!originAllowed(info.origin)) {
    socket.close(4003, "origin");
    return;
  }
  const conn: Connection = {
    socket,
    ip: info.ip || "unknown",
    room: null,
    player: null,
    authQueue: Promise.resolve(),
    tokens: 60,
    lastRefill: Date.now(),
  };

  let alive = true;
  socket.on("pong", () => (alive = true));
  const heartbeat = setInterval(() => {
    if (!alive) return socket.terminate();
    alive = false;
    socket.ping();
  }, 15_000);

  socket.on("message", (data) => {
    if (!takeToken(conn)) return;
    const msg = parse(data);
    if (!msg) return;
    if (conn.room && conn.player) {
      try {
        handleGame(conn, msg);
      } catch (error) {
        console.error("[crew] erro ao processar mensagem", error);
      }
      return;
    }
    // Uma autenticação por vez por conexão (evita criar/entrar em dobro).
    conn.authQueue = conn.authQueue.then(async () => {
      if (conn.room && conn.player) return; // já entrou por uma mensagem anterior
      try {
        await handleAuth(conn, msg);
      } catch (error) {
        console.error("[crew] erro de autenticação", error);
        fail(socket, "BAD_REQUEST");
      }
    });
  });

  socket.on("close", () => {
    clearInterval(heartbeat);
    if (conn.room && conn.player) conn.room.disconnect(conn.player, socket);
  });
  socket.on("error", () => socket.terminate());
}

let loopStarted = false;

/** Inicia (uma vez por processo) o tick das salas e a limpeza dos limites. */
export function ensureLoop() {
  if (loopStarted) return;
  loopStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      try {
        room.tick(now);
      } catch (error) {
        console.error(`[crew] erro no tick da sala ${code}`, error);
      }
      const abandoned = room.players.size === 0 || (room.emptySince !== null && now - room.emptySince > EMPTY_ROOM_TTL_MS);
      if (abandoned || now - room.createdAt > ROOM_MAX_AGE_MS) {
        for (const p of room.players.values()) p.socket?.close(4002, "room-closed");
        rooms.delete(code);
      }
    }
  }, 1000 / NET_RATE);

  setInterval(() => {
    createLimiter.sweep();
    joinLimiter.sweep();
    wrongPasswordLimiter.sweep();
  }, 60_000);
}

export function closeAllRooms() {
  for (const room of rooms.values()) for (const p of room.players.values()) p.socket?.close(1012, "restart");
}
