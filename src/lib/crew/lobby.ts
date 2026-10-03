// LOBBY da QUAD: um mapa pequeno e jogável, separado do mapa da partida.
//
//  +-----------------------------------------------------------+
//  |  [MODOS]            ====== QUADRA ======          [MISSÕES]|
//  |                  ||                    ||                  |
//  |  [CONFIG]       GOL        (bola)       GOL         [CAFÉ] |
//  |                  ||                    ||                  |
//  |                     ====================                   |
//  |                                                            |
//  |   ( SAFE  )            SPAWN                [ READY ]      |
//  |   ( ZONE  )                                 [  ZONE ]      |
//  +-----------------------------------------------------------+

import type { Point, Rect } from "./map";

export const LOBBY_WIDTH = 1400;
export const LOBBY_HEIGHT = 1000;
const WALL = 24;

export const LOBBY_WALLS: Rect[] = [
  { x: 0, y: -WALL / 2, w: LOBBY_WIDTH, h: WALL },
  { x: 0, y: LOBBY_HEIGHT - WALL / 2, w: LOBBY_WIDTH, h: WALL },
  { x: -WALL / 2, y: 0, w: WALL, h: LOBBY_HEIGHT },
  { x: LOBBY_WIDTH - WALL / 2, y: 0, w: WALL, h: LOBBY_HEIGHT },
];

/** Objetos com os quais dá para INTERAGIR (o ponto de uso fica na frente do móvel). */
export type LobbyObjectId = "modes" | "settings" | "missions" | "coffee" | "tv" | "ready";

export type LobbyObject = { id: LobbyObjectId; label: string; pos: Point; rect: Rect; solid: boolean };

export const LOBBY_OBJECTS: LobbyObject[] = [
  { id: "modes", label: "MODOS", pos: { x: 150, y: 250 }, rect: { x: 100, y: 150, w: 100, h: 44 }, solid: true },
  { id: "settings", label: "CONFIG", pos: { x: 150, y: 470 }, rect: { x: 100, y: 370, w: 100, h: 44 }, solid: true },
  { id: "missions", label: "MISSÕES", pos: { x: 1250, y: 250 }, rect: { x: 1200, y: 150, w: 100, h: 44 }, solid: true },
  { id: "coffee", label: "CAFÉ", pos: { x: 1250, y: 470 }, rect: { x: 1215, y: 380, w: 70, h: 44 }, solid: true },
  { id: "tv", label: "TV", pos: { x: 700, y: 92 }, rect: { x: 620, y: 14, w: 160, h: 26 }, solid: true },
  { id: "ready", label: "READY", pos: { x: 1190, y: 790 }, rect: { x: 1300, y: 760, w: 60, h: 60 }, solid: true },
];

export const LOBBY_INTERACT_RANGE = 85;

/** Sólidos para personagens. */
export const LOBBY_SOLIDS: Rect[] = [...LOBBY_WALLS, ...LOBBY_OBJECTS.filter((o) => o.solid).map((o) => o.rect)];

// ---------- Zonas ----------

export const LOBBY_SPAWN: Rect = { x: 560, y: 700, w: 280, h: 200 };

export const SAFE_ZONE = { x: 210, y: 800, r: 130 };

export const READY_ZONE: Rect = { x: 1080, y: 690, w: 200, h: 200 };
/** Tempo dentro da READY ZONE para ficar pronto. */
export const READY_HOLD_MS = 1000;

// ---------- Quadra e bola ----------

/** Área onde a bola vive (personagens entram e saem livremente; a bola não sai). */
export const COURT: Rect = { x: 360, y: 150, w: 680, h: 380 };
export const GOAL_MOUTH = 130;
export const GOAL_DEPTH = 46;
const goalTop = COURT.y + COURT.h / 2 - GOAL_MOUTH / 2;
/** Gol da esquerda (quem marca aqui é o time VERMELHO) e da direita (AZUL). */
export const GOALS = {
  left: { x: COURT.x - GOAL_DEPTH, y: goalTop, w: GOAL_DEPTH, h: GOAL_MOUTH } as Rect,
  right: { x: COURT.x + COURT.w, y: goalTop, w: GOAL_DEPTH, h: GOAL_MOUTH } as Rect,
};
export const BALL_SPAWN: Point = { x: COURT.x + COURT.w / 2, y: COURT.y + COURT.h / 2 };
export const BALL_RADIUS = 15;
export const BALL_MAX_SPEED = 720;
/** Desaceleração exponencial por segundo (atrito). */
export const BALL_FRICTION = 1.15;
export const BALL_RESTITUTION = 0.62;
export const GOAL_FREEZE_MS = 2200;

/**
 * Paredes que só a bola enxerga: contorno da quadra com abertura nos gols
 * e o fundo/laterais de cada gol. Assim a bola nunca bloqueia ninguém fora da quadra
 * e nunca entra na Safe Zone.
 */
export const BALL_WALLS: Rect[] = (() => {
  const t = 16;
  const { x, y, w, h } = COURT;
  const gy1 = goalTop;
  const gy2 = goalTop + GOAL_MOUTH;
  return [
    { x: x - t, y: y - t, w: w + 2 * t, h: t },
    { x: x - t, y: y + h, w: w + 2 * t, h: t },
    { x: x - t, y: y, w: t, h: gy1 - y },
    { x: x - t, y: gy2, w: t, h: y + h - gy2 },
    { x: x + w, y: y, w: t, h: gy1 - y },
    { x: x + w, y: gy2, w: t, h: y + h - gy2 },
    // Rede dos gols
    { x: GOALS.left.x - t, y: gy1 - t, w: t, h: GOAL_MOUTH + 2 * t },
    { x: GOALS.left.x - t, y: gy1 - t, w: GOAL_DEPTH + t, h: t },
    { x: GOALS.left.x - t, y: gy2, w: GOAL_DEPTH + t, h: t },
    { x: GOALS.right.x + GOAL_DEPTH, y: gy1 - t, w: t, h: GOAL_MOUTH + 2 * t },
    { x: GOALS.right.x, y: gy1 - t, w: GOAL_DEPTH + t, h: t },
    { x: GOALS.right.x, y: gy2, w: GOAL_DEPTH + t, h: t },
  ];
})();

// ---------- Áreas (missão "visite 3 áreas") ----------

export type LobbyAreaId = "spawn" | "safe" | "court" | "ready" | "west" | "east";

export const LOBBY_AREAS: { id: LobbyAreaId; name: string; rect: Rect }[] = [
  { id: "court", name: "Quadra", rect: COURT },
  { id: "spawn", name: "Spawn", rect: LOBBY_SPAWN },
  { id: "safe", name: "Safe Zone", rect: { x: SAFE_ZONE.x - SAFE_ZONE.r, y: SAFE_ZONE.y - SAFE_ZONE.r, w: SAFE_ZONE.r * 2, h: SAFE_ZONE.r * 2 } },
  { id: "ready", name: "Ready Zone", rect: READY_ZONE },
  { id: "west", name: "Painéis", rect: { x: 24, y: 100, w: 300, h: 460 } },
  { id: "east", name: "Copa", rect: { x: 1076, y: 100, w: 300, h: 460 } },
];

export function inRect(p: Point, r: Rect) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

export function inSafeZone(p: Point) {
  return Math.hypot(p.x - SAFE_ZONE.x, p.y - SAFE_ZONE.y) <= SAFE_ZONE.r;
}

export function lobbyAreaAt(p: Point): LobbyAreaId | null {
  if (inSafeZone(p)) return "safe";
  return LOBBY_AREAS.find((a) => a.id !== "safe" && inRect(p, a.rect))?.id ?? null;
}

/** Posições de nascimento espalhadas na área de spawn (sem ninguém um em cima do outro). */
export function lobbySpawnPoint(index: number): Point {
  const cx = LOBBY_SPAWN.x + LOBBY_SPAWN.w / 2;
  const cy = LOBBY_SPAWN.y + LOBBY_SPAWN.h / 2;
  if (index === 0) return { x: cx, y: cy };
  const ring = index <= 6 ? 1 : 2;
  const slots = ring === 1 ? 6 : 10;
  const i = ring === 1 ? index - 1 : index - 7;
  const angle = (i / slots) * Math.PI * 2 + (ring === 2 ? 0.3 : 0);
  const r = ring * 56;
  return { x: Math.round(cx + Math.cos(angle) * r), y: Math.round(cy + Math.sin(angle) * r * 0.8) };
}

// ---------- Emotes ----------

export type EmoteId = "wave" | "laugh" | "question" | "fire" | "come" | "look" | "ready";

export const EMOTES: { id: EmoteId; label: string; icon: string }[] = [
  { id: "wave", label: "Oi!", icon: "👋" },
  { id: "laugh", label: "Kkkk", icon: "😂" },
  { id: "question", label: "?", icon: "❓" },
  { id: "fire", label: "Brabo", icon: "🔥" },
  { id: "come", label: "Vem aqui!", icon: "📍" },
  { id: "look", label: "Olha isso!", icon: "👀" },
  { id: "ready", label: "Bora!", icon: "✅" },
];
export const EMOTE_COOLDOWN_MS = 1200;
export const EMOTE_DURATION_MS = 2200;

// ---------- AFK ----------

export const AFK_MS = 60_000;
export const AFK_SAFE_MS = 120_000;
