// Protocolo de rede do QUAD CREW (JSON sobre WebSocket).
// O servidor é autoritativo: o cliente só envia intenções.

import type { Settings } from "./constants";
import type { DoorId, PanelId, RoomId, TaskId, VentId } from "./map";

export type Phase = "lobby" | "countdown" | "playing" | "meeting" | "ejecting" | "ended";
export type Role = "crew" | "infiltrator";
export type ChatChannel = "lobby" | "meeting" | "ghost";
export type SabotageKind = "lights" | "critical" | "doors";

export type PublicPlayer = {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  connected: boolean;
  /** Para quem está vivo, só fica false depois que a morte é descoberta. */
  alive: boolean;
  /** Papel revelado: só após expulsão com revelação, para parceiros infiltrados ou no fim. */
  role?: Role;
};

export type Body = { id: string; x: number; y: number; color: string };

export type VoteTarget = string | "skip";

export type MeetingState = {
  stage: "intro" | "discussion" | "voting" | "result";
  endsAt: number;
  callerId: string;
  reason: "report" | "emergency";
  victimId: string | null;
  /** Quem já votou (sem revelar em quem). */
  voted: string[];
  result: null | {
    ejectedId: string | null;
    tie: boolean;
    tally: Record<string, number>;
    /** Só presente quando o voto não é anônimo. */
    votes?: Record<string, VoteTarget>;
  };
};

export type SabotageState = {
  lights: boolean;
  critical: null | { endsAt: number; panels: Record<PanelId, boolean> };
  doors: null | { room: RoomId; doors: DoorId[]; until: number };
};

export type EjectState = {
  playerId: string | null;
  name: string | null;
  color: string | null;
  /** Presente quando o host ativou "revelar papel após votação". */
  role?: Role;
  tie: boolean;
  endsAt: number;
  /** Infiltrados restantes (só quando o host revela papéis). */
  remaining?: number;
};

export type EndReason = "tasks" | "votes" | "kills" | "sabotage" | "abandon";

export type EndState = {
  winner: Role;
  reason: EndReason;
  infiltrators: { id: string; name: string; color: string }[];
  eliminated: number;
  tasksDone: number;
  tasksTotal: number;
};

export type YouState = {
  id: string;
  role: Role | null;
  alive: boolean;
  tasks: { id: TaskId; done: boolean }[];
  emergencyLeft: number;
  killReadyAt: number;
  sabotageReadyAt: number;
  /** Outros infiltrados (só para infiltrados). */
  partners: string[];
  /** Voto já registrado nesta reunião. */
  vote: VoteTarget | null;
  /** Duto em que o infiltrado está escondido. */
  vent: VentId | null;
};

export type RoomState = {
  code: string;
  phase: Phase;
  hostId: string;
  settings: Settings;
  players: PublicPlayer[];
  /** Fim da contagem 3-2-1 (fase countdown). */
  countdownEndsAt: number | null;
  /** Até quando o movimento fica travado (revelação do papel, volta da reunião). */
  frozenUntil: number;
  /** Fim da tela secreta de papel desta rodada. */
  revealUntil: number;
  tasks: { done: number; total: number };
  bodies: Body[];
  meeting: MeetingState | null;
  sabotage: SabotageState;
  eject: EjectState | null;
  end: EndState | null;
  /** Número da rodada (muda a cada partida; útil para resetar a UI). */
  round: number;
  you: YouState;
};

export type ChatMessage = {
  id: number;
  channel: ChatChannel;
  fromId: string;
  name: string;
  color: string;
  text: string;
  at: number;
};

// ---------- Cliente → servidor ----------

export type ClientMessage =
  | { type: "create"; name: string; password: string }
  | { type: "join"; code: string; password: string; name: string }
  | { type: "resume"; code: string; playerId: string; token: string }
  | { type: "leave" }
  | { type: "move"; x: number; y: number }
  | { type: "color"; color: string }
  | { type: "settings"; settings: Partial<Settings> }
  | { type: "kick"; playerId: string }
  | { type: "start" }
  | { type: "chat"; channel: ChatChannel; text: string }
  | { type: "kill"; targetId: string }
  | { type: "report"; bodyId: string }
  | { type: "emergency" }
  | { type: "vote"; target: VoteTarget }
  | { type: "taskStart"; taskId: TaskId }
  | { type: "taskComplete"; taskId: TaskId }
  | { type: "sabotage"; kind: SabotageKind }
  | { type: "fixLights" }
  | { type: "panel"; panelId: PanelId }
  | { type: "backToLobby" }
  | { type: "vent"; action: "enter" | "exit" }
  | { type: "ventMove"; ventId: VentId }
  | { type: "pet" }
  | { type: "ping"; c: number };

// ---------- Servidor → cliente ----------

export type ErrorCode =
  | "ROOM_NOT_FOUND"
  | "WRONG_PASSWORD"
  | "ROOM_FULL"
  | "GAME_STARTED"
  | "INVALID_NAME"
  | "NAME_TAKEN"
  | "INVALID_PASSWORD"
  | "RATE_LIMITED"
  | "SESSION_EXPIRED"
  | "NOT_ALLOWED"
  | "BAD_REQUEST";

export type ServerMessage =
  | { type: "welcome"; playerId: string; token: string; code: string }
  | { type: "error"; code: ErrorCode; message: string }
  | { type: "state"; state: RoomState; now: number }
  | { type: "snap"; t: number; p: [id: string, x: number, y: number, ghost: 0 | 1][] }
  | { type: "correct"; x: number; y: number }
  | { type: "chat"; message: ChatMessage }
  | { type: "killed"; victimId: string; x: number; y: number }
  | { type: "notice"; text: string }
  | { type: "taskDone"; taskId: TaskId }
  | { type: "kicked" }
  | { type: "pong"; c: number; s: number }
  /** O Júlio baliu (sozinho ou porque alguém fez carinho). */
  | { type: "bleat"; byId: string | null; byName: string | null };

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  ROOM_NOT_FOUND: "Sala não encontrada.",
  WRONG_PASSWORD: "Senha incorreta.",
  ROOM_FULL: "A sala está cheia.",
  GAME_STARTED: "A partida já começou.",
  INVALID_NAME: "Nome inválido. Use de 2 a 16 letras ou números.",
  NAME_TAKEN: "Já existe alguém com esse nome na sala.",
  INVALID_PASSWORD: "A senha precisa ter de 3 a 32 caracteres.",
  RATE_LIMITED: "Muitas tentativas. Aguarde um pouco.",
  SESSION_EXPIRED: "Sua sessão expirou.",
  NOT_ALLOWED: "Ação não permitida.",
  BAD_REQUEST: "Requisição inválida.",
};
