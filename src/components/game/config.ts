// Ajustes do QUAD BOUNCE. Todas as medidas estão em "unidades de mundo":
// a área de jogo tem sempre 100 unidades de largura, independente da tela,
// então a física se comporta igual em qualquer celular ou desktop.

export const FIELD_WIDTH = 100;

/** Quantas unidades de mundo equivalem a 1 metro no placar. */
export const UNITS_PER_METER = 10;

/** Proporção máxima largura/altura da área de jogo (coluna retrato no desktop). */
export const MAX_FIELD_ASPECT = 0.62;

export const BALL_RADIUS = 2.7;

/** Altura que a bola atinge acima da plataforma a cada quique. */
export const BOUNCE_HEIGHT = 46;
/** Duração de um quique completo (subida + descida) no início do jogo, em segundos. */
export const BOUNCE_CYCLE = 1.0;
/** Impulso extra ao acertar o centro da plataforma (PERFECT). */
export const PERFECT_BOOST = 1.06;
/** Fração da meia-largura da plataforma que conta como PERFECT. */
export const PERFECT_ZONE = 0.2;

/** Velocidade horizontal ganha ao quicar na ponta da plataforma. */
export const EDGE_DEFLECTION = 40;
/** Quanto da velocidade horizontal anterior é mantida a cada quique. */
export const HORIZONTAL_CARRY = 0.55;
export const MAX_HORIZONTAL_SPEED = 75;

export const PLATFORM_THICKNESS = 1.4;
export const MAX_PLATFORMS = 3;
export const PLACE_COOLDOWN = 0.2;
/** Folga mínima entre a bola e uma plataforma nova. */
export const PLACE_CLEARANCE = 1;
/** Tempo de fade-out depois que a plataforma deixa de ser sólida. */
export const PLATFORM_FADE_OUT = 0.22;
/** Fração final da vida da plataforma em que ela sinaliza que vai sumir. */
export const PLATFORM_WARNING = 0.35;

/** Plataforma inicial, onde a bola já está quicando na tela de início. */
export const START_PLATFORM_WIDTH = 34;
export const START_PLATFORM_LIFE = 3.2;
/** Altura da plataforma inicial, como fração da altura visível. */
export const START_PLATFORM_LEVEL = 0.26;

/** A câmera passa a seguir a bola quando ela passa desta fração da tela. */
export const CAMERA_ANCHOR = 0.5;

/** Altura (em metros) que define o ritmo da curva de dificuldade. */
export const DIFFICULTY_SCALE_METERS = 180;

export type Difficulty = {
  /** Multiplicador do tempo da física da bola. */
  speed: number;
  /** Velocidade horizontal mínima da bola. */
  drift: number;
  platformWidth: number;
  platformLife: number;
  /** Subida automática da câmera, em unidades por segundo. */
  autoScroll: number;
  /** Rapidez com que a câmera alcança a bola. */
  cameraFollow: number;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Curva de dificuldade: começa em 0 e se aproxima de 1 devagar,
 * sem nunca ficar impossível (todos os valores têm limite).
 * 50 m ≈ 0.24 · 100 m ≈ 0.43 · 200 m ≈ 0.67 · 400 m ≈ 0.89
 */
export function difficultyAt(meters: number): Difficulty {
  const d = 1 - Math.exp(-Math.max(0, meters) / DIFFICULTY_SCALE_METERS);
  return {
    speed: lerp(1, 1.3, d),
    drift: lerp(4, 26, d),
    platformWidth: lerp(28, 17, d),
    platformLife: lerp(2.5, 1.55, d),
    autoScroll: 15 * smoothstep(0.05, 1, d),
    cameraFollow: lerp(5, 8, d),
  };
}
