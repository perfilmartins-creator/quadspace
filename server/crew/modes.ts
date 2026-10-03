// Regras específicas de cada modo de jogo. A sala (room.ts) chama estes handlers
// em vez de espalhar `if (modo === ...)` pelo código.

import { randomInt } from "node:crypto";
import { VISION_BLACKOUT, VISION_CREW, VISION_INFILTRATOR, maxInfiltratorsFor, type GameModeId } from "../../src/lib/crew/constants";
import { TASKS } from "../../src/lib/crew/map";
import type { EndReason, Role } from "../../src/lib/crew/protocol";
import type { Player, Room } from "./room";

export type KillOutcome = "body" | "caught" | "converted";

export type ModeRules = {
  /** Define role/tarefas de cada jogador no início da partida. */
  assignRoles(room: Room, players: Player[], firstTurn: number): void;
  /** Cronômetro da partida (null = sem cronômetro). */
  setupTimer(room: Room, firstTurn: number): void;
  onKill(room: Room, killer: Player, target: Player, now: number): KillOutcome;
  onTaskComplete(room: Room, player: Player, now: number): void;
  /** Vencedor, se a partida acabou. */
  checkWin(room: Room, context: EndReason): { winner: Role; reason: EndReason } | null;
  tick(room: Room, now: number): void;
  speedOf(room: Room, p: Player): number;
  visionOf(room: Room, p: Player): number;
  /** Papel de `target` é público para todos neste modo? */
  publicRole(target: Player): boolean;
};

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function giveTasks(p: Player, count: number) {
  p.tasks = shuffle(TASKS)
    .slice(0, count)
    .map((t) => ({ id: t.id, done: false }));
}

function alive(room: Room, role: Role) {
  return room.playerList.filter((p) => p.role === role && p.alive).length;
}

// ---------- CLÁSSICO ----------

const classic: ModeRules = {
  assignRoles(room, players, firstTurn) {
    const count = Math.min(room.settings.infiltrators, maxInfiltratorsFor(players.length));
    shuffle(players).forEach((p, i) => {
      p.role = i < count ? "infiltrator" : "crew";
      giveTasks(p, room.settings.tasksPerPlayer);
      p.emergencyLeft = room.settings.emergencyPerPlayer;
      p.killReadyAt = firstTurn + 12_000;
      p.sabotageReadyAt = firstTurn + 12_000;
      p.releaseAt = 0;
    });
  },
  setupTimer(room) {
    room.timer = null;
  },
  onKill() {
    return "body";
  },
  onTaskComplete(room, player) {
    if (player.role === "crew") room.checkWin("tasks");
  },
  checkWin(room, context) {
    const list = room.playerList;
    const infiltrators = alive(room, "infiltrator");
    const crew = alive(room, "crew");
    const crewPlayers = list.filter((p) => p.role === "crew");
    const total = crewPlayers.reduce((s, p) => s + p.tasks.length, 0);
    const done = crewPlayers.reduce((s, p) => s + p.tasks.filter((t) => t.done).length, 0);
    if (infiltrators === 0) return { winner: "crew", reason: context === "abandon" ? "abandon" : "votes" };
    if (infiltrators >= crew) return { winner: "infiltrator", reason: context === "abandon" ? "abandon" : "kills" };
    if (total > 0 && done >= total) return { winner: "crew", reason: "tasks" };
    return null;
  },
  tick() {},
  speedOf(room) {
    return room.settings.speed;
  },
  visionOf(room, p) {
    if (p.role === "infiltrator") return VISION_INFILTRATOR;
    return room.sabotage.lights ? VISION_BLACKOUT : VISION_CREW;
  },
  publicRole() {
    return false;
  },
};

// ---------- Modos de perseguição (Hide & Seek / Infecção) ----------

function chaseSpeed(room: Room, p: Player) {
  return p.role === "infiltrator" ? room.settings.hunterSpeed : room.settings.runnerSpeed;
}
function chaseVision(room: Room, p: Player) {
  return p.role === "infiltrator" ? room.settings.hunterVision : room.settings.runnerVision;
}

const hideSeek: ModeRules = {
  assignRoles(room, players, firstTurn) {
    const hunter = players[randomInt(players.length)];
    const releaseAt = firstTurn + room.settings.hideTime * 1000;
    for (const p of players) {
      const isHunter = p === hunter;
      p.role = isHunter ? "infiltrator" : "crew";
      if (isHunter) p.tasks = [];
      else giveTasks(p, room.settings.tasksPerPlayer);
      p.emergencyLeft = 0;
      p.killReadyAt = isHunter ? releaseAt : 0;
      p.sabotageReadyAt = Number.MAX_SAFE_INTEGER;
      p.releaseAt = isHunter ? releaseAt : 0;
    }
  },
  setupTimer(room, firstTurn) {
    const releaseAt = firstTurn + room.settings.hideTime * 1000;
    room.timer = { endsAt: releaseAt + room.settings.matchTime * 1000, releaseAt };
  },
  onKill(room, _killer, target) {
    target.deathKnown = true;
    room.announce(`${target.name} foi pego!`);
    return "caught";
  },
  onTaskComplete(room, player, now) {
    if (player.role !== "crew" || !room.timer) return;
    const bonus = room.settings.taskTimeBonus * 1000;
    if (bonus <= 0) return;
    room.timer = { ...room.timer, endsAt: Math.max(now + 5000, room.timer.endsAt - bonus) };
    room.announce(`Tarefa concluída: -${room.settings.taskTimeBonus}s`);
  },
  checkWin(room) {
    if (alive(room, "infiltrator") === 0) return { winner: "crew", reason: "abandon" };
    if (alive(room, "crew") === 0) return { winner: "infiltrator", reason: "caught" };
    return null;
  },
  tick(room, now) {
    if (room.timer && now >= room.timer.endsAt) room.finish("crew", "time");
  },
  speedOf: chaseSpeed,
  visionOf: chaseVision,
  publicRole(target) {
    return target.role === "infiltrator";
  },
};

const infection: ModeRules = {
  assignRoles(room, players, firstTurn) {
    const first = players[randomInt(players.length)];
    for (const p of players) {
      p.role = p === first ? "infiltrator" : "crew";
      p.tasks = [];
      p.emergencyLeft = 0;
      p.killReadyAt = firstTurn + 3000;
      p.sabotageReadyAt = Number.MAX_SAFE_INTEGER;
      p.releaseAt = 0;
    }
  },
  setupTimer(room, firstTurn) {
    room.timer = { endsAt: firstTurn + room.settings.matchTime * 1000, releaseAt: null };
  },
  onKill(room, _killer, target, now) {
    // Ninguém morre: quem é pego vira infectado e já começa a caçar.
    target.role = "infiltrator";
    target.killReadyAt = now + 3000;
    room.announce(`${target.name} foi infectado!`);
    return "converted";
  },
  onTaskComplete() {},
  checkWin(room) {
    if (alive(room, "infiltrator") === 0) return { winner: "crew", reason: "abandon" };
    if (alive(room, "crew") === 0) return { winner: "infiltrator", reason: "infected" };
    return null;
  },
  tick(room, now) {
    if (room.timer && now >= room.timer.endsAt) room.finish("crew", "time");
  },
  speedOf: chaseSpeed,
  visionOf: chaseVision,
  publicRole() {
    return true;
  },
};

export const MODE_RULES: Record<GameModeId, ModeRules> = {
  classic,
  hide_seek: hideSeek,
  infection,
};
