// Simulação do QUAD BOUNCE. Sem React e sem canvas: só estado e regras.
// Eixo Y cresce para cima (altura), em unidades de mundo (ver config.ts).

import {
  BALL_RADIUS,
  BOUNCE_CYCLE,
  BOUNCE_HEIGHT,
  CAMERA_ANCHOR,
  EDGE_DEFLECTION,
  FIELD_WIDTH,
  HORIZONTAL_CARRY,
  MAX_HORIZONTAL_SPEED,
  MAX_PLATFORMS,
  PERFECT_BOOST,
  PERFECT_ZONE,
  PLACE_CLEARANCE,
  PLACE_COOLDOWN,
  PLATFORM_FADE_OUT,
  PLATFORM_THICKNESS,
  START_PLATFORM_LEVEL,
  START_PLATFORM_LIFE,
  START_PLATFORM_WIDTH,
  UNITS_PER_METER,
  difficultyAt,
  type Difficulty,
} from "./config";

export type Mode = "attract" | "playing" | "dead";

export type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  lastBounceAt: number;
};

export type Platform = {
  id: number;
  x: number;
  y: number;
  w: number;
  born: number;
  life: number;
  /** Momento em que deixou de ser sólida (expirou ou foi reciclada). */
  removedAt: number | null;
  lastHitAt: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  size: number;
};

export type Ring = { x: number; y: number; w: number; born: number; strong: boolean };
export type FloatingText = { text: string; x: number; y: number; born: number };
export type Reject = { x: number; y: number; born: number };

export type GameEvent =
  | { type: "place" }
  | { type: "reject" }
  | { type: "bounce" }
  | { type: "perfect"; combo: number }
  | { type: "death"; score: number };

export type World = {
  mode: Mode;
  time: number;
  /** Altura visível em unidades (a largura é sempre FIELD_WIDTH). */
  height: number;
  ball: Ball;
  platforms: Platform[];
  particles: Particle[];
  rings: Ring[];
  texts: FloatingText[];
  rejects: Reject[];
  /** Base da tela em coordenadas de mundo. */
  cam: number;
  camTarget: number;
  /** Altura de 0 m: o topo do quique natural na plataforma inicial. */
  startBottom: number;
  bestBottom: number;
  score: number;
  combo: number;
  placements: number;
  lastPlaceAt: number;
  shakeAt: number;
  diff: Difficulty;
  nextId: number;
  events: GameEvent[];
};

const MAX_SUBSTEP = 1 / 240;
const PARTICLE_GRAVITY = 140;

function physics(diff: Difficulty) {
  // Gravidade e impulso derivados da altura e duração do quique;
  // a velocidade escala o tempo sem mudar a altura do quique.
  const s = diff.speed;
  return {
    gravity: ((8 * BOUNCE_HEIGHT) / (BOUNCE_CYCLE * BOUNCE_CYCLE)) * s * s,
    bounce: ((4 * BOUNCE_HEIGHT) / BOUNCE_CYCLE) * s,
  };
}

function platformTop(p: Platform) {
  return p.y + PLATFORM_THICKNESS / 2;
}

export function isSolid(p: Platform, time: number) {
  return p.removedAt === null && time < p.born + p.life;
}

export function createWorld(height: number): World {
  const startY = height * START_PLATFORM_LEVEL;
  const base: Platform = {
    id: 0,
    x: FIELD_WIDTH / 2,
    y: startY,
    w: START_PLATFORM_WIDTH,
    born: 0,
    life: Infinity,
    removedAt: null,
    lastHitAt: -1,
  };
  // Só conta o que a bola sobe além do quique na plataforma inicial.
  const startBottom = startY + PLATFORM_THICKNESS / 2 + BOUNCE_HEIGHT;
  const diff = difficultyAt(0);

  return {
    mode: "attract",
    time: 0,
    height,
    ball: {
      x: FIELD_WIDTH / 2,
      y: startBottom + BALL_RADIUS - BOUNCE_HEIGHT * 0.4,
      vx: 0,
      vy: 0,
      r: BALL_RADIUS,
      lastBounceAt: -1,
    },
    platforms: [base],
    particles: [],
    rings: [],
    texts: [],
    rejects: [],
    cam: 0,
    camTarget: 0,
    startBottom,
    bestBottom: startBottom,
    score: 0,
    combo: 0,
    placements: 0,
    lastPlaceAt: -Infinity,
    shakeAt: -Infinity,
    diff,
    nextId: 1,
    events: [],
  };
}

/** Começa a partida a partir da cena de abertura (a bola já está quicando). */
export function startRun(world: World) {
  if (world.mode !== "attract") return;
  world.mode = "playing";
  const base = world.platforms[0];
  if (base) {
    base.born = world.time;
    base.life = START_PLATFORM_LIFE;
  }
  // Leve deriva lateral desde o início, em direção aleatória.
  world.ball.vx = (Math.random() < 0.5 ? -1 : 1) * world.diff.drift;
}

export function resizeWorld(world: World, height: number) {
  world.height = height;
}

/** Remove os eventos acumulados desde a última leitura. */
export function drainEvents(world: World): GameEvent[] {
  const events = world.events;
  world.events = [];
  return events;
}

export type PlaceResult = "placed" | "cooldown" | "ball" | "inactive";

/** Tenta criar uma plataforma centrada em (x, y), em coordenadas de mundo. */
export function tryPlace(world: World, x: number, y: number): PlaceResult {
  if (world.mode !== "playing") return "inactive";

  const reject = (reason: PlaceResult) => {
    world.rejects.push({ x, y, born: world.time });
    world.events.push({ type: "reject" });
    return reason;
  };

  if (world.time - world.lastPlaceAt < PLACE_COOLDOWN) return reject("cooldown");

  const w = world.diff.platformWidth;
  const cx = Math.min(FIELD_WIDTH - w / 2 - 0.5, Math.max(w / 2 + 0.5, x));

  // Não deixa criar a plataforma em cima da bola.
  const { ball } = world;
  const nearestX = Math.min(cx + w / 2, Math.max(cx - w / 2, ball.x));
  const nearestY = Math.min(y + PLATFORM_THICKNESS / 2, Math.max(y - PLATFORM_THICKNESS / 2, ball.y));
  if (Math.hypot(ball.x - nearestX, ball.y - nearestY) < ball.r + PLACE_CLEARANCE) {
    return reject("ball");
  }

  // Limite de plataformas simultâneas: a mais antiga dá lugar à nova.
  const solid = world.platforms.filter((p) => isSolid(p, world.time));
  if (solid.length >= MAX_PLATFORMS) {
    const oldest = solid.reduce((a, b) => (b.born < a.born ? b : a));
    oldest.removedAt = world.time;
  }

  world.platforms.push({
    id: world.nextId++,
    x: cx,
    y,
    w,
    born: world.time,
    life: world.diff.platformLife,
    removedAt: null,
    lastHitAt: -1,
  });
  world.lastPlaceAt = world.time;
  world.placements += 1;
  world.events.push({ type: "place" });
  return "placed";
}

function bounceOn(world: World, p: Platform, hitX: number, bounceSpeed: number) {
  const { ball, diff } = world;
  const offset = Math.max(-1.2, Math.min(1.2, (hitX - p.x) / (p.w / 2)));
  const playing = world.mode === "playing";
  // A plataforma inicial (id 0) não vale PERFECT: a bola já começa no centro dela.
  const perfect = playing && p.id !== 0 && Math.abs(offset) <= PERFECT_ZONE;

  ball.vy = bounceSpeed * (perfect ? PERFECT_BOOST : 1);
  ball.lastBounceAt = world.time;
  p.lastHitAt = world.time;

  if (!playing) return;

  // Acertar a ponta joga a bola para o lado; o centro estabiliza.
  let vx = ball.vx * HORIZONTAL_CARRY + offset * EDGE_DEFLECTION * diff.speed;
  if (Math.abs(vx) < diff.drift) {
    const sign = Math.sign(vx) || Math.sign(offset) || (Math.random() < 0.5 ? -1 : 1);
    vx = sign * diff.drift;
  }
  ball.vx = Math.max(-MAX_HORIZONTAL_SPEED, Math.min(MAX_HORIZONTAL_SPEED, vx));

  const contactY = platformTop(p);
  world.rings.push({ x: hitX, y: contactY, w: p.w, born: world.time, strong: perfect });

  if (perfect) {
    world.combo += 1;
    world.shakeAt = world.time;
    world.texts.push({
      text: world.combo > 1 ? `PERFECT x${world.combo}` : "PERFECT",
      x: hitX,
      y: contactY + ball.r * 2 + 4,
      born: world.time,
    });
    for (let i = 0; i < 12; i++) {
      const angle = Math.PI * (0.1 + 0.8 * Math.random());
      const speed = 18 + Math.random() * 30;
      world.particles.push({
        x: hitX,
        y: contactY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        born: world.time,
        life: 0.45 + Math.random() * 0.3,
        size: 0.5 + Math.random() * 0.5,
      });
    }
    world.events.push({ type: "perfect", combo: world.combo });
  } else {
    world.combo = 0;
    world.events.push({ type: "bounce" });
  }
}

function stepBall(world: World, dt: number) {
  const { ball } = world;
  const { gravity, bounce } = physics(world.mode === "playing" ? world.diff : difficultyAt(0));
  let remaining = dt;

  while (remaining > 1e-9) {
    const h = Math.min(MAX_SUBSTEP, remaining);
    remaining -= h;

    const x0 = ball.x;
    const y0 = ball.y;
    const vy0 = ball.vy;

    // Procura a plataforma mais alta atravessada de cima para baixo neste passo.
    let hit: Platform | null = null;
    let hitT = Infinity;
    let hitTop = -Infinity;
    for (const p of world.platforms) {
      if (!isSolid(p, world.time)) continue;
      const top = platformTop(p);
      const gap = y0 - ball.r - top;
      if (gap < -1e-6) continue; // bola abaixo do topo: passa por baixo (plataforma de mão única)
      const t = (vy0 + Math.sqrt(vy0 * vy0 + 2 * gravity * Math.max(0, gap))) / gravity;
      if (t > h) continue;
      const xAt = x0 + ball.vx * t;
      const reach = p.w / 2 + ball.r * 0.5;
      if (Math.abs(xAt - p.x) > reach) continue;
      if (top > hitTop) {
        hit = p;
        hitT = t;
        hitTop = top;
      }
    }

    if (hit) {
      ball.x = x0 + ball.vx * hitT;
      ball.y = hitTop + ball.r;
      bounceOn(world, hit, ball.x, bounce);
      const rest = h - hitT;
      ball.x += ball.vx * rest;
      ball.y += ball.vy * rest - 0.5 * gravity * rest * rest;
      ball.vy -= gravity * rest;
    } else {
      ball.x += ball.vx * h;
      ball.y += vy0 * h - 0.5 * gravity * h * h;
      ball.vy -= gravity * h;
    }

    // Paredes laterais.
    if (ball.x < ball.r) {
      ball.x = 2 * ball.r - ball.x;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.x > FIELD_WIDTH - ball.r) {
      ball.x = 2 * (FIELD_WIDTH - ball.r) - ball.x;
      ball.vx = -Math.abs(ball.vx);
    }
  }
}

function stepCamera(world: World, dt: number) {
  const { ball, diff } = world;
  world.camTarget = Math.max(world.camTarget, ball.y - world.height * CAMERA_ANCHOR);
  world.camTarget += diff.autoScroll * dt;
  world.cam += (world.camTarget - world.cam) * (1 - Math.exp(-diff.cameraFollow * dt));
  // Nunca deixa a bola sair pelo topo.
  world.cam = Math.max(world.cam, ball.y + ball.r - world.height * 0.85);
  world.camTarget = Math.max(world.camTarget, world.cam);
}

function stepEffects(world: World, dt: number) {
  const t = world.time;
  for (const p of world.particles) {
    p.vy -= PARTICLE_GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  world.particles = world.particles.filter((p) => t - p.born < p.life);
  world.rings = world.rings.filter((r) => t - r.born < 0.5);
  world.texts = world.texts.filter((x) => t - x.born < 0.9);
  world.rejects = world.rejects.filter((r) => t - r.born < 0.35);

  for (const p of world.platforms) {
    if (p.removedAt === null && t >= p.born + p.life) p.removedAt = p.born + p.life;
  }
  world.platforms = world.platforms.filter(
    (p) => p.removedAt === null || t - p.removedAt < PLATFORM_FADE_OUT,
  );
}

/** Avança a simulação em `dt` segundos (tempo real). */
export function step(world: World, dt: number) {
  world.time += dt;

  if (world.mode !== "dead") stepBall(world, dt);

  if (world.mode === "playing") {
    const { ball } = world;
    world.bestBottom = Math.max(world.bestBottom, ball.y - ball.r);
    world.score = Math.max(0, Math.floor((world.bestBottom - world.startBottom) / UNITS_PER_METER));
    world.diff = difficultyAt(world.score);
    stepCamera(world, dt);

    if (ball.y + ball.r < world.cam) {
      world.mode = "dead";
      world.combo = 0;
      world.events.push({ type: "death", score: world.score });
    }
  }

  stepEffects(world, dt);
}
