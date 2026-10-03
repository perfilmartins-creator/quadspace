// Desenho do LOBBY da QUAD: escuro e premium, com luz indicando a função de cada área.

import {
  BALL_RADIUS,
  COURT,
  GOALS,
  LOBBY_HEIGHT,
  LOBBY_OBJECTS,
  LOBBY_SPAWN,
  LOBBY_WALLS,
  LOBBY_WIDTH,
  READY_ZONE,
  SAFE_ZONE,
  type LobbyObject,
} from "@/lib/crew/lobby";
import { outlined, roundRect } from "./render";

const INK = "#16172a";

function drawFloor(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#1b1e30";
  ctx.fillRect(0, 0, LOBBY_WIDTH, LOBBY_HEIGHT);
  // Placas do piso com leve variação.
  const size = 100;
  for (let y = 0; y < LOBBY_HEIGHT; y += size) {
    for (let x = 0; x < LOBBY_WIDTH; x += size) {
      const n = ((x * 7 + y * 13) / size) % 3;
      ctx.fillStyle = n < 1 ? "#1e2236" : n < 2 ? "#1c1f33" : "#202439";
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    }
  }
  // Luz ambiente vinda do teto.
  const glow = ctx.createRadialGradient(LOBBY_WIDTH / 2, LOBBY_HEIGHT * 0.55, 80, LOBBY_WIDTH / 2, LOBBY_HEIGHT * 0.55, 820);
  glow.addColorStop(0, "rgba(140,150,255,0.10)");
  glow.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, LOBBY_WIDTH, LOBBY_HEIGHT);
}

function drawCourt(ctx: CanvasRenderingContext2D, font: string) {
  const { x, y, w, h } = COURT;
  // Piso da quadra
  ctx.fillStyle = "#123a3e";
  roundRect(ctx, x - 14, y - 14, w + 28, h + 28, 18);
  ctx.fill();
  ctx.fillStyle = "#15464a";
  for (let i = 0; i < 8; i++) if (i % 2 === 0) ctx.fillRect(x + (w / 8) * i, y, w / 8, h);
  // Linhas
  ctx.strokeStyle = "rgba(235,250,255,0.75)";
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, 62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(235,250,255,0.75)";
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, 6, 0, Math.PI * 2);
  ctx.fill();
  const boxH = 200;
  ctx.strokeRect(x, y + h / 2 - boxH / 2, 90, boxH);
  ctx.strokeRect(x + w - 90, y + h / 2 - boxH / 2, 90, boxH);
  // Mureta da quadra (só a bola enxerga, mas fica visível como borda baixa)
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 10;
  ctx.strokeRect(x - 8, y - 8, w + 16, h + 16);
  // Gols: vermelho à esquerda, azul à direita
  drawGoal(ctx, GOALS.left, "#ff4d5e", -1);
  drawGoal(ctx, GOALS.right, "#4fb6ff", 1);
  outlined(ctx, "QUADRA", x + w / 2, y + h + 46, 30, font, "#c9f5ff", 0.9);
}

function drawGoal(ctx: CanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number }, color: string, side: -1 | 1) {
  ctx.save();
  ctx.fillStyle = "rgba(10,12,22,0.75)";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // Rede
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1.5;
  for (let i = 8; i < r.h; i += 12) {
    ctx.beginPath();
    ctx.moveTo(r.x, r.y + i);
    ctx.lineTo(r.x + r.w, r.y + i);
    ctx.stroke();
  }
  for (let i = 8; i < r.w; i += 12) {
    ctx.beginPath();
    ctx.moveTo(r.x + i, r.y);
    ctx.lineTo(r.x + i, r.y + r.h);
    ctx.stroke();
  }
  // Traves
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  const front = side < 0 ? r.x + r.w : r.x;
  const back = side < 0 ? r.x : r.x + r.w;
  ctx.beginPath();
  ctx.moveTo(front, r.y);
  ctx.lineTo(back, r.y);
  ctx.lineTo(back, r.y + r.h);
  ctx.lineTo(front, r.y + r.h);
  ctx.stroke();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(front, r.y);
  ctx.lineTo(front, r.y + r.h);
  ctx.stroke();
  ctx.restore();
}

function drawSafeZone(ctx: CanvasRenderingContext2D, font: string) {
  const { x, y, r } = SAFE_ZONE;
  const g = ctx.createRadialGradient(x, y, 10, x, y, r);
  g.addColorStop(0, "rgba(120,230,255,0.28)");
  g.addColorStop(0.75, "rgba(120,230,255,0.12)");
  g.addColorStop(1, "rgba(120,230,255,0.02)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.setLineDash([18, 12]);
  ctx.strokeStyle = "rgba(160,240,255,0.85)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Pufes para descansar
  for (const [ox, oy, c] of [
    [-55, 30, "#5b6bd6"],
    [40, 45, "#d65b9a"],
  ] as const) {
    ctx.fillStyle = "rgba(10,10,25,0.3)";
    ctx.beginPath();
    ctx.ellipse(x + ox, y + oy + 14, 26, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x + ox, y + oy, 24, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  outlined(ctx, "SAFE ZONE", x, y - 34, 30, font, "#c9f5ff");
}

function drawReadyZone(ctx: CanvasRenderingContext2D, font: string) {
  const { x, y, w, h } = READY_ZONE;
  ctx.fillStyle = "rgba(61,220,132,0.12)";
  roundRect(ctx, x, y, w, h, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(61,220,132,0.9)";
  ctx.lineWidth = 5;
  roundRect(ctx, x, y, w, h, 22);
  ctx.stroke();
  // Faixas de "pista" no chão
  ctx.strokeStyle = "rgba(61,220,132,0.22)";
  ctx.lineWidth = 3;
  for (let i = 1; i < 4; i++) {
    roundRect(ctx, x + i * 18, y + i * 18, w - i * 36, h - i * 36, 16);
    ctx.stroke();
  }
  outlined(ctx, "READY", x + w / 2, y + h / 2 - 6, 40, font, "#3ddc84");
  outlined(ctx, "fique aqui 1s", x + w / 2, y + h / 2 + 30, 18, font, "#c9ffe0", 0.85);
}

function drawSpawn(ctx: CanvasRenderingContext2D, font: string, brand: HTMLImageElement | null) {
  const cx = LOBBY_SPAWN.x + LOBBY_SPAWN.w / 2;
  const cy = LOBBY_SPAWN.y + LOBBY_SPAWN.h / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 3;
  for (const r of [70, 125]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (brand && brand.complete && brand.naturalWidth > 0) {
    const w = 120;
    const h = (brand.naturalHeight / brand.naturalWidth) * w;
    ctx.globalAlpha = 0.25;
    ctx.drawImage(brand, cx - w / 2, cy - h / 2, w, h);
    ctx.globalAlpha = 1;
  }
  outlined(ctx, "QUAD", cx, cy + 128, 26, font, "#ffffff", 0.35);
}

function drawObject(ctx: CanvasRenderingContext2D, o: LobbyObject, font: string) {
  const { x, y, w, h } = o.rect;
  ctx.fillStyle = "rgba(10,10,25,0.35)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 6, w * 0.55, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  const accent =
    o.id === "modes" ? "#9b6bff" : o.id === "settings" ? "#4fb6ff" : o.id === "missions" ? "#ffd23d" : o.id === "coffee" ? "#c9a27a" : o.id === "ready" ? "#3ddc84" : "#ff6fb5";
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  if (o.id === "tv") {
    // TV larga na parede de cima
    ctx.fillStyle = "#0b0c16";
    roundRect(ctx, x, y, w, h + 30, 6);
    ctx.fill();
    ctx.stroke();
    return;
  }
  if (o.id === "coffee") {
    ctx.fillStyle = "#3a3f66";
    roundRect(ctx, x, y - 30, w, h + 30, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#16172a";
    roundRect(ctx, x + 12, y - 18, w - 24, 22, 4);
    ctx.fill();
    ctx.fillStyle = "#f3efe6";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 22, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (o.id === "ready") {
    ctx.fillStyle = "#24304a";
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Totem com tela
    ctx.fillStyle = "#2d3044";
    roundRect(ctx, x, y - 34, w, h + 34, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#0b0c16";
    roundRect(ctx, x + 8, y - 26, w - 16, 40, 6);
    ctx.fill();
  }
  if (o.id !== "ready") outlined(ctx, o.label, o.pos.x, o.rect.y - 50, 20, font, accent);
}

function drawWalls(ctx: CanvasRenderingContext2D) {
  for (const w of LOBBY_WALLS) {
    ctx.fillStyle = "#2d3044";
    ctx.fillRect(w.x, w.y, w.w, w.h + 10);
    ctx.fillStyle = "#4b5070";
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(w.x, w.y, w.w, w.h + 10);
  }
}

/** Parte estática do lobby, renderizada uma vez num canvas fora da tela. */
export function buildLobbyCache(scale: number, font: string, brand: HTMLImageElement | null) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(LOBBY_WIDTH * scale);
  canvas.height = Math.round(LOBBY_HEIGHT * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  drawFloor(ctx);
  drawSpawn(ctx, font, brand);
  drawCourt(ctx, font);
  drawSafeZone(ctx, font);
  drawReadyZone(ctx, font);
  for (const o of LOBBY_OBJECTS) drawObject(ctx, o, font);
  drawWalls(ctx);
  return canvas;
}

/** Elementos animados do lobby: telas, brilhos e destaque do objeto próximo. */
export function drawLobbyDynamic(
  ctx: CanvasRenderingContext2D,
  s: { time: number; font: string; nearObject: string | null; score: { red: number; blue: number }; countdown: number | null },
) {
  const t = s.time;
  // Telas dos totens
  for (const o of LOBBY_OBJECTS) {
    const { x, y, w, h } = o.rect;
    if (o.id === "tv") {
      const g = ctx.createLinearGradient(x, y, x + w, y);
      const hue = (t * 0.02) % 360;
      g.addColorStop(0, `hsl(${hue},70%,35%)`);
      g.addColorStop(1, `hsl(${(hue + 80) % 360},70%,30%)`);
      ctx.fillStyle = g;
      ctx.fillRect(x + 6, y + 6, w - 12, h + 18);
      ctx.save();
      ctx.font = `700 16px ${s.font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      const msg = s.countdown !== null ? `PARTIDA EM ${s.countdown}` : `AZUL ${s.score.blue} × ${s.score.red} VERMELHO`;
      ctx.fillText(msg, x + w / 2, y + h / 2 + 8);
      ctx.restore();
    } else if (o.id === "modes" || o.id === "settings" || o.id === "missions") {
      const color = o.id === "modes" ? "155,107,255" : o.id === "settings" ? "79,182,255" : "255,210,61";
      const pulse = 0.55 + 0.35 * Math.sin(t * 0.003 + x);
      ctx.fillStyle = `rgba(${color},${pulse})`;
      ctx.fillRect(x + 12, y - 22, w - 24, 32);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 18, y - 16 + i * 9, (w - 36) * (0.4 + 0.6 * ((Math.sin(t * 0.002 + i) + 1) / 2)), 3);
    }
    if (s.nearObject === o.id) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(t * 0.008)})`;
      ctx.lineWidth = 4;
      roundRect(ctx, x - 8, (o.id === "tv" || o.id === "ready" ? y : y - 42) - 4, w + 16, h + (o.id === "tv" || o.id === "ready" ? 8 : 50), 12);
      ctx.stroke();
      ctx.restore();
    }
  }
  // Brilho da READY ZONE
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.004);
  ctx.strokeStyle = `rgba(61,220,132,${0.25 + 0.35 * pulse})`;
  ctx.lineWidth = 10;
  roundRect(ctx, READY_ZONE.x - 6, READY_ZONE.y - 6, READY_ZONE.w + 12, READY_ZONE.h + 12, 26);
  ctx.stroke();
  // Respiração da SAFE ZONE
  ctx.strokeStyle = `rgba(160,240,255,${0.15 + 0.2 * pulse})`;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(SAFE_ZONE.x, SAFE_ZONE.y, SAFE_ZONE.r + 6, 0, Math.PI * 2);
  ctx.stroke();
}

/** Bola de futebol estilizada; `spin` é a rotação acumulada pela distância percorrida. */
export function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, spin: number) {
  const r = BALL_RADIUS;
  ctx.fillStyle = "rgba(10,10,25,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.85, r * 0.95, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#f6f6f2";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.rotate(spin);
  ctx.fillStyle = "#16172a";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.4, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
