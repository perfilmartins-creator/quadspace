// QUAD CREW: constantes compartilhadas entre cliente e servidor.

export const GAME_NAME = "AMOUNG QUAD";

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS_LIMIT = 10;

export const NAME_MIN = 2;
export const NAME_MAX = 16;
export const PASSWORD_MIN = 3;
export const PASSWORD_MAX = 32;
export const CHAT_MAX = 120;

export const ROOM_CODE_LENGTH = 4;
/** Sem 0/O/1/I para evitar confusão ao ditar o código. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Velocidade base do personagem (unidades de mundo por segundo). */
export const BASE_SPEED = 210;
/** Meia-largura da caixa de colisão do personagem. */
export const PLAYER_HALF = 14;

export const KILL_RANGE = 90;
export const REPORT_RANGE = 120;
export const USE_RANGE = 80;
export const EMERGENCY_RANGE = 120;

export const VISION_CREW = 330;
export const VISION_INFILTRATOR = 420;
export const VISION_BLACKOUT = 120;

/** Frequência de envio de posição / snapshots (Hz). */
export const NET_RATE = 15;
/** Atraso de interpolação dos jogadores remotos (ms). */
export const INTERP_DELAY = 110;

export const COUNTDOWN_MS = 3000;
export const ROLE_REVEAL_MS = 3500;
export const MEETING_INTRO_MS = 2500;
export const VOTE_RESULT_MS = 4000;
export const EJECT_MS = 5000;
export const KILL_COOLDOWN_START_MS = 12000;
export const RECONNECT_GRACE_MS = 30000;
export const EMPTY_ROOM_TTL_MS = 60000;
/** Tempo mínimo que uma tarefa precisa ficar aberta para ser aceita. */
export const TASK_MIN_MS = 1500;

export const SABOTAGE_COOLDOWN_MS = 30000;
export const CRITICAL_DURATION_MS = 45000;
export const DOORS_DURATION_MS = 10000;
/** Quanto tempo um painel continua "ativo" após o último sinal do jogador. */
export const PANEL_HOLD_MS = 1200;

export type Color = {
  id: string;
  name: string;
  hex: string;
};

/** Paleta de cores dos personagens (uma por jogador). */
export const COLORS: Color[] = [
  { id: "white", name: "Branco", hex: "#f2f2f2" },
  { id: "red", name: "Vermelho", hex: "#ff4d3d" },
  { id: "blue", name: "Azul", hex: "#3d7bff" },
  { id: "green", name: "Verde", hex: "#2ed47a" },
  { id: "yellow", name: "Amarelo", hex: "#ffd23d" },
  { id: "orange", name: "Laranja", hex: "#ff8a3d" },
  { id: "pink", name: "Rosa", hex: "#ff6fb5" },
  { id: "purple", name: "Roxo", hex: "#9b6bff" },
  { id: "cyan", name: "Ciano", hex: "#3de0ff" },
  { id: "lime", name: "Lima", hex: "#b6f03d" },
  { id: "brown", name: "Marrom", hex: "#a8693d" },
  { id: "gray", name: "Grafite", hex: "#7c8088" },
];

export function colorHex(id: string) {
  return COLORS.find((c) => c.id === id)?.hex ?? "#f2f2f2";
}

export type Settings = {
  infiltrators: number;
  maxPlayers: number;
  /** Multiplicador de velocidade dos personagens. */
  speed: number;
  /** Cooldown de eliminação em segundos. */
  killCooldown: number;
  tasksPerPlayer: number;
  /** Tempo de discussão antes da votação (s). */
  discussionTime: number;
  votingTime: number;
  revealRoleOnEject: boolean;
  anonymousVotes: boolean;
  emergencyPerPlayer: number;
};

export const DEFAULT_SETTINGS: Settings = {
  infiltrators: 1,
  maxPlayers: 10,
  speed: 1,
  killCooldown: 25,
  tasksPerPlayer: 4,
  discussionTime: 20,
  votingTime: 40,
  revealRoleOnEject: true,
  anonymousVotes: true,
  emergencyPerPlayer: 1,
};

type NumericLimits = { min: number; max: number; step: number };

export const SETTING_LIMITS: Record<
  "infiltrators" | "maxPlayers" | "speed" | "killCooldown" | "tasksPerPlayer" | "discussionTime" | "votingTime" | "emergencyPerPlayer",
  NumericLimits
> = {
  infiltrators: { min: 1, max: 2, step: 1 },
  maxPlayers: { min: MIN_PLAYERS, max: MAX_PLAYERS_LIMIT, step: 1 },
  speed: { min: 0.75, max: 1.5, step: 0.25 },
  killCooldown: { min: 10, max: 60, step: 5 },
  tasksPerPlayer: { min: 2, max: 6, step: 1 },
  discussionTime: { min: 0, max: 60, step: 5 },
  votingTime: { min: 15, max: 120, step: 5 },
  emergencyPerPlayer: { min: 0, max: 3, step: 1 },
};

/** Infiltrados recomendados (e máximo permitido) para o número de jogadores. */
export function maxInfiltratorsFor(players: number) {
  return players >= 7 ? 2 : 1;
}

/** Normaliza configurações vindas do cliente (valores fora do limite são ajustados). */
export function sanitizeSettings(current: Settings, patch: Partial<Record<keyof Settings, unknown>>): Settings {
  const next: Settings = { ...current };
  for (const key of Object.keys(SETTING_LIMITS) as (keyof typeof SETTING_LIMITS)[]) {
    const value = patch[key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const { min, max, step } = SETTING_LIMITS[key];
    const snapped = Math.round((value - min) / step) * step + min;
    next[key] = Math.min(max, Math.max(min, Number(snapped.toFixed(2))));
  }
  for (const key of ["revealRoleOnEject", "anonymousVotes"] as const) {
    if (typeof patch[key] === "boolean") next[key] = patch[key];
  }
  return next;
}

/** Limpa nomes: remove controles/HTML, colapsa espaços. Retorna null se inválido. */
export function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Nada de HTML ou caracteres de script: rejeita em vez de "limpar".
  if (/[<>&"'`\\/]/.test(raw)) return null;
  const name = raw
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) return null;
  if (!/^[\p{L}\p{N} ._-]+$/u.test(name)) return null;
  return name;
}

/** Limpa mensagens de chat (o cliente renderiza sempre como texto, nunca HTML). */
export function sanitizeChat(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CHAT_MAX);
  return text.length > 0 ? text : null;
}

export function normalizeRoomCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== ROOM_CODE_LENGTH) return null;
  return code;
}
