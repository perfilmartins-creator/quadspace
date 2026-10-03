// Conexão com o servidor do QUAD CREW: reconexão automática, sincronia de relógio
// e um store simples para o React (useSyncExternalStore).

import { INTERP_DELAY, NET_RATE } from "@/lib/crew/constants";
import { EMOTES, type EmoteId } from "@/lib/crew/lobby";
import { MODES } from "@/lib/crew/modes";
import { CREW_SERVER_URL } from "@/lib/crew/server-url";
import { sfx, vibrate } from "./feedback";
import type { Point, TaskId } from "@/lib/crew/map";
import {
  ERROR_MESSAGES,
  type ChatMessage,
  type ClientMessage,
  type ErrorCode,
  type LobbyFx,
  type RoomState,
  type ServerMessage,
} from "@/lib/crew/protocol";

export type Status = "idle" | "connecting" | "online" | "reconnecting" | "offline";

export type NoticeTone = "info" | "goal" | "mission" | "good" | "alert";
export type Notice = { id: number; text: string; tone: NoticeTone };

export type Snapshot = {
  status: Status;
  state: RoomState | null;
  error: { code: ErrorCode | "NETWORK"; message: string } | null;
  chat: ChatMessage[];
  notices: Notice[];
  /** Mudou a cada tarefa concluída (para tocar som / fechar o minigame). */
  lastTaskDone: { taskId: TaskId; at: number } | null;
  /** Você foi eliminado agora (para a animação de morte). */
  diedAt: number | null;
};

type Session = { code: string; playerId: string; token: string; savedAt: number };

const SESSION_KEY = "quad-crew:session";
const SESSION_MAX_AGE = 10 * 60 * 1000;

export function serverUrl(): string | null {
  if (CREW_SERVER_URL) return CREW_SERVER_URL;
  if (typeof window === "undefined") return null;
  // Desenvolvimento local: servidor dedicado (npm run crew:server).
  if (/^(localhost|127\.0\.0\.1|192\.168\.)/.test(window.location.hostname)) {
    return `ws://${window.location.hostname}:3030`;
  }
  // Produção: rota WebSocket do próprio site na Vercel.
  return `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/crew`;
}

function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (Date.now() - s.savedAt > SESSION_MAX_AGE) return null;
    return s;
  } catch {
    return null;
  }
}

function saveSession(s: Session | null) {
  try {
    if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Sem storage: reconexão só dentro da mesma página.
  }
}

/** Amostras de posição de um jogador remoto, para interpolação. */
export type Track = { samples: { t: number; x: number; y: number }[]; ghost: boolean; lastX: number; lastY: number; moving: boolean };

export type KillFx = { victimId: string; x: number; y: number; at: number };

export class CrewClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<() => void>();
  private snapshot: Snapshot = {
    status: "idle",
    state: null,
    error: null,
    chat: [],
    notices: [],
    lastTaskDone: null,
    diedAt: null,
  };
  private session: Session | null = null;
  private pending: ClientMessage | null = null;
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private noticeSeq = 0;
  private wantConnection = false;
  private lastMessageAt = 0;
  private quietTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;

  /** Diferença relógio do servidor − relógio local (ms). */
  clockOffset = 0;
  private bestRtt = Infinity;

  tracks = new Map<string, Track>();
  /** Posição local (predição). */
  local: Point = { x: 0, y: 0 };
  /** Deslocamento visual que some aos poucos após uma correção do servidor. */
  renderOffset: Point = { x: 0, y: 0 };
  /** Estimativa (servidor − local) a partir dos pacotes mais rápidos recentes. */
  private snapOffsets: { at: number; value: number }[] = [];
  private snapOffset: number | null = null;
  localReady = false;
  kills: KillFx[] = [];
  /** Último balido do Júlio (performance.now()). */
  bleat: { at: number; byId: string | null; byName: string | null } | null = null;
  /** Emotes recentes por jogador (performance.now()). */
  emotes = new Map<string, { emote: EmoteId; at: number }>();
  /** Últimos chutes na bola (para partículas). */
  ballHits: { x: number; y: number; at: number; power: number }[] = [];
  private lastSent = { x: 0, y: 0, at: 0 };

  // ---------- Store ----------

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  private update(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  serverNow() {
    return Date.now() + this.clockOffset;
  }

  // ---------- Conexão ----------

  /** Tenta retomar uma sessão salva (ex.: recarregou a página). */
  hasSavedSession() {
    return loadSession() !== null;
  }

  resumeSaved() {
    const s = loadSession();
    if (!s) return false;
    this.session = s;
    this.connect({ type: "resume", code: s.code, playerId: s.playerId, token: s.token });
    return true;
  }

  createRoom(name: string, password: string) {
    this.connect({ type: "create", name, password });
  }

  joinRoom(code: string, password: string, name: string) {
    this.connect({ type: "join", code, password, name });
  }

  private connect(first: ClientMessage) {
    this.pending = first;
    this.wantConnection = true;
    this.update({ error: null, status: this.snapshot.state ? "reconnecting" : "connecting" });
    this.open();
  }

  private open() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    const url = serverUrl();
    if (!url) {
      this.wantConnection = false;
      this.update({ status: "offline", error: { code: "NETWORK", message: "O servidor do jogo ainda não está no ar." } });
      return;
    }
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.lastMessageAt = Date.now();
      this.startWatchdog(ws);
      this.ping();
      if (this.pending) ws.send(JSON.stringify(this.pending));
    };
    ws.onmessage = (event) => {
      this.lastMessageAt = Date.now();
      try {
        this.handle(JSON.parse(String(event.data)) as ServerMessage);
      } catch {
        // mensagem inválida: ignora
      }
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = null;
      if (!this.wantConnection) return;
      if (this.session) {
        this.pending = { type: "resume", code: this.session.code, playerId: this.session.playerId, token: this.session.token };
      }
      this.scheduleRetry();
    };
  }

  /**
   * Quedas silenciosas de Wi-Fi não fecham o WebSocket na hora. O servidor manda
   * posições ~15x por segundo: 5 s sem nada = conexão morta, reconecta.
   */
  private startWatchdog(ws: WebSocket) {
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = setInterval(() => {
      if (this.ws !== ws) return;
      if (Date.now() - this.lastMessageAt > 5000) {
        ws.close();
        ws.onclose?.(new CloseEvent("close"));
      }
    }, 1000);
  }

  /** O celular voltou a ter internet: tenta reconectar imediatamente. */
  handleOnline = () => {
    if (!this.wantConnection || (this.ws && this.ws.readyState === WebSocket.OPEN)) return;
    this.retry = 0;
    this.open();
  };

  private scheduleRetry() {
    this.retry += 1;
    // Primeiro acesso pode acordar o servidor (até ~1 min): continua tentando.
    const limit = this.session ? 20 : 12;
    if (this.retry > limit) {
      this.wantConnection = false;
      this.update({
        status: "offline",
        error: { code: "NETWORK", message: "Não foi possível conectar ao servidor. Verifique sua internet." },
      });
      return;
    }
    // A Vercel encerra cada conexão periodicamente: a primeira tentativa é imediata
    // e o aviso de reconexão só aparece se a volta demorar.
    const delay = this.retry === 1 ? 0 : Math.min(4000, 400 * 1.6 ** this.retry);
    if (this.retry > 1 || !this.session) {
      this.update({ status: this.session ? "reconnecting" : "connecting" });
    } else {
      if (this.quietTimer) clearTimeout(this.quietTimer);
      this.quietTimer = setTimeout(() => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) this.update({ status: "reconnecting" });
      }, 1500);
    }
    this.retryTimer = setTimeout(() => this.open(), delay);
  }

  private ping() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    const send = () => this.send({ type: "ping", c: Date.now() });
    send();
    this.pingTimer = setInterval(send, 4000);
  }

  send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  leave() {
    this.wantConnection = false;
    this.send({ type: "leave" });
    saveSession(null);
    this.session = null;
    this.ws?.close();
    this.ws = null;
    this.tracks.clear();
    this.localReady = false;
    this.update({ status: "idle", state: null, chat: [], error: null, notices: [], diedAt: null });
  }

  /** Ao fechar a aba: mantém a sessão para reconectar. */
  dispose() {
    this.wantConnection = false;
    if (this.watchdog) clearInterval(this.watchdog);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this.ws = null;
  }

  clearError() {
    this.update({ error: null });
  }

  // ---------- Mensagens ----------

  private handle(msg: ServerMessage) {
    switch (msg.type) {
      case "welcome":
        this.session = { code: msg.code, playerId: msg.playerId, token: msg.token, savedAt: Date.now() };
        saveSession(this.session);
        this.pending = null;
        this.update({ status: "online", error: null });
        break;
      case "error":
        if (msg.code === "SESSION_EXPIRED") {
          saveSession(null);
          this.session = null;
          this.wantConnection = false;
          this.ws?.close();
          this.tracks.clear();
          this.localReady = false;
          this.update({ status: "idle", state: null, chat: [], error: { code: msg.code, message: msg.message } });
        } else {
          this.wantConnection = !!this.session;
          if (!this.session) this.ws?.close();
          this.update({ status: this.session ? "online" : "idle", error: { code: msg.code, message: msg.message } });
        }
        break;
      case "state": {
        const prev = this.snapshot.state;
        const state = msg.state;
        if (this.session) {
          this.session.savedAt = Date.now();
          saveSession(this.session);
        }
        let diedAt = this.snapshot.diedAt;
        if (prev && prev.you.alive && !state.you.alive && state.phase === "playing") diedAt = Date.now();
        if (state.phase !== "playing") diedAt = null;
        const chat = prev && prev.round !== state.round ? [] : this.snapshot.chat;
        this.update({ state, status: "online", diedAt, chat });
        break;
      }
      case "snap":
        this.ingestSnap(msg.t, msg.p);
        break;
      case "correct": {
        // Correções pequenas: o personagem desliza até a posição certa.
        const dx = this.local.x - msg.x;
        const dy = this.local.y - msg.y;
        if (this.localReady && Math.hypot(dx, dy) < 80) {
          this.renderOffset = { x: this.renderOffset.x + dx, y: this.renderOffset.y + dy };
        } else {
          this.renderOffset = { x: 0, y: 0 };
        }
        this.local = { x: msg.x, y: msg.y };
        this.localReady = true;
        this.lastSent = { x: msg.x, y: msg.y, at: Date.now() };
        break;
      }
      case "chat":
        if (!this.snapshot.chat.some((m) => m.id === msg.message.id)) {
          this.update({ chat: [...this.snapshot.chat.slice(-60), msg.message] });
        }
        break;
      case "bleat":
        this.bleat = { at: performance.now(), byId: msg.byId, byName: msg.byName };
        break;
      case "killed":
        this.kills.push({ victimId: msg.victimId, x: msg.x, y: msg.y, at: performance.now() });
        break;
      case "notice":
        this.toast(msg.text, "info");
        break;
      case "emote":
        this.emotes.set(msg.playerId, { emote: msg.emote, at: performance.now() });
        break;
      case "fx":
        this.handleFx(msg.fx);
        break;
      case "taskDone":
        this.update({ lastTaskDone: { taskId: msg.taskId, at: Date.now() } });
        break;
      case "kicked":
        saveSession(null);
        this.session = null;
        this.wantConnection = false;
        this.tracks.clear();
        this.localReady = false;
        this.update({
          status: "idle",
          state: null,
          chat: [],
          error: { code: "NOT_ALLOWED", message: "Você foi removido da sala pelo host." },
        });
        break;
      case "pong": {
        const rtt = Date.now() - msg.c;
        if (rtt <= this.bestRtt * 1.5 || rtt < 120) {
          this.bestRtt = Math.min(this.bestRtt, rtt);
          this.clockOffset = msg.s - (msg.c + rtt / 2);
        }
        break;
      }
    }
  }

  private ingestSnap(t: number, entries: [string, number, number, 0 | 1][]) {
    // O pacote mais rápido dos últimos 3 s define o relógio da interpolação:
    // atrasos ocasionais da rede não fazem os personagens "pularem".
    const arrival = Date.now();
    this.snapOffsets.push({ at: arrival, value: t - arrival });
    this.snapOffsets = this.snapOffsets.filter((o) => arrival - o.at < 3000);
    this.snapOffset = Math.max(...this.snapOffsets.map((o) => o.value));
    const seen = new Set<string>();
    const me = this.session?.playerId;
    for (const [id, x, y, ghost] of entries) {
      seen.add(id);
      if (id === me) {
        if (!this.localReady) {
          this.local = { x, y };
          this.localReady = true;
        }
        continue;
      }
      let track = this.tracks.get(id);
      if (!track) {
        track = { samples: [], ghost: ghost === 1, lastX: x, lastY: y, moving: false };
        this.tracks.set(id, track);
      }
      track.ghost = ghost === 1;
      track.samples.push({ t, x, y });
      if (track.samples.length > 30) track.samples.splice(0, track.samples.length - 30);
    }
    for (const id of this.tracks.keys()) if (!seen.has(id)) this.tracks.delete(id);
  }

  /** Posição interpolada de um jogador remoto (renderiza ~110 ms no passado). */
  remotePosition(id: string): (Point & { moving: boolean }) | null {
    const track = this.tracks.get(id);
    if (!track || track.samples.length === 0) return null;
    const t = (this.snapOffset !== null ? Date.now() + this.snapOffset : this.serverNow()) - INTERP_DELAY;
    const s = track.samples;
    let x = s[s.length - 1].x;
    let y = s[s.length - 1].y;
    if (t <= s[0].t) {
      x = s[0].x;
      y = s[0].y;
    } else {
      for (let i = s.length - 1; i > 0; i--) {
        if (s[i - 1].t <= t && t <= s[i].t) {
          const k = (t - s[i - 1].t) / Math.max(1, s[i].t - s[i - 1].t);
          x = s[i - 1].x + (s[i].x - s[i - 1].x) * k;
          y = s[i - 1].y + (s[i].y - s[i - 1].y) * k;
          break;
        }
      }
    }
    const moving = Math.hypot(x - track.lastX, y - track.lastY) > 0.3;
    track.lastX = x;
    track.lastY = y;
    track.moving = moving;
    return { x, y, moving };
  }

  /** Aviso curto e discreto (some sozinho). */
  toast(text: string, tone: NoticeTone = "info", ms = 2600) {
    const id = ++this.noticeSeq;
    this.update({ notices: [...this.snapshot.notices.slice(-2), { id, text, tone }] });
    setTimeout(() => this.update({ notices: this.snapshot.notices.filter((n) => n.id !== id) }), ms);
  }

  /** Eventos do lobby: som, vibração e aviso. */
  private handleFx(fx: LobbyFx) {
    const me = this.session?.playerId;
    switch (fx.kind) {
      case "hit": {
        this.ballHits.push({ x: fx.x, y: fx.y, at: performance.now(), power: fx.power });
        if (this.ballHits.length > 8) this.ballHits.shift();
        const d = Math.hypot(this.local.x - fx.x, this.local.y - fx.y);
        const volume = fx.byId === me ? 1 : Math.max(0, 1 - d / 700);
        if (volume > 0.08) sfx.ballHit(fx.power, volume);
        if (fx.byId === me) vibrate(12);
        break;
      }
      case "goal": {
        sfx.goal();
        vibrate([40, 30, 40]);
        const who = fx.byName ? ` ${fx.byName.toUpperCase()}` : "";
        this.toast(`GOOOOL!${who} · AZUL ${fx.score.blue} × ${fx.score.red} VERMELHO`, "goal", 2200);
        break;
      }
      case "mission":
        sfx.mission();
        vibrate(30);
        this.toast(`MISSÃO CONCLUÍDA · +${fx.reward} XP`, "mission", 2200);
        break;
      case "ready":
        if (fx.playerId === me) {
          sfx.ready(fx.ready);
          vibrate(fx.ready ? 25 : 10);
        }
        break;
      case "mode":
        sfx.mode();
        this.toast(`MODO ALTERADO · ${MODES[fx.mode].name.toUpperCase()}`, "good", 2400);
        break;
      case "host":
        this.toast(`${fx.name.toUpperCase()} É O NOVO HOST`, "info", 2600);
        break;
      case "cancel":
        sfx.cancel();
        this.toast(`PARTIDA CANCELADA · ${fx.reason}`, "alert", 2400);
        break;
      case "joined":
        sfx.join();
        this.toast(`${fx.name.toUpperCase()} ENTROU`, "info", 2000);
        break;
      case "coffee":
        this.toast(`☕ ${fx.byName} pegou um café`, "info", 2000);
        break;
      case "tv":
        this.toast(`📺 ${fx.byName} trocou o canal da TV`, "info", 2000);
        break;
    }
  }

  emoteLabel(id: EmoteId) {
    return EMOTES.find((e) => e.id === id);
  }

  /** Envia a posição local em NET_RATE Hz quando ela muda. */
  syncPosition() {
    const now = Date.now();
    if (now - this.lastSent.at < 1000 / NET_RATE) return;
    if (Math.abs(this.local.x - this.lastSent.x) < 0.5 && Math.abs(this.local.y - this.lastSent.y) < 0.5) return;
    this.lastSent = { x: this.local.x, y: this.local.y, at: now };
    this.send({ type: "move", x: Math.round(this.local.x * 10) / 10, y: Math.round(this.local.y * 10) / 10 });
  }

  get playerId() {
    return this.session?.playerId ?? null;
  }
}

export function errorText(code: ErrorCode) {
  return ERROR_MESSAGES[code];
}
