// Modos de jogo: metadados compartilhados (cliente + servidor).
// As regras de cada modo ficam em server/crew/modes.ts; aqui ficam nomes, papéis,
// quais mecânicas existem e quais configurações aparecem no painel.

import type { GameModeId, NumericSettingKey, PresetId, Settings } from "./constants";
import type { Role } from "./protocol";

export type ModeInfo = {
  id: GameModeId;
  name: string;
  tagline: string;
  /** Nome de cada papel neste modo ("crew" = lado da maioria, "infiltrator" = quem elimina). */
  roles: Record<Role, { name: string; plural: string; color: string; goal: string }>;
  /** Mecânicas disponíveis. */
  meetings: boolean;
  sabotage: boolean;
  vents: boolean;
  bodies: boolean;
  timer: boolean;
  /** Rótulo do botão de eliminação. */
  killLabel: string;
  /** Configurações exibidas no painel (as outras ficam ocultas). */
  settings: NumericSettingKey[];
  toggles: ("revealRoleOnEject" | "anonymousVotes")[];
};

export const MODES: Record<GameModeId, ModeInfo> = {
  classic: {
    id: "classic",
    name: "Clássico",
    tagline: "Dedução social: tarefas, reuniões e votação.",
    roles: {
      crew: { name: "Tripulante", plural: "Tripulantes", color: "#4fb6ff", goal: "Complete suas tarefas e encontre o infiltrado." },
      infiltrator: { name: "Infiltrado", plural: "Infiltrados", color: "#ff4d5e", goal: "Elimine a equipe sem ser descoberto." },
    },
    meetings: true,
    sabotage: true,
    vents: true,
    bodies: true,
    timer: false,
    killLabel: "ELIMINAR",
    settings: ["infiltrators", "speed", "killCooldown", "tasksPerPlayer", "discussionTime", "votingTime", "emergencyPerPlayer"],
    toggles: ["revealRoleOnEject", "anonymousVotes"],
  },
  hide_seek: {
    id: "hide_seek",
    name: "Esconde-esconde",
    tagline: "Um caçador, todo mundo correndo. Sem reunião, sem votação.",
    roles: {
      crew: { name: "Fugitivo", plural: "Fugitivos", color: "#3ddc84", goal: "Sobreviva até o tempo acabar. Tarefas tiram segundos do relógio." },
      infiltrator: { name: "Caçador", plural: "Caçadores", color: "#ff4d5e", goal: "Encontre e pegue todos os fugitivos antes do tempo acabar." },
    },
    meetings: false,
    sabotage: false,
    vents: false,
    bodies: false,
    timer: true,
    killLabel: "PEGAR",
    settings: ["matchTime", "hideTime", "hunterSpeed", "runnerSpeed", "killCooldown", "tasksPerPlayer", "taskTimeBonus", "hunterVision", "runnerVision"],
    toggles: [],
  },
  infection: {
    id: "infection",
    name: "Infecção",
    tagline: "Quem é pego vira infectado. Sobreviva até o fim.",
    roles: {
      crew: { name: "Saudável", plural: "Saudáveis", color: "#3ddc84", goal: "Fique longe dos infectados até o tempo acabar." },
      infiltrator: { name: "Infectado", plural: "Infectados", color: "#b6f03d", goal: "Infecte todo mundo antes do tempo acabar." },
    },
    meetings: false,
    sabotage: false,
    vents: false,
    bodies: false,
    timer: true,
    killLabel: "INFECTAR",
    settings: ["matchTime", "hunterSpeed", "runnerSpeed", "killCooldown", "hunterVision", "runnerVision"],
    toggles: [],
  },
};

export function modeOf(settings: Pick<Settings, "gameMode">): ModeInfo {
  return MODES[settings.gameMode] ?? MODES.classic;
}

export const SETTING_LABELS: Record<NumericSettingKey, { label: string; format: (v: number) => string }> = {
  infiltrators: { label: "Infiltrados", format: (v) => String(v) },
  maxPlayers: { label: "Máximo de jogadores", format: (v) => String(v) },
  speed: { label: "Velocidade", format: (v) => `${v.toFixed(2)}x` },
  killCooldown: { label: "Recarga de eliminação", format: (v) => `${v}s` },
  tasksPerPlayer: { label: "Tarefas por jogador", format: (v) => String(v) },
  discussionTime: { label: "Tempo de discussão", format: (v) => `${v}s` },
  votingTime: { label: "Tempo de votação", format: (v) => `${v}s` },
  emergencyPerPlayer: { label: "Reuniões por jogador", format: (v) => String(v) },
  matchTime: { label: "Tempo da partida", format: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}` },
  hideTime: { label: "Tempo para se esconder", format: (v) => `${v}s` },
  hunterSpeed: { label: "Velocidade do caçador", format: (v) => `${v.toFixed(2)}x` },
  runnerSpeed: { label: "Velocidade dos fugitivos", format: (v) => `${v.toFixed(2)}x` },
  hunterVision: { label: "Visão do caçador", format: (v) => String(v) },
  runnerVision: { label: "Visão dos fugitivos", format: (v) => String(v) },
  taskTimeBonus: { label: "Segundos por tarefa", format: (v) => `-${v}s` },
};

/** Presets rápidos: cada um altera várias configurações de uma vez. */
export const PRESETS: { id: Exclude<PresetId, "custom">; name: string; hint: string; values: Partial<Settings> }[] = [
  {
    id: "casual",
    name: "Casual",
    hint: "Mais tempo para conversar",
    values: { speed: 1, killCooldown: 35, tasksPerPlayer: 3, discussionTime: 40, votingTime: 60, matchTime: 180, hideTime: 15, hunterSpeed: 1, runnerSpeed: 1.05 },
  },
  {
    id: "normal",
    name: "Normal",
    hint: "Equilibrado",
    values: { speed: 1, killCooldown: 25, tasksPerPlayer: 4, discussionTime: 20, votingTime: 40, matchTime: 150, hideTime: 10, hunterSpeed: 1.1, runnerSpeed: 1 },
  },
  {
    id: "rapido",
    name: "Rápido",
    hint: "Partidas curtas",
    values: { speed: 1.25, killCooldown: 15, tasksPerPlayer: 3, discussionTime: 10, votingTime: 25, matchTime: 105, hideTime: 8, hunterSpeed: 1.15, runnerSpeed: 1.05 },
  },
  {
    id: "caos",
    name: "Caos",
    hint: "Tudo no máximo",
    values: { speed: 1.5, killCooldown: 10, tasksPerPlayer: 2, discussionTime: 5, votingTime: 20, matchTime: 90, hideTime: 5, hunterSpeed: 1.3, runnerSpeed: 1.2, emergencyPerPlayer: 2 },
  },
];
