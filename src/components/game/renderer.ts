// Desenho do QUAD BOUNCE em canvas 2D. Só lê o estado do mundo.

import {
  FIELD_WIDTH,
  PLATFORM_FADE_OUT,
  PLATFORM_THICKNESS,
  PLATFORM_WARNING,
  UNITS_PER_METER,
} from "./config";
import type { World } from "./engine";

export type View = {
  /** Tamanho da área de jogo em pixels CSS. */
  width: number;
  height: number;
  dpr: number;
  fontFamily: string;
  reducedMotion: boolean;
  /** Recorde salvo, em metros (0 = sem recorde). */
  best: number;
};

function white(alpha: number) {
  return `rgba(255,255,255,${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Texto centralizado com espaçamento entre letras (funciona em qualquer navegador). */
function spacedText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
}

export function render(ctx: CanvasRenderingContext2D, world: World, view: View) {
  const { width, height, dpr } = view;
  const ppu = width / FIELD_WIDTH;
  const t = world.time;

  let shakeX = 0;
  let shakeY = 0;
  const sinceShake = t - world.shakeAt;
  if (!view.reducedMotion && sinceShake < 0.2) {
    const mag = 0.55 * ppu * (1 - sinceShake / 0.2);
    shakeX = Math.sin(t * 90) * mag;
    shakeY = Math.cos(t * 77) * mag;
  }

  const sx = (x: number) => x * ppu + shakeX;
  const sy = (y: number) => height - (y - world.cam) * ppu + shakeY;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  drawRuler(ctx, world, view, ppu, sy);

  // Linha do recorde.
  if (view.best > 0 && world.mode !== "attract") {
    const y = sy(world.startBottom + view.best * UNITS_PER_METER);
    if (y > -20 && y < height + 20) {
      ctx.strokeStyle = white(0.35);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(width, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = white(0.5);
      ctx.font = `400 10px ${view.fontFamily}`;
      ctx.textBaseline = "bottom";
      ctx.textAlign = "right";
      ctx.fillText(`BEST ${view.best}`, width - 10, y - 5);
    }
  }

  // Efeito de impacto.
  for (const ring of world.rings) {
    const k = (t - ring.born) / 0.5;
    const e = easeOutCubic(k);
    const half = (ring.w / 2) * (0.5 + 0.9 * e) * ppu;
    const y = sy(ring.y);
    ctx.strokeStyle = white((ring.strong ? 0.6 : 0.35) * (1 - k));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx(ring.x) - half, y + 0.5);
    ctx.lineTo(sx(ring.x) + half, y + 0.5);
    ctx.stroke();
    if (ring.strong) {
      ctx.beginPath();
      ctx.arc(sx(ring.x), y, (2 + 9 * e) * ppu, Math.PI, 0);
      ctx.stroke();
    }
  }

  drawPlatforms(ctx, world, ppu, sx, sy);

  // Partículas do PERFECT.
  for (const p of world.particles) {
    const k = (t - p.born) / p.life;
    const s = p.size * ppu * (1 - k * 0.5);
    ctx.fillStyle = white(1 - k);
    ctx.fillRect(sx(p.x) - s / 2, sy(p.y) - s / 2, s, s);
  }

  drawBall(ctx, world, ppu, sx, sy);

  // Textos de PERFECT.
  ctx.textBaseline = "middle";
  for (const text of world.texts) {
    const k = (t - text.born) / 0.9;
    const appear = easeOutCubic(Math.min(1, k / 0.18));
    const x = Math.min(width - 56, Math.max(56, sx(text.x)));
    const y = sy(text.y + 6 * easeOutCubic(k));
    ctx.fillStyle = white(appear * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4));
    ctx.font = `400 ${Math.round(12 + 2 * appear)}px ${view.fontFamily}`;
    spacedText(ctx, text.text, x, y, 3);
  }

  // Toques recusados: um "x" discreto.
  for (const r of world.rejects) {
    const k = (t - r.born) / 0.35;
    const s = 5;
    const x = sx(r.x);
    const y = sy(r.y);
    ctx.strokeStyle = white(0.45 * (1 - k));
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x + s, y + s);
    ctx.moveTo(x + s, y - s);
    ctx.lineTo(x - s, y + s);
    ctx.stroke();
  }
}

function drawRuler(
  ctx: CanvasRenderingContext2D,
  world: World,
  view: View,
  ppu: number,
  sy: (y: number) => number,
) {
  const { width, height } = view;
  const base = world.startBottom;
  const first = Math.floor((world.cam - base) / UNITS_PER_METER) - 1;
  const last = Math.ceil((world.cam + world.height - base) / UNITS_PER_METER) + 1;

  ctx.lineWidth = 1;
  ctx.font = `300 10px ${view.fontFamily}`;
  ctx.textBaseline = "bottom";
  ctx.textAlign = "left";

  for (let m = first; m <= last; m++) {
    const y = Math.round(sy(base + m * UNITS_PER_METER)) + 0.5;
    if (y < -1 || y > height + 1) continue;
    const major = m % 10 === 0;
    const mid = m % 5 === 0;

    if (major && m >= 0 && world.mode !== "attract") {
      ctx.strokeStyle = white(0.07);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      if (m > 0) {
        ctx.fillStyle = white(0.28);
        ctx.fillText(`${m} m`, 10, y - 4);
      }
    } else {
      const len = (mid ? 2.4 : 1.2) * ppu;
      ctx.strokeStyle = white(mid ? 0.16 : 0.09);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(len, y);
      ctx.moveTo(width - len, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
}

function drawPlatforms(
  ctx: CanvasRenderingContext2D,
  world: World,
  ppu: number,
  sx: (x: number) => number,
  sy: (y: number) => number,
) {
  const t = world.time;
  const thickness = PLATFORM_THICKNESS * ppu;

  for (const p of world.platforms) {
    const age = t - p.born;
    const enter = easeOutCubic(Math.min(1, Math.max(0, age) / 0.12));
    let alpha = 0.4 + 0.6 * enter;
    let scaleX = 0.7 + 0.3 * enter;
    let lifeLeft = 1;

    if (p.removedAt !== null) {
      const k = Math.min(1, (t - p.removedAt) / PLATFORM_FADE_OUT);
      alpha *= 1 - k;
      scaleX *= 1 - 0.12 * k;
      lifeLeft = 0;
    } else if (Number.isFinite(p.life)) {
      lifeLeft = Math.max(0, 1 - age / p.life);
      if (lifeLeft < PLATFORM_WARNING) {
        // Prestes a sumir: perde opacidade e pulsa de leve.
        const k = lifeLeft / PLATFORM_WARNING;
        const pulse = 0.5 + 0.5 * Math.sin(age * 22);
        alpha *= 0.3 + 0.55 * k + 0.15 * pulse;
      }
    }

    const w = p.w * ppu * scaleX;
    const x = sx(p.x) - w / 2;
    const y = sy(p.y) - thickness / 2;

    // Brilho ao nascer e ao receber a bola.
    const glow = Math.max(1 - age / 0.35, 1 - (t - p.lastHitAt) / 0.25, 0);
    if (glow > 0) {
      ctx.shadowColor = white(0.9);
      ctx.shadowBlur = 16 * glow;
    }
    ctx.fillStyle = white(alpha);
    roundRect(ctx, x, y, w, thickness, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    // Linha fina abaixo indicando o tempo restante.
    if (Number.isFinite(p.life) && lifeLeft > 0) {
      const barW = p.w * ppu * lifeLeft;
      ctx.fillStyle = white(0.28 * alpha);
      ctx.fillRect(sx(p.x) - barW / 2, y + thickness + 3, barW, 1);
    }
  }
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  world: World,
  ppu: number,
  sx: (x: number) => number,
  sy: (y: number) => number,
) {
  if (world.mode === "dead") return;
  const { ball } = world;
  const r = ball.r * ppu;
  const x = sx(ball.x);
  const y = sy(ball.y);

  // Compressão leve logo após o quique, ancorada na base da bola.
  const since = world.time - ball.lastBounceAt;
  const squash = since >= 0 && since < 0.16 ? Math.sin((since / 0.16) * Math.PI) * 0.16 : 0;
  const scaleX = 1 + squash;
  const scaleY = 1 - squash;

  const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4.5);
  glow.addColorStop(0, white(0.16));
  glow.addColorStop(1, white(0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);

  ctx.save();
  ctx.translate(x, y + r);
  ctx.scale(scaleX, scaleY);
  ctx.shadowColor = white(0.55);
  ctx.shadowBlur = r * 1.2;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(0, -r, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
