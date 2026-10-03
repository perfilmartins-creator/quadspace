// Uma sala do QUAD CREW. Toda regra do jogo é decidida aqui (servidor autoritativo).
//
// Estados (phase):            cena
//   lobby      LOBBY          lobby   — mapa jogável: bola, missões, Safe Zone, READY
//   countdown  STARTING       lobby   — 5 s, ainda dá para andar; o host pode cancelar
//   playing    IN_GAME        partida
//   meeting    MEETING        partida (só no modo clássico)
//   ejecting   MEETING        partida (resultado da votação)
//   ended      RESULT         partida — depois todos voltam ao lobby (RETURNING_TO_LOBBY)
//
// Regras que mudam entre modos ficam em ./modes.ts; o lobby jogável em ./lobby.ts.

import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { WebSocket } from "ws";
import {
  BASE_SPEED,
  COLORS,
  COUNTDOWN_MS,
  CRITICAL_DURATION_MS,
  DEFAULT_SETTINGS,
  DOORS_DURATION_MS,
  EJECT_MS,
  EMERGENCY_RANGE,
  RAT_ID,
  RAT_SPEED,
  HOST_GRACE_MS,
  KILL_RANGE,
  MEETING_INTRO_MS,
  MIN_PLAYERS,
  PANEL_HOLD_MS,
  RAT_FLEE_MS,
  RAT_FLEE_SPEED,
  RAT_HIT_COOLDOWN_MS,
  RAT_HIT_RANGE,
  RAT_XP,
  RECONNECT_GRACE_MS,
  REPORT_RANGE,
  ROLE_REVEAL_MS,
  SABOTAGE_COOLDOWN_MS,
  TASK_MIN_MS,
  USE_RANGE,
  VENT_RANGE,
  VOTE_RESULT_MS,
  sanitizeChat,
  sanitizeSettings,
  type Settings,
} from "../../src/lib/crew/constants";
import {
  AFK_MS,
  AFK_SAFE_MS,
  EMOTES,
  EMOTE_COOLDOWN_MS,
  LOBBY_INTERACT_RANGE,
  LOBBY_OBJECTS,
  LOBBY_SOLIDS,
  READY_HOLD_MS,
  READY_ZONE,
  SAFE_ZONE,
  inRect,
  inSafeZone,
  lobbyAreaAt,
  lobbySpawnPoint,
  type EmoteId,
  type LobbyObjectId,
} from "../../src/lib/crew/lobby";
import {
  CRITICAL_PANELS,
  EMERGENCY_POS,
  LIGHTS_PANEL,
  TASKS,
  VENTS,
  distance,
  doorsOfRoom,
  roomAt,
  spawnPoint,
  taskById,
  ventById,
  type PanelId,
  type Point,
  type TaskId,
  type VentId,
} from "../../src/lib/crew/map";
import { PRESETS, modeOf } from "../../src/lib/crew/modes";
import { gameNavigator, lobbyNavigator, simplify, type Navigator } from "../../src/lib/crew/pathfind";
import { canSee, collides, moveGhost, moveWithCollision, pathClear, solidsWith, visionSegments } from "../../src/lib/crew/physics";
import type {
  Body,
  ChatChannel,
  ChatMessage,
  EjectState,
  EndReason,
  EndState,
  LobbyFx,
  MeetingState,
  Phase,
  PublicPlayer,
  Role,
  RoomState,
  SabotageKind,
  SabotageState,
  ServerMessage,
  TimerView,
  VoteTarget,
} from "../../src/lib/crew/protocol";
import { currentMission, newBall, newMissionTracker, resetBall, stepBall, trackMission, type BallState, type Kicker, type MissionTracker } from "./lobby";
import { MODE_RULES, type ModeRules } from "./modes";

export type Player = {
  id: string;
  token: string;
  name: string;
  color: string;
  joinedAt: number;
  socket: WebSocket | null;
  connected: boolean;
  disconnectedAt: number;
  x: number;
  y: number;
  lastMoveAt: number;
  /** Velocidade estimada a partir dos últimos movimentos (para chutar a bola). */
  vx: number;
  vy: number;
  role: Role | null;
  alive: boolean;
  /** A morte já foi descoberta por todos (reunião). */
  deathKnown: boolean;
  /** Papel revelado publicamente após expulsão. */
  roleRevealed: boolean;
  tasks: { id: TaskId; done: boolean }[];
  taskStarts: Map<TaskId, number>;
  emergencyLeft: number;
  killReadyAt: number;
  sabotageReadyAt: number;
  /** Preso até este instante (caçador antes de ser liberado). */
  releaseAt: number;
  vote: VoteTarget | null;
  chatTimes: number[];
  vent: VentId | null;
  // ---- Lobby ----
  ready: boolean;
  readyZoneSince: number;
  readyAt: number;
  safe: boolean;
  afk: boolean;
  afkMoved: boolean;
  lastActiveAt: number;
  emoteAt: number;
  interactAt: number;
  lastKickAt: number;
  missions: MissionTracker;
};

const ENDED_AUTO_LOBBY_MS = 90_000;
const CHAT_MIN_INTERVAL = 600;
const CHAT_BURST = 6;
const CHAT_WINDOW = 10_000;
const HIT_FX_INTERVAL_MS = 90;
/** Limites de AFK (ajustáveis por variável de ambiente para testes). */
const AFK_LIMIT_MS = Number(process.env.CREW_AFK_MS ?? AFK_MS);
const AFK_SAFE_LIMIT_MS = Number(process.env.CREW_AFK_SAFE_MS ?? AFK_SAFE_MS);

function VENTS_NEAR(p: { x: number; y: number }) {
  return VENTS.find((v) => distance(p, v.pos) <= VENT_RANGE);
}

export function newId(bytes = 9) {
  return randomBytes(bytes).toString("base64url");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function emptySabotage(): SabotageState {
  return { lights: false, critical: null, doors: null };
}

const GAME_RAT_SPOTS: Point[] = [...TASKS.map((t) => t.pos), EMERGENCY_POS, { x: 330, y: 1120 }, { x: 1500, y: 1180 }, { x: 900, y: 640 }];
const LOBBY_RAT_SPOTS: Point[] = [
  { x: 120, y: 620 },
  { x: 420, y: 900 },
  { x: 700, y: 600 },
  { x: 980, y: 900 },
  { x: 1300, y: 620 },
  { x: 260, y: 330 },
  { x: 1150, y: 330 },
];

export class Room {
  code: string;
  passwordHash: string;
  createdAt = Date.now();
  players = new Map<string, Player>();
  hostId = "";
  phase: Phase = "lobby";
  settings: Settings = { ...DEFAULT_SETTINGS };
  round = 0;
  countdownEndsAt: number | null = null;
  frozenUntil = 0;
  revealUntil = 0;
  bodies: Body[] = [];
  meeting: MeetingState | null = null;
  sabotage: SabotageState = emptySabotage();
  panelUntil: Record<PanelId, number> = { servidor: 0, roteador: 0 };
  eject: EjectState | null = null;
  end: EndState | null = null;
  endedAt = 0;
  emptySince: number | null = null;
  timer: TimerView | null = null;

  // ---- Lobby jogável ----
  ball: BallState = newBall();
  score = { red: 0, blue: 0 };
  private lastHitFxAt = 0;
  private lastTick = 0;

  private dirty = true;
  private chatSeq = 0;

  /** Júlio, o rato da QUAD: corre pela cena atual, guincha e aceita carinho. Não interfere nas regras. */
  rat = {
    scene: "lobby" as "lobby" | "game",
    pos: lobbyNavigator().nearestFree({ x: 420, y: 900 }),
    route: [] as Point[],
    restUntil: 0,
    fleeUntil: 0,
    nextSqueakAt: 0,
    stuckSince: 0,
    lastTick: 0,
  };
  private ratHitAt = new Map<string, number>();

  constructor(code: string, passwordHash: string) {
    this.code = code;
    this.passwordHash = passwordHash;
  }

  get rules(): ModeRules {
    return MODE_RULES[this.settings.gameMode] ?? MODE_RULES.classic;
  }

  /** Cena física em que os personagens estão. */
  get scene(): "lobby" | "game" {
    return this.phase === "lobby" || this.phase === "countdown" ? "lobby" : "game";
  }

  // ---------- Jogadores ----------

  get playerList() {
    return [...this.players.values()].sort((a, b) => a.joinedAt - b.joinedAt);
  }

  get connectedCount() {
    return this.playerList.filter((p) => p.connected).length;
  }

  isNameTaken(name: string) {
    const lower = name.toLocaleLowerCase("pt-BR");
    return this.playerList.some((p) => p.name.toLocaleLowerCase("pt-BR") === lower);
  }

  /** Ponto livre na área de spawn do lobby, longe de quem já está lá. */
  private freeLobbySpawn(exceptId?: string): Point {
    const others = this.playerList.filter((p) => p.id !== exceptId);
    for (let i = 0; i < 17; i++) {
      const s = lobbySpawnPoint(i);
      if (others.every((p) => Math.hypot(p.x - s.x, p.y - s.y) > 40)) return s;
    }
    return lobbySpawnPoint(randomInt(17));
  }

  addPlayer(name: string, socket: WebSocket): Player {
    const now = Date.now();
    const used = new Set(this.playerList.map((p) => p.color));
    const color = COLORS.find((c) => !used.has(c.id))?.id ?? COLORS[0].id;
    const spawn = this.scene === "lobby" ? this.freeLobbySpawn() : spawnPoint(this.players.size, Math.max(this.settings.maxPlayers, this.players.size + 1));
    const player: Player = {
      id: newId(),
      token: newId(24),
      name,
      color,
      joinedAt: now + this.players.size / 1000,
      socket,
      connected: true,
      disconnectedAt: 0,
      x: spawn.x,
      y: spawn.y,
      lastMoveAt: now,
      vx: 0,
      vy: 0,
      role: null,
      alive: true,
      deathKnown: false,
      roleRevealed: false,
      tasks: [],
      taskStarts: new Map(),
      emergencyLeft: 0,
      killReadyAt: 0,
      sabotageReadyAt: 0,
      releaseAt: 0,
      vote: null,
      chatTimes: [],
      vent: null,
      ready: false,
      readyZoneSince: 0,
      readyAt: 0,
      safe: false,
      afk: false,
      afkMoved: false,
      lastActiveAt: now,
      emoteAt: 0,
      interactAt: 0,
      lastKickAt: 0,
      missions: newMissionTracker(),
    };
    this.players.set(player.id, player);
    if (!this.hostId || !this.players.has(this.hostId)) this.hostId = player.id;
    this.emptySince = null;
    this.broadcastFx({ kind: "joined", name }, player.id);
    this.markDirty();
    return player;
  }

  /** Reconecta um jogador existente (mesmo id + token). Posição, READY, papel e tarefas são mantidos. */
  resume(playerId: string, token: string, socket: WebSocket): Player | null {
    const player = this.players.get(playerId);
    if (!player || !safeEqual(player.token, token)) return null;
    if (player.socket && player.socket !== socket) {
      try {
        player.socket.close(4000, "replaced");
      } catch {
        // ignora
      }
    }
    player.socket = socket;
    player.connected = true;
    player.disconnectedAt = 0;
    player.lastMoveAt = Date.now();
    player.lastActiveAt = Date.now();
    this.emptySince = null;
    this.markDirty();
    return player;
  }

  disconnect(player: Player, socket: WebSocket) {
    if (player.socket !== socket) return; // conexão antiga, já substituída
    player.socket = null;
    player.connected = false;
    player.disconnectedAt = Date.now();
    if (this.connectedCount === 0) this.emptySince = Date.now();
    this.markDirty();
  }

  removePlayer(playerId: string, reason: "leave" | "kick" | "timeout") {
    const player = this.players.get(playerId);
    if (!player) return;
    this.players.delete(playerId);
    this.ratHitAt.delete(playerId);
    if (player.socket) {
      try {
        if (reason === "kick") this.sendTo(player, { type: "kicked" });
        player.socket.close(4001, reason);
      } catch {
        // ignora
      }
    }
    if (this.hostId === playerId) {
      const next = this.playerList.find((p) => p.connected) ?? this.playerList[0];
      this.hostId = next?.id ?? "";
      if (next) this.broadcastFx({ kind: "host", name: next.name });
    }
    this.bodies = this.bodies.filter((b) => b.id !== playerId);
    for (const p of this.players.values()) {
      if (p.vote === playerId) p.vote = null;
    }
    if (this.meeting) this.meeting.voted = this.meeting.voted.filter((id) => id !== playerId);
    this.notice(reason === "kick" ? `${player.name} foi removido pelo host` : `${player.name} saiu`);
    if (this.players.size > 0 && this.connectedCount === 0 && this.emptySince === null) this.emptySince = Date.now();
    if (this.phase === "countdown") this.validateCountdown();
    if (this.inGame()) this.checkWin("abandon");
    this.markDirty();
  }

  /** Partida em andamento (fora do lobby). */
  inGame() {
    return this.phase === "playing" || this.phase === "meeting" || this.phase === "ejecting";
  }

  // ---------- Envio ----------

  markDirty() {
    this.dirty = true;
  }

  sendTo(player: Player, message: ServerMessage) {
    const socket = player.socket;
    if (!socket || socket.readyState !== socket.OPEN) return;
    socket.send(JSON.stringify(message));
  }

  private notice(text: string, exceptId?: string) {
    for (const p of this.players.values()) if (p.id !== exceptId) this.sendTo(p, { type: "notice", text });
  }

  /** Aviso curto para todos (usado pelas regras dos modos). */
  announce(text: string) {
    this.notice(text);
  }

  private broadcastFx(fx: LobbyFx, exceptId?: string) {
    for (const p of this.players.values()) if (p.id !== exceptId) this.sendTo(p, { type: "fx", fx });
  }

  /** Envia o estado personalizado para todos, se algo mudou. */
  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    const now = Date.now();
    for (const p of this.players.values()) {
      if (p.connected) this.sendTo(p, { type: "state", state: this.stateFor(p), now });
    }
  }

  private knowsDeath(viewer: Player, target: Player) {
    return (
      target.alive ||
      target.deathKnown ||
      viewer.id === target.id ||
      !viewer.alive ||
      viewer.role === "infiltrator" ||
      this.phase === "ended"
    );
  }

  stateFor(viewer: Player): RoomState {
    const rules = this.rules;
    const players: PublicPlayer[] = this.playerList.map((p) => {
      const pub: PublicPlayer = {
        id: p.id,
        name: p.name,
        color: p.color,
        isHost: p.id === this.hostId,
        connected: p.connected,
        alive: this.knowsDeath(viewer, p) ? p.alive : true,
        ready: p.ready,
        afk: p.afk,
        safe: p.safe,
      };
      if (
        p.role &&
        (this.phase === "ended" ||
          p.roleRevealed ||
          rules.publicRole(p) ||
          (viewer.role === "infiltrator" && p.role === "infiltrator"))
      ) {
        pub.role = p.role;
      }
      return pub;
    });

    let meeting: MeetingState | null = null;
    if (this.meeting) {
      meeting = { ...this.meeting, voted: [...this.meeting.voted] };
      if (meeting.result && this.settings.anonymousVotes) {
        meeting.result = { ...meeting.result, votes: undefined };
      }
    }

    const crew = this.playerList.filter((p) => p.role === "crew");
    const total = crew.reduce((sum, p) => sum + p.tasks.length, 0);
    const done = crew.reduce((sum, p) => sum + p.tasks.filter((t) => t.done).length, 0);
    const inMatch = this.inGame();

    return {
      code: this.code,
      phase: this.phase,
      hostId: this.hostId,
      settings: this.settings,
      players,
      countdownEndsAt: this.countdownEndsAt,
      frozenUntil: this.frozenUntil,
      revealUntil: this.revealUntil,
      tasks: { done, total },
      bodies: this.bodies,
      meeting,
      sabotage: this.sabotage,
      eject: this.eject,
      end: this.end,
      round: this.round,
      lobby: { score: { ...this.score }, ballFrozenUntil: this.ball.frozenUntil },
      timer: inMatch ? this.timer : null,
      you: {
        id: viewer.id,
        role: viewer.role,
        alive: viewer.alive,
        tasks: viewer.tasks.map((t) => ({ ...t })),
        emergencyLeft: viewer.emergencyLeft,
        killReadyAt: viewer.killReadyAt,
        sabotageReadyAt: viewer.sabotageReadyAt,
        partners:
          viewer.role === "infiltrator" && this.settings.gameMode === "classic"
            ? this.playerList.filter((p) => p.role === "infiltrator" && p.id !== viewer.id).map((p) => p.id)
            : [],
        vote: viewer.vote,
        vent: viewer.vent,
        speed: this.speedOf(viewer),
        vision: inMatch && this.settings.gameMode !== "classic" ? rules.visionOf(this, viewer) : null,
        releaseAt: viewer.releaseAt,
        mission: currentMission(viewer.missions),
        missionsDone: viewer.missions.index,
        xp: viewer.missions.xp,
      },
    };
  }

  speedOf(p: Player) {
    return this.scene === "lobby" ? 1 : this.rules.speedOf(this, p);
  }

  /** Posições: vivos não recebem fantasmas; fantasmas veem todos. Bola e Júlio vão junto. */
  private sendSnapshots(now: number) {
    const list = this.playerList;
    const inLobby = this.scene === "lobby";
    for (const viewer of list) {
      if (!viewer.connected) continue;
      const p: [string, number, number, 0 | 1][] = [];
      for (const q of list) {
        const ghost = this.inGame() && !q.alive;
        if (ghost && viewer.alive) continue;
        // Escondido no duto: some para todo mundo (menos para si mesmo).
        if (q.vent && q.id !== viewer.id) continue;
        p.push([q.id, Math.round(q.x), Math.round(q.y), ghost ? 1 : 0]);
      }
      if (inLobby) p.push(["@ball", Math.round(this.ball.x), Math.round(this.ball.y), 0]);
      if (this.rat.scene === this.scene) p.push([RAT_ID, Math.round(this.rat.pos.x), Math.round(this.rat.pos.y), 0]);
      this.sendTo(viewer, { type: "snap", t: now, p });
    }
  }

  // ---------- Loop ----------

  tick(now: number) {
    const dt = this.lastTick ? Math.min(0.2, (now - this.lastTick) / 1000) : 1 / 20;
    this.lastTick = now;

    // Jogadores desconectados por tempo demais saem da sala.
    for (const p of this.playerList) {
      if (!p.connected && now - p.disconnectedAt > RECONNECT_GRACE_MS) this.removePlayer(p.id, "timeout");
    }
    this.tickHost(now);

    if (this.phase === "countdown" && this.countdownEndsAt !== null && now >= this.countdownEndsAt) this.beginMatch(now);

    if (this.phase === "playing") {
      this.tickSabotage(now);
      this.rules.tick(this, now);
    }
    if (this.phase === "meeting") this.tickMeeting(now);

    if (this.phase === "ejecting" && this.eject && now >= this.eject.endsAt) {
      this.eject = null;
      if (!this.checkWin("votes")) this.resumePlay(now);
    }

    if (this.phase === "ended" && now - this.endedAt > ENDED_AUTO_LOBBY_MS) this.backToLobby();

    if (this.scene === "lobby") this.tickLobby(now, dt);
    this.tickAfk(now);
    this.tickRat(now);
    this.sendSnapshots(now);
    this.flush();
  }

  /** Host caiu e não voltou em alguns segundos: passa para quem está há mais tempo na sala. */
  private tickHost(now: number) {
    const host = this.players.get(this.hostId);
    if (host && (host.connected || now - host.disconnectedAt < HOST_GRACE_MS)) return;
    const next = this.playerList.find((p) => p.connected);
    if (!next || next.id === this.hostId) return;
    this.hostId = next.id;
    this.broadcastFx({ kind: "host", name: next.name });
    if (this.phase === "countdown") this.cancelCountdown("O host saiu");
    this.markDirty();
  }

  private tickSabotage(now: number) {
    const s = this.sabotage;
    if (s.doors && now >= s.doors.until) {
      s.doors = null;
      this.markDirty();
    }
    if (s.critical) {
      const panels = {
        servidor: this.panelUntil.servidor > now,
        roteador: this.panelUntil.roteador > now,
      };
      if (panels.servidor !== s.critical.panels.servidor || panels.roteador !== s.critical.panels.roteador) {
        s.critical = { ...s.critical, panels };
        this.markDirty();
      }
      if (panels.servidor && panels.roteador) {
        s.critical = null;
        this.panelUntil = { servidor: 0, roteador: 0 };
        this.notice("Sistema restaurado");
        this.markDirty();
      } else if (now >= s.critical.endsAt) {
        this.finish("infiltrator", "sabotage");
      }
    }
  }

  // ---------- Lobby jogável ----------

  private tickLobby(now: number, dt: number) {
    const kickers: Kicker[] = [];
    for (const p of this.players.values()) {
      if (!p.connected) continue;
      // Parado há mais de 150 ms: velocidade zero (não "chuta" sem querer).
      if (now - p.lastMoveAt > 150) {
        p.vx = 0;
        p.vy = 0;
      }
      // READY ZONE: ficar ~1 s dentro marca READY (sair não desmarca).
      if (inRect(p, READY_ZONE)) {
        if (!p.readyZoneSince) p.readyZoneSince = now;
        else if (!p.ready && now - p.readyZoneSince >= READY_HOLD_MS) this.setReadyState(p, true, now);
      } else p.readyZoneSince = 0;
      if (!p.safe) kickers.push({ id: p.id, x: p.x, y: p.y, vx: p.vx, vy: p.vy, lastKickAt: p.lastKickAt });
    }

    const events = stepBall(this.ball, kickers, now, dt);
    for (const k of kickers) {
      const p = this.players.get(k.id);
      if (p) p.lastKickAt = k.lastKickAt;
    }
    for (const hit of events.hits) {
      const p = this.players.get(hit.kicker.id);
      if (p) {
        this.mission(p, "ball_hits");
        p.lastActiveAt = now;
      }
      if (now - this.lastHitFxAt > HIT_FX_INTERVAL_MS) {
        this.lastHitFxAt = now;
        this.broadcastFx({ kind: "hit", x: Math.round(this.ball.x), y: Math.round(this.ball.y), power: Math.round(hit.power * 100) / 100, byId: hit.kicker.id });
      }
    }
    if (events.goal) {
      this.score[events.goal] += 1;
      const by = events.scorer ? this.players.get(events.scorer) : undefined;
      if (by) this.mission(by, "goal");
      this.broadcastFx({ kind: "goal", team: events.goal, byName: by?.name ?? null, score: { ...this.score } });
      this.markDirty();
    }
  }

  private tickAfk(now: number) {
    const lobbyLike = this.scene === "lobby" || this.phase === "ended";
    for (const p of this.players.values()) {
      const afk = lobbyLike && p.connected && now - p.lastActiveAt > AFK_LIMIT_MS;
      if (afk !== p.afk) {
        p.afk = afk;
        this.markDirty();
      }
      // Muito tempo parado no lobby: vai para a Safe Zone (onde nada o atrapalha).
      if (this.scene === "lobby" && afk && !p.afkMoved && !p.safe && now - p.lastActiveAt > AFK_SAFE_LIMIT_MS) {
        p.afkMoved = true;
        const a = randomInt(360) * (Math.PI / 180);
        p.x = Math.round(SAFE_ZONE.x + Math.cos(a) * 50);
        p.y = Math.round(SAFE_ZONE.y + Math.sin(a) * 50);
        p.lastMoveAt = now;
        this.updateZones(p);
        this.sendTo(p, { type: "correct", x: p.x, y: p.y });
      }
    }
  }

  /** Safe Zone e áreas visitadas (só no lobby). */
  private updateZones(p: Player) {
    if (this.scene !== "lobby") {
      if (p.safe) {
        p.safe = false;
        this.markDirty();
      }
      return;
    }
    const safe = inSafeZone(p);
    if (safe !== p.safe) {
      p.safe = safe;
      if (safe) this.mission(p, "enter_safe");
      this.markDirty();
    }
    const area = lobbyAreaAt(p);
    if (area) this.mission(p, "visit_areas", area);
  }

  private mission(p: Player, type: Parameters<typeof trackMission>[1], key?: string) {
    if (this.scene !== "lobby") return;
    const result = trackMission(p.missions, type, key);
    if (!result) return;
    if (result.done) this.sendTo(p, { type: "fx", fx: { kind: "mission", label: result.done.label, reward: result.done.reward } });
    this.markDirty();
  }

  private setReadyState(p: Player, ready: boolean, now: number) {
    if (p.ready === ready) return;
    p.ready = ready;
    p.readyAt = now;
    p.lastActiveAt = now;
    this.broadcastFx({ kind: "ready", playerId: p.id, ready });
    this.markDirty();
  }

  setReady(player: Player, ready: boolean) {
    if (this.phase !== "lobby" || typeof ready !== "boolean") return;
    const now = Date.now();
    if (now - player.readyAt < 300) return;
    this.setReadyState(player, ready, now);
  }

  emote(player: Player, emote: EmoteId) {
    if (!(this.scene === "lobby" || this.phase === "ended")) return;
    if (!EMOTES.some((e) => e.id === emote)) return;
    const now = Date.now();
    if (now - player.emoteAt < EMOTE_COOLDOWN_MS) return;
    player.emoteAt = now;
    player.lastActiveAt = now;
    for (const p of this.players.values()) this.sendTo(p, { type: "emote", playerId: player.id, emote });
    this.mission(player, "emote");
  }

  interact(player: Player, objectId: LobbyObjectId) {
    if (this.scene !== "lobby") return;
    const obj = LOBBY_OBJECTS.find((o) => o.id === objectId);
    if (!obj || distance(player, obj.pos) > LOBBY_INTERACT_RANGE + 30) return;
    const now = Date.now();
    if (now - player.interactAt < 500) return;
    player.interactAt = now;
    player.lastActiveAt = now;
    if (obj.id === "coffee" || obj.id === "tv") this.broadcastFx({ kind: obj.id, byName: player.name });
    if (obj.id === "ready" && this.phase === "lobby") this.setReadyState(player, !player.ready, now);
    this.mission(player, "interact", obj.id);
  }

  resetBallByHost(player: Player) {
    if (player.id !== this.hostId || this.scene !== "lobby") return;
    resetBall(this.ball, Date.now(), 800);
    this.markDirty();
  }

  transferHost(player: Player, targetId: string) {
    if (player.id !== this.hostId || targetId === player.id) return;
    const target = this.players.get(targetId);
    if (!target || !target.connected) return;
    this.hostId = target.id;
    this.broadcastFx({ kind: "host", name: target.name });
    this.markDirty();
  }

  // ---------- Configuração ----------

  setColor(player: Player, color: string) {
    if (this.phase !== "lobby" && this.phase !== "ended") return;
    if (!COLORS.some((c) => c.id === color)) return;
    if (this.playerList.some((p) => p.id !== player.id && p.color === color)) return;
    player.color = color;
    player.lastActiveAt = Date.now();
    this.markDirty();
  }

  updateSettings(player: Player, patch: Partial<Record<keyof Settings, unknown>>) {
    if (player.id !== this.hostId || this.phase !== "lobby") return;
    const before = this.settings.gameMode;
    const next = sanitizeSettings(this.settings, patch);
    next.maxPlayers = Math.max(next.maxPlayers, this.players.size);
    // Qualquer ajuste manual (exceto trocar o modo/regras de READY) vira CUSTOM.
    const manual = Object.keys(patch).some((k) => k !== "gameMode" && k !== "requireAllReady" && k !== "maxPlayers");
    if (manual) next.preset = "custom";
    this.settings = next;
    if (next.gameMode !== before) this.broadcastFx({ kind: "mode", mode: next.gameMode });
    this.markDirty();
  }

  applyPreset(player: Player, presetId: string) {
    if (player.id !== this.hostId || this.phase !== "lobby") return;
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    this.settings = { ...sanitizeSettings(this.settings, preset.values as Partial<Record<keyof Settings, unknown>>), preset: preset.id };
    this.markDirty();
  }

  kick(player: Player, targetId: string) {
    if (player.id !== this.hostId || targetId === player.id) return;
    if (this.phase !== "lobby" && this.phase !== "ended") return;
    this.removePlayer(targetId, "kick");
  }

  // ---------- Início, contagem e volta ao lobby ----------

  start(player: Player, force = false): string | null {
    if (player.id !== this.hostId) return "Só o host pode iniciar.";
    if (this.phase !== "lobby") return this.phase === "countdown" ? null : "A partida já começou.";
    const players = this.playerList.filter((p) => p.connected);
    if (players.length < MIN_PLAYERS) return `São necessários pelo menos ${MIN_PLAYERS} jogadores.`;
    if (!force && this.settings.requireAllReady && players.some((p) => !p.ready)) return "Aguardando todos ficarem READY.";
    const now = Date.now();
    this.phase = "countdown";
    this.countdownEndsAt = now + COUNTDOWN_MS;
    this.markDirty();
    return null;
  }

  cancelStart(player: Player) {
    if (player.id !== this.hostId || this.phase !== "countdown") return;
    this.cancelCountdown("Cancelada pelo host");
  }

  private cancelCountdown(reason: string) {
    if (this.phase !== "countdown") return;
    this.phase = "lobby";
    this.countdownEndsAt = null;
    this.broadcastFx({ kind: "cancel", reason });
    this.markDirty();
  }

  /** Durante a contagem: sem jogadores suficientes, cancela. */
  private validateCountdown() {
    if (this.phase !== "countdown") return;
    if (this.playerList.filter((p) => p.connected).length < MIN_PLAYERS) this.cancelCountdown("Jogadores insuficientes");
  }

  /** Fim da contagem: papéis, tarefas e posições no mapa da partida. Acontece uma única vez por rodada. */
  private beginMatch(now: number) {
    if (this.phase !== "countdown") return;
    for (const p of this.playerList) if (!p.connected) this.removePlayer(p.id, "timeout");
    const players = this.playerList.filter((p) => p.connected);
    if (players.length < MIN_PLAYERS) {
      this.cancelCountdown("Jogadores insuficientes");
      return;
    }
    const firstTurn = now + ROLE_REVEAL_MS;
    for (const p of players) {
      p.alive = true;
      p.deathKnown = false;
      p.roleRevealed = false;
      p.taskStarts.clear();
      p.vote = null;
      p.vent = null;
      p.safe = false;
      p.readyZoneSince = 0;
    }
    this.rules.assignRoles(this, players, firstTurn);
    this.rules.setupTimer(this, firstTurn);

    this.round += 1;
    this.phase = "playing";
    this.countdownEndsAt = null;
    this.frozenUntil = firstTurn;
    this.revealUntil = firstTurn;
    this.bodies = [];
    this.meeting = null;
    this.sabotage = emptySabotage();
    this.panelUntil = { servidor: 0, roteador: 0 };
    this.eject = null;
    this.end = null;
    this.placeAtGameSpawn();
    this.moveRat("game");
    this.markDirty();
  }

  private placeAtGameSpawn() {
    const list = this.playerList;
    const now = Date.now();
    list.forEach((p, i) => {
      const s = spawnPoint(i, list.length);
      p.x = s.x;
      p.y = s.y;
      p.lastMoveAt = now;
      this.sendTo(p, { type: "correct", x: s.x, y: s.y });
    });
  }

  private placeAtLobbySpawn() {
    const now = Date.now();
    this.playerList.forEach((p, i) => {
      const s = lobbySpawnPoint(i);
      p.x = s.x;
      p.y = s.y;
      p.lastMoveAt = now;
      this.sendTo(p, { type: "correct", x: s.x, y: s.y });
    });
  }

  /**
   * Volta todos ao lobby (mesmo código, senha, host, configurações e jogadores).
   * Limpa tudo que é da partida. Qualquer jogador pode pedir na tela de resultado.
   */
  backToLobby(requester?: Player, thenStart = false) {
    if (this.phase !== "ended") return;
    const now = Date.now();
    this.phase = "lobby";
    this.end = null;
    this.eject = null;
    this.meeting = null;
    this.bodies = [];
    this.timer = null;
    this.sabotage = emptySabotage();
    this.panelUntil = { servidor: 0, roteador: 0 };
    for (const p of this.players.values()) {
      p.role = null;
      p.alive = true;
      p.deathKnown = false;
      p.roleRevealed = false;
      p.tasks = [];
      p.taskStarts.clear();
      p.vote = null;
      p.vent = null;
      p.releaseAt = 0;
      p.ready = false;
      p.readyZoneSince = 0;
      p.afkMoved = false;
      p.lastActiveAt = now;
    }
    resetBall(this.ball, now, 800);
    this.placeAtLobbySpawn();
    for (const p of this.players.values()) this.updateZones(p);
    this.moveRat("lobby");
    this.markDirty();
    if (thenStart && requester && requester.id === this.hostId) this.start(requester, true);
  }

  // ---------- Júlio, o rato ----------

  private navFor(scene: "lobby" | "game"): Navigator {
    return scene === "lobby" ? lobbyNavigator() : gameNavigator();
  }

  private moveRat(scene: "lobby" | "game") {
    const g = this.rat;
    g.scene = scene;
    const spots = scene === "lobby" ? LOBBY_RAT_SPOTS : GAME_RAT_SPOTS;
    g.pos = this.navFor(scene).nearestFree(spots[randomInt(spots.length)]);
    g.route = [];
    g.restUntil = Date.now() + 2000;
  }

  private ratSolids() {
    return this.rat.scene === "lobby" ? LOBBY_SOLIDS : solidsWith(this.closedDoors());
  }

  private tickRat(now: number) {
    const g = this.rat;
    const dt = g.lastTick ? Math.min(0.2, (now - g.lastTick) / 1000) : 0;
    g.lastTick = now;
    if (g.nextSqueakAt === 0) g.nextSqueakAt = now + 15_000 + randomInt(20_000);
    // Na reunião todo mundo (inclusive o Júlio) fica parado.
    if (this.phase === "meeting" || this.phase === "ejecting") return;

    if (now >= g.nextSqueakAt) {
      g.nextSqueakAt = now + 25_000 + randomInt(25_000);
      this.broadcastSqueak(null);
    }
    if (now < g.restUntil) return;

    const solids = this.ratSolids();
    if (g.route.length === 0) {
      const spots = g.scene === "lobby" ? LOBBY_RAT_SPOTS : GAME_RAT_SPOTS;
      this.planRatRoute(spots[randomInt(spots.length)]);
      return;
    }

    const next = g.route[0];
    const dx = next.x - g.pos.x;
    const dy = next.y - g.pos.y;
    const d = Math.hypot(dx, dy);
    const step = RAT_SPEED * (now < g.fleeUntil ? RAT_FLEE_SPEED : 1) * dt;
    if (d <= step + 0.5) {
      g.pos = moveWithCollision(g.pos, dx, dy, solids);
      g.route.shift();
      // Chegou: fareja um pouco antes de escolher outro lugar.
      if (g.route.length === 0) g.restUntil = now + 2500 + randomInt(5000);
      return;
    }
    const moved = moveWithCollision(g.pos, (dx / d) * step, (dy / d) * step, solids);
    if (distance(moved, g.pos) < step * 0.3) {
      // Porta trancada no caminho: desiste e escolhe outro passeio.
      if (!g.stuckSince) g.stuckSince = now;
      else if (now - g.stuckSince > 1500) {
        g.route = [];
        g.restUntil = now + 1000;
      }
    } else g.stuckSince = 0;
    g.pos = moved;
  }

  /** Rota até `target` sem "andar de robô": pula pontos que já dá para alcançar em linha reta. */
  private planRatRoute(target: Point) {
    const g = this.rat;
    const solids = this.ratSolids();
    const raw = simplify(this.navFor(g.scene).path(g.pos, target));
    const route: Point[] = [];
    let from = g.pos;
    for (let i = 0; i < raw.length; i++) {
      let j = i;
      while (j + 1 < raw.length && pathClear(from, raw[j + 1], solids)) j++;
      route.push(raw[j]);
      from = raw[j];
      i = j;
    }
    g.route = route;
    g.stuckSince = 0;
  }

  private broadcastSqueak(by: Player | null) {
    for (const p of this.players.values()) this.sendTo(p, { type: "squeak", byId: by?.id ?? null, byName: by?.name ?? null });
  }

  /**
   * Bater no Júlio: quem bate ganha XP, ele guincha e dispara para longe.
   * Qualquer jogador pode (no lobby, no resultado ou vivo na partida), com intervalo por jogador.
   */
  hitRat(player: Player) {
    const now = Date.now();
    const lobbyLike = this.scene === "lobby" || this.phase === "ended";
    if (!lobbyLike && !(this.phase === "playing" && player.alive && !player.vent && now >= this.frozenUntil)) return;
    if (this.rat.scene !== this.scene) return;
    if (distance(player, this.rat.pos) > RAT_HIT_RANGE + 25) return;
    if (now - (this.ratHitAt.get(player.id) ?? 0) < RAT_HIT_COOLDOWN_MS) return;
    this.ratHitAt.set(player.id, now);
    player.lastActiveAt = now;
    player.missions.xp += RAT_XP;
    this.sendTo(player, { type: "fx", fx: { kind: "xp", amount: RAT_XP, reason: "bateu no Júlio" } });
    // Foge para o canto mais longe de quem bateu (entre os 3 mais distantes, para variar).
    const g = this.rat;
    const spots = (g.scene === "lobby" ? LOBBY_RAT_SPOTS : GAME_RAT_SPOTS)
      .map((p) => ({ p, d: distance(p, player) }))
      .sort((a, b) => b.d - a.d)
      .slice(0, 3);
    g.restUntil = 0;
    g.fleeUntil = now + RAT_FLEE_MS;
    this.planRatRoute(spots[randomInt(spots.length)].p);
    this.broadcastSqueak(player);
    this.markDirty();
  }

  // ---------- Movimento ----------

  closedDoors() {
    return this.sabotage.doors?.doors ?? [];
  }

  canAct(now: number) {
    return this.phase === "playing" && now >= this.frozenUntil;
  }

  move(player: Player, x: number, y: number) {
    const now = Date.now();
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const lobbyLike = this.scene === "lobby" || this.phase === "ended";
    if (!(lobbyLike || this.canAct(now))) return;
    if (player.vent) return;
    if (!lobbyLike && now < player.releaseAt) {
      this.sendTo(player, { type: "correct", x: player.x, y: player.y });
      return;
    }

    // Tolerante a rajadas de pacotes (rede móvel), mas sem permitir teletransporte.
    const elapsed = Math.min(500, Math.max(33, now - player.lastMoveAt));
    const maxDist = BASE_SPEED * this.speedOf(player) * (elapsed / 1000) * 1.5 + 30;
    let dx = x - player.x;
    let dy = y - player.y;
    const dist = Math.hypot(dx, dy);
    let clamped = false;
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
      clamped = true;
    }

    const prevX = player.x;
    const prevY = player.y;
    const ghost = !player.alive && this.inGame();
    if (ghost) {
      const next = moveGhost(player, dx, dy);
      player.x = next.x;
      player.y = next.y;
    } else {
      const solids = this.scene === "lobby" ? LOBBY_SOLIDS : solidsWith(this.closedDoors());
      const target = { x: player.x + dx, y: player.y + dy };
      const slid = moveWithCollision(player, dx, dy, solids);
      if (!clamped && !collides(target.x, target.y, solids) && distance(slid, target) < 24) {
        player.x = target.x;
        player.y = target.y;
      } else {
        player.x = slid.x;
        player.y = slid.y;
        clamped = true;
      }
    }
    // Velocidade real (para a bola) e atividade (AFK).
    const sec = Math.max(0.033, elapsed / 1000);
    player.vx = (player.x - prevX) / sec;
    player.vy = (player.y - prevY) / sec;
    if (Math.abs(player.x - prevX) + Math.abs(player.y - prevY) > 0.5) {
      player.lastActiveAt = now;
      player.afkMoved = false;
    }
    player.lastMoveAt = now;
    this.updateZones(player);
    if (clamped) this.sendTo(player, { type: "correct", x: player.x, y: player.y });
  }

  // ---------- Ações da partida ----------

  private visionOf(p: Player) {
    return this.rules.visionOf(this, p);
  }

  kill(killer: Player, targetId: string) {
    const now = Date.now();
    const target = this.players.get(targetId);
    if (!this.canAct(now) || !target) return;
    if (killer.role !== "infiltrator" || !killer.alive || killer.vent) return;
    if (!target.alive || target.role !== "crew") return;
    if (now < killer.killReadyAt || now < killer.releaseAt) return;
    if (distance(killer, target) > KILL_RANGE) return;

    killer.killReadyAt = now + this.settings.killCooldown * 1000;
    const outcome = this.rules.onKill(this, killer, target, now);
    if (outcome !== "converted") {
      target.alive = false;
      target.vote = null;
    }
    if (outcome === "body") {
      this.bodies.push({ id: target.id, x: Math.round(target.x), y: Math.round(target.y), color: target.color });
      // O infiltrado vai até o corpo, como num bote.
      killer.x = target.x;
      killer.y = target.y;
      killer.lastMoveAt = now;
      this.sendTo(killer, { type: "correct", x: killer.x, y: killer.y });
    }

    // Clássico: só fica sabendo da morte quem viu, a vítima, fantasmas e infiltrados.
    // Nos outros modos todo mundo vê.
    const segments = visionSegments(this.closedDoors());
    for (const p of this.players.values()) {
      const witnessed =
        outcome !== "body" ||
        p.id === target.id ||
        !p.alive ||
        p.role === "infiltrator" ||
        canSee(p, target, this.visionOf(p), segments);
      if (witnessed) this.sendTo(p, { type: "killed", victimId: target.id, x: target.x, y: target.y });
    }
    this.markDirty();
    this.checkWin("kills");
  }

  report(player: Player, bodyId: string) {
    const now = Date.now();
    if (!modeOf(this.settings).meetings) return;
    if (!this.canAct(now) || !player.alive) return;
    const body = this.bodies.find((b) => b.id === bodyId);
    if (!body || distance(player, body) > REPORT_RANGE) return;
    this.startMeeting(player, "report", body.id);
  }

  emergency(player: Player) {
    const now = Date.now();
    if (!modeOf(this.settings).meetings) return;
    if (!this.canAct(now) || !player.alive || player.emergencyLeft <= 0) return;
    if (this.sabotage.critical) return;
    if (distance(player, EMERGENCY_POS) > EMERGENCY_RANGE) return;
    player.emergencyLeft -= 1;
    this.startMeeting(player, "emergency", null);
  }

  private startMeeting(caller: Player, reason: "report" | "emergency", victimId: string | null) {
    const now = Date.now();
    this.phase = "meeting";
    for (const p of this.players.values()) {
      if (!p.alive) p.deathKnown = true;
      p.vote = null;
      p.vent = null;
      p.taskStarts.clear();
    }
    this.bodies = [];
    this.sabotage = emptySabotage();
    this.panelUntil = { servidor: 0, roteador: 0 };
    this.meeting = {
      stage: "intro",
      endsAt: now + MEETING_INTRO_MS,
      callerId: caller.id,
      reason,
      victimId,
      voted: [],
      result: null,
    };
    this.markDirty();
  }

  private tickMeeting(now: number) {
    const m = this.meeting;
    if (!m) return;
    const voters = this.playerList.filter((p) => p.alive);
    const allVoted = m.stage === "voting" && voters.every((p) => p.vote !== null);
    if (now < m.endsAt && !allVoted) return;

    if (m.stage === "intro") {
      if (this.settings.discussionTime > 0) {
        m.stage = "discussion";
        m.endsAt = now + this.settings.discussionTime * 1000;
      } else {
        m.stage = "voting";
        m.endsAt = now + this.settings.votingTime * 1000;
      }
    } else if (m.stage === "discussion") {
      m.stage = "voting";
      m.endsAt = now + this.settings.votingTime * 1000;
    } else if (m.stage === "voting") {
      m.stage = "result";
      m.endsAt = now + VOTE_RESULT_MS;
      m.result = this.tally(voters);
    } else if (m.stage === "result") {
      this.startEject(now, m.result?.ejectedId ?? null, m.result?.tie ?? false);
    }
    this.markDirty();
  }

  private tally(voters: Player[]) {
    const tally: Record<string, number> = { skip: 0 };
    const votes: Record<string, VoteTarget> = {};
    for (const p of voters) {
      const vote = p.vote ?? "skip";
      votes[p.id] = vote;
      tally[vote] = (tally[vote] ?? 0) + 1;
    }
    let best: string | null = null;
    let bestCount = 0;
    let tie = false;
    for (const [target, count] of Object.entries(tally)) {
      if (target === "skip") continue;
      if (count > bestCount) {
        best = target;
        bestCount = count;
        tie = false;
      } else if (count === bestCount) {
        tie = true;
      }
    }
    const ejectedId = best && !tie && bestCount > tally.skip ? best : null;
    return { ejectedId, tie: tie && bestCount > 0, tally, votes };
  }

  vote(player: Player, target: VoteTarget) {
    const m = this.meeting;
    if (this.phase !== "meeting" || !m || m.stage !== "voting") return;
    if (!player.alive || player.vote !== null) return;
    if (target !== "skip") {
      const t = this.players.get(target);
      if (!t || !t.alive) return;
    }
    player.vote = target;
    m.voted = [...m.voted, player.id];
    this.markDirty();
  }

  private startEject(now: number, ejectedId: string | null, tie: boolean) {
    this.meeting = null;
    this.phase = "ejecting";
    const ejected = ejectedId ? this.players.get(ejectedId) : undefined;
    if (ejected) {
      ejected.alive = false;
      ejected.deathKnown = true;
      if (this.settings.revealRoleOnEject) ejected.roleRevealed = true;
    }
    this.eject = {
      playerId: ejected?.id ?? null,
      name: ejected?.name ?? null,
      color: ejected?.color ?? null,
      role: ejected && this.settings.revealRoleOnEject ? (ejected.role ?? undefined) : undefined,
      tie,
      endsAt: now + EJECT_MS,
      remaining: this.settings.revealRoleOnEject
        ? this.playerList.filter((p) => p.role === "infiltrator" && p.alive).length
        : undefined,
    };
    this.markDirty();
  }

  private resumePlay(now: number) {
    this.phase = "playing";
    this.frozenUntil = now + 1500;
    for (const p of this.players.values()) {
      p.vote = null;
      if (p.role === "infiltrator") {
        p.killReadyAt = now + this.settings.killCooldown * 1000;
        p.sabotageReadyAt = now + 10_000;
      }
    }
    this.placeAtGameSpawn();
    this.markDirty();
  }

  taskStart(player: Player, taskId: TaskId) {
    const now = Date.now();
    if (!this.canAct(now)) return;
    const task = player.tasks.find((t) => t.id === taskId);
    const station = taskById(taskId);
    if (!task || task.done || !station) return;
    if (distance(player, station.pos) > USE_RANGE + 30) return;
    player.taskStarts.set(taskId, now);
  }

  taskComplete(player: Player, taskId: TaskId) {
    const now = Date.now();
    if (!this.canAct(now)) return;
    const task = player.tasks.find((t) => t.id === taskId);
    const station = taskById(taskId);
    const startedAt = player.taskStarts.get(taskId);
    if (!task || task.done || !station || startedAt === undefined) return;
    if (now - startedAt < TASK_MIN_MS) return;
    if (distance(player, station.pos) > USE_RANGE + 60) return;
    task.done = true;
    player.taskStarts.delete(taskId);
    this.sendTo(player, { type: "taskDone", taskId });
    this.markDirty();
    this.rules.onTaskComplete(this, player, now);
  }

  sabotageAction(player: Player, kind: SabotageKind) {
    const now = Date.now();
    if (!modeOf(this.settings).sabotage) return;
    if (!this.canAct(now) || player.role !== "infiltrator" || !player.alive) return;
    if (now < player.sabotageReadyAt) return;
    const s = this.sabotage;
    if (s.critical || s.lights) return;

    if (kind === "lights") {
      s.lights = true;
    } else if (kind === "critical") {
      s.critical = { endsAt: now + CRITICAL_DURATION_MS, panels: { servidor: false, roteador: false } };
      this.panelUntil = { servidor: 0, roteador: 0 };
    } else if (kind === "doors") {
      if (s.doors) return;
      const room = roomAt(player);
      if (!room) return;
      const doors = doorsOfRoom(room.id);
      // Não tranca ninguém dentro de uma porta.
      const solids = solidsWith(doors);
      const blocked = this.playerList.some((p) => p.alive && collides(p.x, p.y, solids));
      if (blocked) return;
      s.doors = { room: room.id, doors, until: now + DOORS_DURATION_MS };
    } else {
      return;
    }
    for (const p of this.players.values()) {
      if (p.role === "infiltrator") p.sabotageReadyAt = now + SABOTAGE_COOLDOWN_MS;
    }
    this.markDirty();
  }

  fixLights(player: Player) {
    if (!this.canAct(Date.now()) || !player.alive || !this.sabotage.lights) return;
    if (distance(player, LIGHTS_PANEL) > USE_RANGE + 30) return;
    this.sabotage.lights = false;
    this.notice("Luzes restauradas");
    this.markDirty();
  }

  holdPanel(player: Player, panelId: PanelId) {
    const now = Date.now();
    if (!this.canAct(now) || !player.alive || !this.sabotage.critical) return;
    const panel = CRITICAL_PANELS.find((p) => p.id === panelId);
    if (!panel || distance(player, panel.pos) > USE_RANGE + 30) return;
    this.panelUntil[panelId] = now + PANEL_HOLD_MS;
    this.tickSabotage(now);
  }

  // ---------- Dutos (infiltrado) ----------

  vent(player: Player, action: "enter" | "exit") {
    const now = Date.now();
    if (!modeOf(this.settings).vents) return;
    if (!this.canAct(now) || player.role !== "infiltrator" || !player.alive) return;
    if (action === "enter") {
      if (player.vent) return;
      const vent = VENTS_NEAR(player);
      if (!vent) return;
      player.vent = vent.id;
      player.x = vent.pos.x;
      player.y = vent.pos.y;
    } else {
      if (!player.vent) return;
      player.vent = null;
    }
    player.lastMoveAt = now;
    this.sendTo(player, { type: "correct", x: player.x, y: player.y });
    this.markDirty();
  }

  ventMove(player: Player, ventId: VentId) {
    if (!this.canAct(Date.now()) || !player.vent) return;
    const current = ventById(player.vent);
    const next = ventById(ventId);
    if (!current || !next || !current.links.includes(next.id)) return;
    player.vent = next.id;
    player.x = next.pos.x;
    player.y = next.pos.y;
    player.lastMoveAt = Date.now();
    this.sendTo(player, { type: "correct", x: player.x, y: player.y });
    this.markDirty();
  }

  // ---------- Chat ----------

  chat(player: Player, channel: ChatChannel, raw: unknown) {
    const now = Date.now();
    const text = sanitizeChat(raw);
    if (!text) return;

    const allowed =
      (channel === "lobby" && (this.scene === "lobby" || this.phase === "ended")) ||
      (channel === "meeting" && this.phase === "meeting" && player.alive) ||
      (channel === "ghost" && this.inGame() && !player.alive);
    if (!allowed) return;

    player.chatTimes = player.chatTimes.filter((t) => now - t < CHAT_WINDOW);
    const last = player.chatTimes[player.chatTimes.length - 1] ?? 0;
    if (now - last < CHAT_MIN_INTERVAL || player.chatTimes.length >= CHAT_BURST) return;
    player.chatTimes.push(now);
    player.lastActiveAt = now;

    const message: ChatMessage = {
      id: ++this.chatSeq,
      channel,
      fromId: player.id,
      name: player.name,
      color: player.color,
      text,
      at: now,
    };
    for (const p of this.players.values()) {
      if (channel === "ghost" && p.alive) continue;
      this.sendTo(p, { type: "chat", message });
    }
  }

  // ---------- Fim de jogo ----------

  /** Verifica condições de vitória. Retorna true se a partida acabou. */
  checkWin(context: EndReason): boolean {
    if (!this.inGame()) return false;
    // Durante a reunião/expulsão só a desistência encerra; o resto é avaliado ao voltar.
    if (this.phase === "meeting" && context !== "abandon") return false;
    const result = this.rules.checkWin(this, context);
    if (!result) return false;
    return this.finish(result.winner, result.reason);
  }

  finish(winner: Role, reason: EndReason) {
    if (this.phase === "ended") return true;
    const list = this.playerList;
    const crew = list.filter((p) => p.role === "crew");
    this.phase = "ended";
    this.endedAt = Date.now();
    this.meeting = null;
    this.eject = null;
    this.bodies = [];
    this.sabotage = emptySabotage();
    this.end = {
      mode: this.settings.gameMode,
      winner,
      reason,
      infiltrators: list
        .filter((p) => p.role === "infiltrator")
        .map((p) => ({ id: p.id, name: p.name, color: p.color })),
      eliminated: list.filter((p) => !p.alive).length,
      tasksDone: crew.reduce((s, p) => s + p.tasks.filter((t) => t.done).length, 0),
      tasksTotal: crew.reduce((s, p) => s + p.tasks.length, 0),
    };
    for (const p of list) {
      p.alive = true;
      p.deathKnown = false;
    }
    this.markDirty();
    return true;
  }
}

export type { Point };
