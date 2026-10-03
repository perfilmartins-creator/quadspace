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
export const VENT_RANGE = 70;
export const EMERGENCY_RANGE = 120;

export const VISION_CREW = 330;
export const VISION_INFILTRATOR = 420;
export const VISION_BLACKOUT = 120;

/** Frequência de envio de posição / snapshots (Hz). */
export const NET_RATE = 20;
/** Atraso de interpolação dos jogadores remotos (ms). */
export const INTERP_DELAY = 100;

/** Contagem regressiva no lobby antes da partida (jogadores ainda andam). */
export const COUNTDOWN_MS = 5000;
/** Host desconectado por mais que isso perde o posto para outro jogador. */
export const HOST_GRACE_MS = 8000;
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
  /** Modo de jogo escolhido pelo host (ver modes.ts). */
  gameMode: GameModeId;
  /** Preset rápido aplicado por último ("custom" depois de qualquer ajuste manual). */
  preset: PresetId;
  /** Só deixa iniciar quando todos os conectados estiverem READY. */
  requireAllReady: boolean;
  /** Duração da partida nos modos com cronômetro (s). */
  matchTime: number;
  /** Segundos que os fugitivos têm para se esconder antes do caçador ser liberado. */
  hideTime: number;
  /** Multiplicadores de velocidade por papel nos modos de perseguição. */
  hunterSpeed: number;
  runnerSpeed: number;
  /** Raio de visão por papel nos modos de perseguição. */
  hunterVision: number;
  runnerVision: number;
  /** Segundos que cada tarefa tira do cronômetro (Hide & Seek). */
  taskTimeBonus: number;
};

export type GameModeId = "classic" | "hide_seek" | "infection";
export const GAME_MODE_IDS: GameModeId[] = ["classic", "hide_seek", "infection"];
export type PresetId = "casual" | "normal" | "rapido" | "caos" | "custom";

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
  gameMode: "classic",
  preset: "normal",
  requireAllReady: false,
  matchTime: 150,
  hideTime: 10,
  hunterSpeed: 1.1,
  runnerSpeed: 1,
  hunterVision: 300,
  runnerVision: 360,
  taskTimeBonus: 3,
};

type NumericLimits = { min: number; max: number; step: number };

export type NumericSettingKey =
  | "infiltrators"
  | "maxPlayers"
  | "speed"
  | "killCooldown"
  | "tasksPerPlayer"
  | "discussionTime"
  | "votingTime"
  | "emergencyPerPlayer"
  | "matchTime"
  | "hideTime"
  | "hunterSpeed"
  | "runnerSpeed"
  | "hunterVision"
  | "runnerVision"
  | "taskTimeBonus";

export const SETTING_LIMITS: Record<NumericSettingKey, NumericLimits> = {
  infiltrators: { min: 1, max: 2, step: 1 },
  maxPlayers: { min: MIN_PLAYERS, max: MAX_PLAYERS_LIMIT, step: 1 },
  speed: { min: 0.75, max: 1.5, step: 0.25 },
  killCooldown: { min: 10, max: 60, step: 5 },
  tasksPerPlayer: { min: 2, max: 6, step: 1 },
  discussionTime: { min: 0, max: 60, step: 5 },
  votingTime: { min: 15, max: 120, step: 5 },
  emergencyPerPlayer: { min: 0, max: 3, step: 1 },
  matchTime: { min: 60, max: 300, step: 15 },
  hideTime: { min: 5, max: 20, step: 1 },
  hunterSpeed: { min: 0.75, max: 1.5, step: 0.05 },
  runnerSpeed: { min: 0.75, max: 1.5, step: 0.05 },
  hunterVision: { min: 160, max: 520, step: 20 },
  runnerVision: { min: 160, max: 520, step: 20 },
  taskTimeBonus: { min: 0, max: 10, step: 1 },
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
  for (const key of ["revealRoleOnEject", "anonymousVotes", "requireAllReady"] as const) {
    if (typeof patch[key] === "boolean") next[key] = patch[key];
  }
  if (typeof patch.gameMode === "string" && (GAME_MODE_IDS as string[]).includes(patch.gameMode)) next.gameMode = patch.gameMode as GameModeId;
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

// ---------- Júlio, o rato da QUAD ----------

/** Id do Júlio nos pacotes de posição (jogadores nunca têm "@" no id). */
export const RAT_ID = "@julio";
export const RAT_NAME = "Júlio";
/** Rato corre rapidinho, mas ainda mais devagar que os jogadores: dá para alcançar e bater (+XP). */
export const RAT_SPEED = 130;
export const RAT_HIT_RANGE = 85;
/** Intervalo entre duas pancadas do mesmo jogador (anti-spam de XP). */
export const RAT_HIT_COOLDOWN_MS = 2500;
/** XP ganho por pancada no Júlio. */
export const RAT_XP = 10;
/** Depois de apanhar, o Júlio dispara para longe por este tempo, mais rápido. */
export const RAT_FLEE_MS = 1400;
export const RAT_FLEE_SPEED = 2.1;
