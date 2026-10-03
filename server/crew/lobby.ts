// Estado jogável do LOBBY no servidor: bola autoritativa, placar e missões.

import {
  BALL_FRICTION,
  BALL_MAX_SPEED,
  BALL_RADIUS,
  BALL_RESTITUTION,
  BALL_SPAWN,
  BALL_WALLS,
  COURT,
  GOAL_DEPTH,
  GOAL_FREEZE_MS,
  GOALS,
  inRect,
} from "../../src/lib/crew/lobby";
import { LOBBY_MISSIONS, type ObjectiveProgress, type ObjectiveType } from "../../src/lib/crew/missions";
import type { Rect } from "../../src/lib/crew/map";

/** Raio de contato do personagem com a bola. */
const PLAYER_RADIUS = 18;
const SUBSTEPS = 4;
/** Intervalo mínimo entre dois "chutes" do mesmo jogador (evita contar o mesmo contato várias vezes). */
const KICK_COOLDOWN_MS = 180;

export type BallState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lastTouchedBy: string | null;
  lastTouchedAt: number;
  frozenUntil: number;
  /** Desde quando a bola está "presa" (anti-stuck). */
  stuckSince: number;
};

export type Kicker = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lastKickAt: number;
};

export type BallEvents = {
  hits: { kicker: Kicker; power: number }[];
  goal: "red" | "blue" | null;
  /** Último jogador a tocar na bola antes do gol. */
  scorer: string | null;
};

export function newBall(): BallState {
  return { x: BALL_SPAWN.x, y: BALL_SPAWN.y, vx: 0, vy: 0, lastTouchedBy: null, lastTouchedAt: 0, frozenUntil: 0, stuckSince: 0 };
}

export function resetBall(ball: BallState, now: number, freezeMs: number) {
  ball.x = BALL_SPAWN.x;
  ball.y = BALL_SPAWN.y;
  ball.vx = 0;
  ball.vy = 0;
  ball.frozenUntil = now + freezeMs;
  ball.stuckSince = 0;
  ball.lastTouchedBy = null;
}

/** Empurra a bola para fora de um retângulo e rebate a velocidade. Retorna true se colidiu. */
function collideRect(ball: BallState, r: Rect) {
  const cx = Math.max(r.x, Math.min(ball.x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(ball.y, r.y + r.h));
  let dx = ball.x - cx;
  let dy = ball.y - cy;
  let d = Math.hypot(dx, dy);
  if (d >= BALL_RADIUS) return false;
  if (d === 0) {
    // Centro dentro do retângulo: sai pelo lado mais próximo.
    const left = ball.x - r.x;
    const right = r.x + r.w - ball.x;
    const top = ball.y - r.y;
    const bottom = r.y + r.h - ball.y;
    const m = Math.min(left, right, top, bottom);
    dx = m === left ? -1 : m === right ? 1 : 0;
    dy = m === top ? -1 : m === bottom ? 1 : 0;
    d = 1;
  }
  const nx = dx / d;
  const ny = dy / d;
  ball.x = cx + nx * BALL_RADIUS;
  ball.y = cy + ny * BALL_RADIUS;
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= (1 + BALL_RESTITUTION) * vn * nx;
    ball.vy -= (1 + BALL_RESTITUTION) * vn * ny;
  }
  return true;
}

/** Área válida da bola: quadra + bocas dos gols. */
function ballInsideField(ball: BallState) {
  const pad = 2;
  const inCourt = ball.x >= COURT.x - pad && ball.x <= COURT.x + COURT.w + pad && ball.y >= COURT.y - pad && ball.y <= COURT.y + COURT.h + pad;
  const inLeft = inRect(ball, { x: GOALS.left.x - pad, y: GOALS.left.y - pad, w: GOAL_DEPTH + 2 * pad, h: GOALS.left.h + 2 * pad });
  const inRight = inRect(ball, { x: GOALS.right.x - pad, y: GOALS.right.y - pad, w: GOAL_DEPTH + 2 * pad, h: GOALS.right.h + 2 * pad });
  return Number.isFinite(ball.x) && Number.isFinite(ball.y) && (inCourt || inLeft || inRight);
}

/** Avança a física da bola em `dt` segundos. Os chutes vêm dos jogadores fora da Safe Zone. */
export function stepBall(ball: BallState, kickers: Kicker[], now: number, dt: number): BallEvents {
  const events: BallEvents = { hits: [], goal: null, scorer: null };
  if (now < ball.frozenUntil) return events;
  const h = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;

    for (const k of kickers) {
      let dx = ball.x - k.x;
      let dy = ball.y - k.y;
      let d = Math.hypot(dx, dy);
      const min = BALL_RADIUS + PLAYER_RADIUS;
      if (d >= min) continue;
      if (d < 0.001) {
        const sp = Math.hypot(k.vx, k.vy);
        dx = sp > 0 ? k.vx / sp : 1;
        dy = sp > 0 ? k.vy / sp : 0;
        d = 1;
      } else {
        dx /= d;
        dy /= d;
      }
      // Sai de dentro do personagem.
      ball.x = k.x + dx * min;
      ball.y = k.y + dy * min;
      // Rebate na velocidade relativa…
      const rvn = (ball.vx - k.vx) * dx + (ball.vy - k.vy) * dy;
      if (rvn < 0) {
        ball.vx -= 1.6 * rvn * dx;
        ball.vy -= 1.6 * rvn * dy;
      }
      // …e ganha um impulso extra quando o jogador corre na direção da bola.
      const push = k.vx * dx + k.vy * dy;
      if (push > 30 && now - k.lastKickAt > KICK_COOLDOWN_MS) {
        const boost = 140 + push * 0.55;
        ball.vx += dx * boost;
        ball.vy += dy * boost;
        k.lastKickAt = now;
        ball.lastTouchedBy = k.id;
        ball.lastTouchedAt = now;
        events.hits.push({ kicker: k, power: Math.min(1, boost / 420) });
      } else if (rvn < -20) {
        ball.lastTouchedBy = k.id;
        ball.lastTouchedAt = now;
      }
    }

    for (const wall of BALL_WALLS) collideRect(ball, wall);

    // Gol: o centro passou da linha e está dentro da rede.
    if (inRect(ball, GOALS.left) && ball.x < COURT.x - BALL_RADIUS * 0.6) {
      events.goal = "blue";
      break;
    }
    if (inRect(ball, GOALS.right) && ball.x > COURT.x + COURT.w + BALL_RADIUS * 0.6) {
      events.goal = "red";
      break;
    }
  }

  // Atrito e velocidade máxima.
  const f = Math.exp(-BALL_FRICTION * dt);
  ball.vx *= f;
  ball.vy *= f;
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > BALL_MAX_SPEED) {
    ball.vx = (ball.vx / speed) * BALL_MAX_SPEED;
    ball.vy = (ball.vy / speed) * BALL_MAX_SPEED;
  } else if (speed < 4) {
    ball.vx = 0;
    ball.vy = 0;
  }

  // Anti-stuck: fora do campo válido por mais de 1 s → volta ao centro.
  if (!ballInsideField(ball)) {
    if (!ball.stuckSince) ball.stuckSince = now;
    else if (now - ball.stuckSince > 1000) resetBall(ball, now, 600);
  } else ball.stuckSince = 0;

  if (events.goal) {
    events.scorer = ball.lastTouchedBy;
    resetBall(ball, now, GOAL_FREEZE_MS);
  }
  return events;
}

// ---------- Missões ----------

export type MissionTracker = {
  index: number;
  progress: number;
  xp: number;
  visited: Set<string>;
  interacted: Set<string>;
};

export function newMissionTracker(): MissionTracker {
  return { index: 0, progress: 0, xp: 0, visited: new Set(), interacted: new Set() };
}

export function currentMission(t: MissionTracker): ObjectiveProgress | null {
  const def = LOBBY_MISSIONS[t.index];
  if (!def) return null;
  return { id: def.id, label: def.label, progress: Math.min(t.progress, def.target), target: def.target, reward: def.reward, completed: false };
}

/**
 * Registra um evento de missão. `key` identifica áreas/objetos distintos.
 * Retorna a missão concluída (para avisar o jogador) ou null.
 */
export function trackMission(t: MissionTracker, type: ObjectiveType, key?: string) {
  const def = LOBBY_MISSIONS[t.index];
  if (!def || def.type !== type) return null;
  if (type === "visit_areas") {
    if (!key) return null;
    t.visited.add(key);
    t.progress = t.visited.size;
  } else if (type === "interact") {
    if (!key || t.interacted.has(key)) return null;
    t.interacted.add(key);
    t.progress = t.interacted.size;
  } else {
    t.progress += 1;
  }
  if (t.progress < def.target) return { done: null, changed: true };
  t.xp += def.reward;
  t.index += 1;
  t.progress = 0;
  t.visited.clear();
  t.interacted.clear();
  return { done: def, changed: true };
}
