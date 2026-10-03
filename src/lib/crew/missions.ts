// Missões do LOBBY (diferentes das tarefas da partida, que ficam em map.ts → TASKS).
// Sistema de objetivos genérico: cada objetivo tem tipo, alvo, progresso e recompensa.

export type ObjectiveType = "ball_hits" | "enter_safe" | "visit_areas" | "goal" | "emote" | "interact" | "walk";

export type LobbyMissionDef = {
  id: string;
  type: ObjectiveType;
  label: string;
  target: number;
  /** XP de lobby (só visual por enquanto, preparado para o futuro). */
  reward: number;
  /** "lobby": sequência fixa. "daily": reservado para a futura MISSÃO DO DIA. */
  scope: "lobby" | "daily";
};

export const LOBBY_MISSIONS: LobbyMissionDef[] = [
  { id: "hit-3", type: "ball_hits", label: "Acerte a bola 3 vezes", target: 3, reward: 50, scope: "lobby" },
  { id: "safe", type: "enter_safe", label: "Entre na Safe Zone", target: 1, reward: 30, scope: "lobby" },
  { id: "emote", type: "emote", label: "Use um emote", target: 1, reward: 30, scope: "lobby" },
  { id: "visit-3", type: "visit_areas", label: "Visite 3 áreas do lobby", target: 3, reward: 50, scope: "lobby" },
  { id: "interact-2", type: "interact", label: "Interaja com 2 objetos", target: 2, reward: 50, scope: "lobby" },
  { id: "goal", type: "goal", label: "Faça um gol", target: 1, reward: 100, scope: "lobby" },
];

/** Missão do dia (arquitetura pronta; ainda não exibida). */
export const DAILY_MISSIONS: LobbyMissionDef[] = [
  { id: "daily-goals", type: "goal", label: "Faça 3 gols", target: 3, reward: 200, scope: "daily" },
];

export type ObjectiveProgress = { id: string; label: string; progress: number; target: number; reward: number; completed: boolean };
