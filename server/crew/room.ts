// Uma sala do QUAD CREW. Toda regra do jogo é decidida aqui (servidor autoritativo).

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
  KILL_COOLDOWN_START_MS,
  KILL_RANGE,
  VENT_RANGE,
  MEETING_INTRO_MS,
  MIN_PLAYERS,
  PANEL_HOLD_MS,
  RECONNECT_GRACE_MS,
  REPORT_RANGE,
  ROLE_REVEAL_MS,
  SABOTAGE_COOLDOWN_MS,
  TASK_MIN_MS,
  USE_RANGE,
  VISION_BLACKOUT,
  VISION_CREW,
  VISION_INFILTRATOR,
  VOTE_RESULT_MS,
  maxInfiltratorsFor,
  sanitizeChat,
  sanitizeSettings,
  type Settings,
} from "../../src/lib/crew/constants";
import {
  CRITICAL_PANELS,
  EMERGENCY_POS,
  LIGHTS_PANEL,
  TASKS,
  distance,
  doorsOfRoom,
  roomAt,
  spawnPoint,
  VENTS,
  taskById,
  ventById,
  type PanelId,
  type VentId,
  type Point,
  type TaskId,
} from "../../src/lib/crew/map";
import { canSee, collides, moveGhost, moveWithCollision, solidsWith, visionSegments } from "../../src/lib/crew/physics";
import type {
  Body,
  ChatChannel,
  ChatMessage,
  EjectState,
  EndReason,
  EndState,
  MeetingState,
  Phase,
  PublicPlayer,
  Role,
  RoomState,
  SabotageKind,
  SabotageState,
  ServerMessage,
  VoteTarget,
} from "../../src/lib/crew/protocol";

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
  vote: VoteTarget | null;
  chatTimes: number[];
  vent: VentId | null;
};

const ENDED_AUTO_LOBBY_MS = 90_000;
const CHAT_MIN_INTERVAL = 600;
const CHAT_BURST = 6;
const CHAT_WINDOW = 10_000;

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

export class Room {
  readonly code: string;
  /** "salt:hash" (scrypt). A senha nunca é guardada em texto puro. */
  readonly passwordHash: string;
  readonly createdAt = Date.now();

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

  private dirty = true;
  private chatSeq = 0;

  constructor(code: string, passwordHash: string) {
    this.code = code;
    this.passwordHash = passwordHash;
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

  addPlayer(name: string, socket: WebSocket): Player {
    const now = Date.now();
    const used = new Set(this.playerList.map((p) => p.color));
    const color = COLORS.find((c) => !used.has(c.id))?.id ?? COLORS[0].id;
    const spawn = spawnPoint(this.players.size, Math.max(this.settings.maxPlayers, this.players.size + 1));
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
      role: null,
      alive: true,
      deathKnown: false,
      roleRevealed: false,
      tasks: [],
      taskStarts: new Map(),
      emergencyLeft: 0,
      killReadyAt: 0,
      sabotageReadyAt: 0,
      vote: null,
      chatTimes: [],
      vent: null,
    };
    this.players.set(player.id, player);
    if (!this.hostId || !this.players.has(this.hostId)) this.hostId = player.id;
    this.emptySince = null;
    this.notice(`${name} entrou`, player.id);
    this.markDirty();
    return player;
  }

  /** Reconecta um jogador existente (mesmo id + token). */
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
    }
    this.bodies = this.bodies.filter((b) => b.id !== playerId);
    for (const p of this.players.values()) {
      if (p.vote === playerId) p.vote = null;
    }
    if (this.meeting) this.meeting.voted = this.meeting.voted.filter((id) => id !== playerId);
    this.notice(reason === "kick" ? `${player.name} foi removido pelo host` : `${player.name} saiu`);
    if (this.players.size > 0 && this.connectedCount === 0 && this.emptySince === null) this.emptySince = Date.now();
    if (this.inGame()) this.checkWin("abandon");
    this.markDirty();
  }

  inGame() {
    return this.phase === "countdown" || this.phase === "playing" || this.phase === "meeting" || this.phase === "ejecting";
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
    const players: PublicPlayer[] = this.playerList.map((p) => {
      const pub: PublicPlayer = {
        id: p.id,
        name: p.name,
        color: p.color,
        isHost: p.id === this.hostId,
        connected: p.connected,
        alive: this.knowsDeath(viewer, p) ? p.alive : true,
      };
      if (
        p.role &&
        (this.phase === "ended" ||
          p.roleRevealed ||
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
      you: {
        id: viewer.id,
        role: viewer.role,
        alive: viewer.alive,
        tasks: viewer.tasks.map((t) => ({ ...t })),
        emergencyLeft: viewer.emergencyLeft,
        killReadyAt: viewer.killReadyAt,
        sabotageReadyAt: viewer.sabotageReadyAt,
        partners:
          viewer.role === "infiltrator"
            ? this.playerList.filter((p) => p.role === "infiltrator" && p.id !== viewer.id).map((p) => p.id)
            : [],
        vote: viewer.vote,
        vent: viewer.vent,
      },
    };
  }

  /** Posições: vivos não recebem fantasmas; fantasmas veem todos. */
  private sendSnapshots(now: number) {
    const list = this.playerList;
    for (const viewer of list) {
      if (!viewer.connected) continue;
      const p: [string, number, number, 0 | 1][] = [];
      for (const q of list) {
        const ghost = this.phase !== "lobby" && this.phase !== "ended" && !q.alive;
        if (ghost && viewer.alive && this.inGame()) continue;
        // Escondido no duto: some para todo mundo (menos para si mesmo).
        if (q.vent && q.id !== viewer.id) continue;
        p.push([q.id, Math.round(q.x), Math.round(q.y), ghost ? 1 : 0]);
      }
      this.sendTo(viewer, { type: "snap", t: now, p });
    }
  }

  // ---------- Loop ----------

  tick(now: number) {
    // Jogadores desconectados por tempo demais saem da sala.
    for (const p of this.playerList) {
      if (!p.connected && now - p.disconnectedAt > RECONNECT_GRACE_MS) this.removePlayer(p.id, "timeout");
    }

    if (this.phase === "countdown" && this.countdownEndsAt !== null && now >= this.countdownEndsAt) {
      this.phase = "playing";
      this.countdownEndsAt = null;
      this.frozenUntil = now + ROLE_REVEAL_MS;
      this.revealUntil = now + ROLE_REVEAL_MS;
      this.markDirty();
    }

    if (this.phase === "playing") this.tickSabotage(now);
    if (this.phase === "meeting") this.tickMeeting(now);

    if (this.phase === "ejecting" && this.eject && now >= this.eject.endsAt) {
      this.eject = null;
      if (!this.checkWin("votes")) this.resumePlay(now);
    }

    if (this.phase === "ended" && now - this.endedAt > ENDED_AUTO_LOBBY_MS) this.backToLobby();

    this.sendSnapshots(now);
    this.flush();
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

  // ---------- Lobby ----------

  setColor(player: Player, color: string) {
    if (this.phase !== "lobby") return;
    if (!COLORS.some((c) => c.id === color)) return;
    if (this.playerList.some((p) => p.id !== player.id && p.color === color)) return;
    player.color = color;
    this.markDirty();
  }

  updateSettings(player: Player, patch: Partial<Record<keyof Settings, unknown>>) {
    if (player.id !== this.hostId || this.phase !== "lobby") return;
    const next = sanitizeSettings(this.settings, patch);
    next.maxPlayers = Math.max(next.maxPlayers, this.players.size);
    this.settings = next;
    this.markDirty();
  }

  kick(player: Player, targetId: string) {
    if (player.id !== this.hostId || targetId === player.id) return;
    if (this.phase !== "lobby" && this.phase !== "ended") return;
    this.removePlayer(targetId, "kick");
  }

  start(player: Player): string | null {
    if (player.id !== this.hostId) return "Só o host pode iniciar.";
    if (this.phase !== "lobby") return "A partida já começou.";
    const players = this.playerList.filter((p) => p.connected);
    if (players.length < MIN_PLAYERS) return `São necessários pelo menos ${MIN_PLAYERS} jogadores.`;
    // Quem está desconectado no lobby fica de fora da rodada.
    for (const p of this.playerList) if (!p.connected) this.removePlayer(p.id, "timeout");

    const now = Date.now();
    const count = Math.min(this.settings.infiltrators, maxInfiltratorsFor(players.length));
    const order = shuffle(players);
    const firstTurn = now + COUNTDOWN_MS + ROLE_REVEAL_MS;

    order.forEach((p, i) => {
      p.role = i < count ? "infiltrator" : "crew";
      p.alive = true;
      p.deathKnown = false;
      p.roleRevealed = false;
      p.tasks = shuffle(TASKS)
        .slice(0, this.settings.tasksPerPlayer)
        .map((t) => ({ id: t.id, done: false }));
      p.taskStarts.clear();
      p.emergencyLeft = this.settings.emergencyPerPlayer;
      p.killReadyAt = firstTurn + KILL_COOLDOWN_START_MS;
      p.sabotageReadyAt = firstTurn + KILL_COOLDOWN_START_MS;
      p.vote = null;
      p.vent = null;
    });
    this.placeAtSpawn();

    this.round += 1;
    this.phase = "countdown";
    this.countdownEndsAt = now + COUNTDOWN_MS;
    this.frozenUntil = now + COUNTDOWN_MS + ROLE_REVEAL_MS;
    this.bodies = [];
    this.meeting = null;
    this.sabotage = emptySabotage();
    this.panelUntil = { servidor: 0, roteador: 0 };
    this.eject = null;
    this.end = null;
    this.markDirty();
    return null;
  }

  private placeAtSpawn() {
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

  backToLobby() {
    if (this.phase !== "ended") return;
    this.phase = "lobby";
    this.end = null;
    this.eject = null;
    this.meeting = null;
    this.bodies = [];
    this.sabotage = emptySabotage();
    for (const p of this.players.values()) {
      p.role = null;
      p.alive = true;
      p.deathKnown = false;
      p.roleRevealed = false;
      p.tasks = [];
      p.vote = null;
      p.vent = null;
    }
    this.placeAtSpawn();
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
    if (!(this.phase === "lobby" || this.phase === "ended" || this.canAct(now))) return;
    if (player.vent) return;

    // Tolerante a rajadas de pacotes (rede móvel), mas sem permitir teletransporte.
    const elapsed = Math.min(500, Math.max(33, now - player.lastMoveAt));
    const maxDist = BASE_SPEED * this.settings.speed * (elapsed / 1000) * 1.5 + 30;
    let dx = x - player.x;
    let dy = y - player.y;
    const dist = Math.hypot(dx, dy);
    let clamped = false;
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
      clamped = true;
    }

    const ghost = !player.alive && this.inGame();
    if (ghost) {
      const next = moveGhost(player, dx, dy);
      player.x = next.x;
      player.y = next.y;
    } else {
      const solids = solidsWith(this.closedDoors());
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
    player.lastMoveAt = now;
    if (clamped) this.sendTo(player, { type: "correct", x: player.x, y: player.y });
  }

  // ---------- Ações da partida ----------

  private visionOf(p: Player) {
    if (p.role === "infiltrator") return VISION_INFILTRATOR;
    return this.sabotage.lights ? VISION_BLACKOUT : VISION_CREW;
  }

  kill(killer: Player, targetId: string) {
    const now = Date.now();
    const target = this.players.get(targetId);
    if (!this.canAct(now) || !target) return;
    if (killer.role !== "infiltrator" || !killer.alive || killer.vent) return;
    if (!target.alive || target.role !== "crew") return;
    if (now < killer.killReadyAt) return;
    if (distance(killer, target) > KILL_RANGE) return;

    target.alive = false;
    target.vote = null;
    killer.killReadyAt = now + this.settings.killCooldown * 1000;
    this.bodies.push({ id: target.id, x: Math.round(target.x), y: Math.round(target.y), color: target.color });
    // O infiltrado vai até o corpo, como num bote.
    killer.x = target.x;
    killer.y = target.y;
    killer.lastMoveAt = now;
    this.sendTo(killer, { type: "correct", x: killer.x, y: killer.y });

    // Só fica sabendo da morte quem viu, a vítima, fantasmas e infiltrados.
    const segments = visionSegments(this.closedDoors());
    for (const p of this.players.values()) {
      const witnessed =
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
    if (!this.canAct(now) || !player.alive) return;
    const body = this.bodies.find((b) => b.id === bodyId);
    if (!body || distance(player, body) > REPORT_RANGE) return;
    this.startMeeting(player, "report", body.id);
  }

  emergency(player: Player) {
    const now = Date.now();
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
    this.placeAtSpawn();
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
    if (player.role === "crew") this.checkWin("tasks");
  }

  sabotageAction(player: Player, kind: SabotageKind) {
    const now = Date.now();
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
      (channel === "lobby" && (this.phase === "lobby" || this.phase === "ended")) ||
      (channel === "meeting" && this.phase === "meeting" && player.alive) ||
      (channel === "ghost" && this.inGame() && !player.alive);
    if (!allowed) return;

    player.chatTimes = player.chatTimes.filter((t) => now - t < CHAT_WINDOW);
    const last = player.chatTimes[player.chatTimes.length - 1] ?? 0;
    if (now - last < CHAT_MIN_INTERVAL || player.chatTimes.length >= CHAT_BURST) return;
    player.chatTimes.push(now);

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
    if (!this.inGame() || this.phase === "countdown") return false;
    const list = this.playerList;
    const infiltrators = list.filter((p) => p.role === "infiltrator" && p.alive).length;
    const crew = list.filter((p) => p.role === "crew" && p.alive).length;
    const crewPlayers = list.filter((p) => p.role === "crew");
    const total = crewPlayers.reduce((s, p) => s + p.tasks.length, 0);
    const done = crewPlayers.reduce((s, p) => s + p.tasks.filter((t) => t.done).length, 0);

    // Durante a reunião/expulsão só a desistência encerra; o resto é avaliado ao voltar.
    if (this.phase === "meeting" && context !== "abandon") return false;

    if (infiltrators === 0) return this.finish("crew", context === "abandon" ? "abandon" : "votes");
    if (infiltrators >= crew) return this.finish("infiltrator", context === "abandon" ? "abandon" : "kills");
    if (total > 0 && done >= total) return this.finish("crew", "tasks");
    return false;
  }

  private finish(winner: Role, reason: EndReason) {
    const list = this.playerList;
    const crew = list.filter((p) => p.role === "crew");
    this.phase = "ended";
    this.endedAt = Date.now();
    this.meeting = null;
    this.eject = null;
    this.bodies = [];
    this.sabotage = emptySabotage();
    this.end = {
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
