// Desenho do QUAD CREW em canvas 2D: mapa da QUAD, personagens e efeitos.

import {
  CRITICAL_PANELS,
  DOORS,
  EMERGENCY_POS,
  FURNITURE,
  LIGHTS_PANEL,
  MAP_HEIGHT,
  MAP_WIDTH,
  ROOMS,
  TASKS,
  WALLS,
  type DoorId,
  type Point,
  type Rect,
  type TaskId,
} from "@/lib/crew/map";

// ---------- Cores ----------

function hexToRgb(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
export function shade(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
export function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

const FLOOR = "#1c1612";
const FLOOR_LINE = "rgba(255,220,190,0.045)";
const WALL_FILL = "#d9d7d2";
const WALL_EDGE = "#8f8c86";
const ACCENT_RED = "#ff4d3d";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function center(r: Rect): Point {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

// ---------- Personagem (operador QUAD) ----------

export type CharacterOpts = {
  facing: number;
  walk: number;
  moving: boolean;
  ghost?: boolean;
  alpha?: number;
};

/** Desenha o personagem com os pés em (x, y). */
export function drawCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, hex: string, o: CharacterOpts) {
  const f = o.facing >= 0 ? 1 : -1;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  const bob = o.ghost ? Math.sin(o.walk * 0.6) * 3 - 6 : o.moving ? Math.abs(Math.sin(o.walk)) * -2 : 0;

  if (!o.ghost) {
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 17, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pernas
    const step = o.moving ? Math.sin(o.walk) * 3.5 : 0;
    ctx.fillStyle = shade(hex, -0.45);
    roundRect(ctx, x - 11, y - 11 + step, 9, 11, 3.5);
    ctx.fill();
    roundRect(ctx, x + 2, y - 11 - step, 9, 11, 3.5);
    ctx.fill();
  }

  const top = y - 44 + bob;
  // Corpo
  const grad = ctx.createLinearGradient(0, top, 0, top + 36);
  grad.addColorStop(0, shade(hex, 0.18));
  grad.addColorStop(1, shade(hex, -0.22));
  ctx.fillStyle = grad;
  if (o.ghost) {
    ctx.beginPath();
    ctx.moveTo(x - 15, top + 12);
    ctx.arcTo(x - 15, top, x, top, 12);
    ctx.arcTo(x + 15, top, x + 15, top + 12, 12);
    ctx.lineTo(x + 15, top + 32);
    for (let i = 0; i <= 6; i++) {
      const px = x + 15 - (30 * i) / 6;
      ctx.lineTo(px, top + 32 + (i % 2 === 0 ? 0 : 5) + Math.sin(o.walk + i) * 1.5);
    }
    ctx.closePath();
  } else {
    roundRect(ctx, x - 15, top, 30, 36, 12);
  }
  ctx.fill();

  // Visor com faixa de luz (marca do personagem)
  ctx.fillStyle = "#0b0b0e";
  roundRect(ctx, x - 12 + f * 2, top + 7, 24, 11, 5.5);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  roundRect(ctx, x - 7 + f * 4, top + 11.5, 14, 2.2, 1.1);
  ctx.fill();

  // Antena com luz
  ctx.strokeStyle = shade(hex, -0.35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - f * 7, top + 2);
  ctx.lineTo(x - f * 9, top - 7);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillRect(x - f * 9 - 2, top - 10, 4, 4);

  ctx.restore();
}

/** Personagem desativado (eliminado) com holograma. */
export function drawBody(ctx: CanvasRenderingContext2D, x: number, y: number, hex: string, t: number) {
  ctx.save();
  const gray = shade(hex, -0.55);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(x, y, 24, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Corpo deitado
  ctx.fillStyle = gray;
  roundRect(ctx, x - 22, y - 16, 40, 22, 9);
  ctx.fill();
  ctx.fillStyle = "#050506";
  roundRect(ctx, x + 6, y - 12, 9, 14, 4);
  ctx.fill();
  // Linhas de glitch
  ctx.fillStyle = rgba(hex, 0.5);
  for (let i = 0; i < 3; i++) {
    const gy = y - 14 + ((t * 0.02 + i * 7) % 20);
    ctx.fillRect(x - 24 + Math.sin(t * 0.01 + i) * 3, gy, 44, 1.5);
  }
  // Holograma girando
  const hy = y - 40 + Math.sin(t * 0.004) * 3;
  const w = Math.abs(Math.cos(t * 0.003)) * 9 + 2;
  ctx.fillStyle = rgba(hex, 0.75);
  ctx.beginPath();
  ctx.moveTo(x, hy - 11);
  ctx.lineTo(x + w, hy);
  ctx.lineTo(x, hy + 11);
  ctx.lineTo(x - w, hy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(hex, 0.35);
  ctx.beginPath();
  ctx.moveTo(x, hy + 12);
  ctx.lineTo(x, y - 14);
  ctx.stroke();
  ctx.restore();
}

/** Efeito de eliminação: o personagem se desfaz em pixels (~0.8 s). */
export function drawKillFx(ctx: CanvasRenderingContext2D, x: number, y: number, hex: string, age: number) {
  const k = Math.min(1, age / 800);
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const seed = Math.sin(i * 91.7) * 1000;
    const rx = (seed % 1) * 34 - 17;
    const ry = ((seed * 7) % 1) * 40 - 40;
    const drift = k * (20 + (i % 5) * 9);
    ctx.globalAlpha = (1 - k) * 0.95;
    ctx.fillStyle = i % 3 === 0 ? "#ffffff" : hex;
    const s = 3 + (i % 3);
    ctx.fillRect(x + rx + Math.sign(rx) * drift * 0.6, y + ry - drift, s, s);
  }
  ctx.globalAlpha = (1 - k) * 0.6;
  ctx.fillStyle = "#fff";
  ctx.fillRect(x - 30 * (1 - k), y - 26, 60 * (1 - k), 2);
  ctx.restore();
}

// ---------- Mapa ----------

export type MapScene = {
  time: number;
  closedDoors: readonly DoorId[];
  lights: boolean;
  critical: boolean;
  panels: { servidor: boolean; roteador: boolean } | null;
  pendingTasks: ReadonlySet<TaskId>;
  showEmergency: boolean;
  font: string;
  brand: HTMLImageElement | null;
  lobby: boolean;
};

const TRACKS: { x1: number; y1: number; x2: number; y2: number; spots: number }[] = [
  { x1: 260, y1: 120, x2: 840, y2: 120, spots: 6 },
  { x1: 1080, y1: 260, x2: 1600, y2: 260, spots: 5 },
  { x1: 120, y1: 640, x2: 560, y2: 640, spots: 4 },
  { x1: 720, y1: 640, x2: 1720, y2: 640, spots: 8 },
  { x1: 720, y1: 1000, x2: 1120, y2: 1000, spots: 4 },
  { x1: 1260, y1: 900, x2: 1720, y2: 900, spots: 4 },
];

function drawFloor(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = FLOOR;
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  ctx.strokeStyle = FLOOR_LINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= MAP_WIDTH; x += 64) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MAP_HEIGHT);
  }
  for (let y = 0; y <= MAP_HEIGHT; y += 64) {
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_WIDTH, y);
  }
  ctx.stroke();

  // Recepção: piso mais escuro (parede preta) + tapete listrado
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(1180, 760, 620, 540);
  const rug = { x: 1330, y: 920, w: 240, h: 200 };
  ctx.fillStyle = "#26231f";
  ctx.fillRect(rug.x, rug.y, rug.w, rug.h);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let i = 0; i < rug.h; i += 8) ctx.fillRect(rug.x, rug.y + i, rug.w * (0.4 + 0.6 * Math.abs(Math.sin(i))), 3);

  // Estúdio: fundo infinito branco
  const bd = { x: 330, y: 12, w: 440, h: 300 };
  const g = ctx.createLinearGradient(0, bd.y, 0, bd.y + bd.h);
  g.addColorStop(0, "#f4f2ee");
  g.addColorStop(0.75, "#e2dfd9");
  g.addColorStop(1, "rgba(226,223,217,0)");
  ctx.fillStyle = g;
  ctx.fillRect(bd.x, bd.y, bd.w, bd.h);
  // Barra do rolo de papel
  ctx.fillStyle = "#0e0e0e";
  ctx.fillRect(bd.x - 30, 14, bd.w + 60, 9);
}

function drawTrackLights(ctx: CanvasRenderingContext2D, dim: boolean) {
  for (const t of TRACKS) {
    for (let i = 0; i < t.spots; i++) {
      const k = (i + 0.5) / t.spots;
      const x = t.x1 + (t.x2 - t.x1) * k;
      const y = t.y1 + (t.y2 - t.y1) * k;
      const pool = ctx.createRadialGradient(x, y + 30, 0, x, y + 30, 150);
      pool.addColorStop(0, dim ? "rgba(255,120,90,0.06)" : "rgba(255,196,140,0.13)");
      pool.addColorStop(1, "rgba(255,196,140,0)");
      ctx.fillStyle = pool;
      ctx.fillRect(x - 150, y - 120, 300, 300);
    }
  }
}

function drawTrackRails(ctx: CanvasRenderingContext2D) {
  ctx.lineCap = "round";
  for (const t of TRACKS) {
    ctx.strokeStyle = "#050505";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.lineTo(t.x2, t.y2);
    ctx.stroke();
    for (let i = 0; i < t.spots; i++) {
      const k = (i + 0.5) / t.spots;
      const x = t.x1 + (t.x2 - t.x1) * k;
      const y = t.y1 + (t.y2 - t.y1) * k;
      ctx.fillStyle = "#0a0a0a";
      roundRect(ctx, x - 6, y - 4, 12, 16, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(255,222,180,0.95)";
      ctx.beginPath();
      ctx.arc(x, y + 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.lineCap = "butt";
}

function text(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, size: number, font: string, color: string, align: CanvasTextAlign = "left", weight = 400, lh = 1.12) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * size * lh));
}

function drawDecals(ctx: CanvasRenderingContext2D, s: MapScene) {
  // Logo QUAD no chão do estúdio (reflexo do logo do teto)
  text(ctx, ["QUAD"], 840, 330, 64, s.font, "rgba(255,255,255,0.05)", "center", 400);
  // Estrelas da marca na parede do estúdio
  if (s.brand && s.brand.complete && s.brand.naturalWidth > 0) {
    ctx.globalAlpha = 0.85;
    ctx.drawImage(s.brand, 820, 40, 120, 35);
    ctx.globalAlpha = 1;
  }
  text(ctx, ["Create.", "Focus.", "Work.", "Repeat."], 120, 300, 22, s.font, "rgba(255,255,255,0.32)", "left", 400, 1.0);
  text(ctx, ["WILLKOMMEN", "BEM VINDO", "欢迎光临"], 380, 548, 22, s.font, "rgba(255,255,255,0.34)", "left", 400, 1.05);
  text(ctx, ["Artístico", "evento", "Publicidade", "Filme."], 1480, 330, 18, s.font, "rgba(255,255,255,0.3)", "left", 300, 1.15);

  // Nomes dos ambientes
  for (const room of ROOMS) {
    const c = center(room.rect);
    const y = room.id === "corredor" ? c.y + 30 : c.y + room.rect.h * 0.18;
    ctx.save();
    ctx.font = `400 15px ${s.font}`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    const label = room.name.split("").join(String.fromCharCode(8202));
    ctx.fillText(label, c.x, y);
    ctx.restore();
  }
}

function drawFurniture(ctx: CanvasRenderingContext2D, s: MapScene) {
  for (const f of FURNITURE) {
    const { x, y, w, h } = f.rect;
    const c = center(f.rect);
    switch (f.kind) {
      case "softbox": {
        // tripé
        ctx.strokeStyle = "#8a8a8a";
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + 0.5;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x + Math.cos(a) * 26, c.y + Math.sin(a) * 26);
          ctx.stroke();
        }
        // cabeça octogonal virada para a cadeira
        const hx = c.x + (c.x < 550 ? 22 : -22);
        const hy = c.y - 34;
        ctx.fillStyle = "#0b0b0b";
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          ctx[i === 0 ? "moveTo" : "lineTo"](hx + Math.cos(a) * 40, hy + Math.sin(a) * 40);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = s.lights ? "#3a3632" : "#f5f1e8";
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          ctx[i === 0 ? "moveTo" : "lineTo"](hx + Math.cos(a) * 30, hy + Math.sin(a) * 30);
        }
        ctx.closePath();
        ctx.fill();
        if (!s.lights) {
          const glow = ctx.createRadialGradient(hx, hy, 10, hx, hy, 140);
          glow.addColorStop(0, "rgba(255,248,235,0.18)");
          glow.addColorStop(1, "rgba(255,248,235,0)");
          ctx.fillStyle = glow;
          ctx.fillRect(hx - 140, hy - 140, 280, 280);
        }
        break;
      }
      case "backdrop-chair":
      case "chair": {
        ctx.fillStyle = "#0d0d0d";
        ctx.beginPath();
        ctx.arc(c.x, c.y, w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1d1d1d";
        roundRect(ctx, c.x - w / 2 + 2, c.y - h / 2 - 8, w - 4, 12, 5);
        ctx.fill();
        break;
      }
      case "tripod": {
        ctx.strokeStyle = "#6f6f6f";
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x + Math.cos(a) * 22, c.y + Math.sin(a) * 22);
          ctx.stroke();
        }
        ctx.fillStyle = "#111";
        roundRect(ctx, c.x - 12, c.y - 10, 24, 16, 3);
        ctx.fill();
        ctx.fillStyle = "#2b2b2b";
        ctx.fillRect(c.x - 5, c.y - 18, 10, 8);
        ctx.fillStyle = "rgba(255,60,50,0.9)";
        ctx.fillRect(c.x + 7, c.y - 7, 3, 3);
        break;
      }
      case "mirror": {
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, "#9aa0a6");
        g.addColorStop(0.5, "#eef1f3");
        g.addColorStop(1, "#8c9298");
        ctx.fillStyle = "#0a0a0a";
        roundRect(ctx, x, y, w, h, w / 2);
        ctx.fill();
        ctx.fillStyle = g;
        roundRect(ctx, x + 4, y + 4, w - 8, h - 8, (w - 8) / 2);
        ctx.fill();
        break;
      }
      case "desk": {
        ctx.fillStyle = "#7a3d1f";
        roundRect(ctx, x, y, w, h, 4);
        ctx.fill();
        ctx.strokeStyle = "#0a0a0a";
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
        // monitores com timeline de edição
        const horizontal = w > h;
        const monitors = horizontal ? [x + 90, x + 240] : [y + 110];
        for (const m of monitors) {
          const mx = horizontal ? m : x + 18;
          const my = horizontal ? y + 16 : m;
          const mw = horizontal ? 110 : 18;
          const mh = horizontal ? 18 : 100;
          ctx.fillStyle = "#050505";
          ctx.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
          const sg = horizontal ? ctx.createLinearGradient(mx, 0, mx + mw, 0) : ctx.createLinearGradient(0, my, 0, my + mh);
          sg.addColorStop(0, "#5b3df5");
          sg.addColorStop(0.5, "#e04fd0");
          sg.addColorStop(1, "#3d9bff");
          ctx.globalAlpha = s.lights ? 0.35 : 0.85;
          ctx.fillStyle = sg;
          ctx.fillRect(mx, my, mw, mh);
          ctx.globalAlpha = 1;
        }
        break;
      }
      case "sofa": {
        ctx.fillStyle = "#4e463f";
        roundRect(ctx, x, y, w, h, 14);
        ctx.fill();
        ctx.fillStyle = "#5f564e";
        for (let i = 0; i < 3; i++) {
          roundRect(ctx, x + 28, y + 12 + i * ((h - 24) / 3), w - 38, (h - 24) / 3 - 6, 10);
          ctx.fill();
        }
        break;
      }
      case "beanbag": {
        const g = ctx.createRadialGradient(c.x - 15, c.y - 15, 5, c.x, c.y, w / 2);
        g.addColorStop(0, "#2e2e2e");
        g.addColorStop(1, "#070707");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, w / 2, h / 2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "meeting-table": {
        ctx.fillStyle = "#efeeea";
        roundRect(ctx, x, y, w, h, 6);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(x, y + h - 6, w, 6);
        // botão de reunião
        const pulse = s.showEmergency ? 0.5 + 0.5 * Math.sin(s.time * 0.005) : 0;
        ctx.fillStyle = "#2a2a2a";
        ctx.beginPath();
        ctx.arc(EMERGENCY_POS.x, EMERGENCY_POS.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ACCENT_RED;
        ctx.beginPath();
        ctx.arc(EMERGENCY_POS.x, EMERGENCY_POS.y, 13 + pulse * 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "side-table": {
        ctx.fillStyle = "#efeeea";
        ctx.beginPath();
        ctx.arc(c.x, c.y, w / 2, 0, Math.PI * 2);
        ctx.fill();
        // controles de videogame
        ctx.fillStyle = "#fafafa";
        ctx.strokeStyle = "#bdbdbd";
        ctx.lineWidth = 1;
        for (let i = 0; i < 2; i++) {
          roundRect(ctx, c.x - 15, c.y - 14 + i * 14, 30, 11, 5);
          ctx.fill();
          ctx.stroke();
        }
        break;
      }
      case "table": {
        ctx.fillStyle = "#f1f0ec";
        roundRect(ctx, x, y, w, h, 4);
        ctx.fill();
        ctx.fillStyle = "#151515";
        ctx.fillRect(x + 18, y + 12, 34, 20);
        ctx.fillStyle = "#2b2b2b";
        ctx.fillRect(x + 70, y + 10, 10, 40);
        ctx.fillRect(x + 86, y + 10, 10, 40);
        ctx.fillStyle = "#c33";
        ctx.fillRect(x + 120, y + 18, 46, 14);
        break;
      }
      case "shelf": {
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#3a3a3a";
        for (let i = 0; i < w; i += 46) ctx.fillRect(x + i + 6, y + 8, 30, h - 16);
        break;
      }
      case "chargers": {
        ctx.fillStyle = "#151515";
        roundRect(ctx, x, y, w, h, 4);
        ctx.fill();
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 === 0 ? "#2ed47a" : "#ffd23d";
          ctx.fillRect(x + w - 12, y + 14 + i * 26, 5, 5);
        }
        break;
      }
      case "case": {
        ctx.fillStyle = "#0e0e0e";
        roundRect(ctx, x, y, w, h, 6);
        ctx.fill();
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
        break;
      }
      case "round-table": {
        // cadeiras pretas vazadas
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 5;
        for (const a of [Math.PI * 0.75, Math.PI * 1.75]) {
          ctx.beginPath();
          ctx.arc(c.x + Math.cos(a) * 58, c.y + Math.sin(a) * 58, 17, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = "#0c0c0c";
        ctx.beginPath();
        ctx.arc(c.x, c.y, w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath();
        ctx.arc(c.x - 8, c.y - 8, w / 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "water": {
        ctx.fillStyle = "#f2f2f2";
        roundRect(ctx, x, y, w, h, 6);
        ctx.fill();
        ctx.fillStyle = "#ff4f8b";
        ctx.beginPath();
        ctx.arc(c.x, c.y, w / 2 - 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.arc(c.x - 6, c.y - 6, 7, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "counter": {
        ctx.fillStyle = "#ecebe7";
        roundRect(ctx, x, y, w, h, 4);
        ctx.fill();
        ctx.fillStyle = "#121212";
        roundRect(ctx, x + 18, y + 18, 40, 34, 4);
        ctx.fill();
        ctx.fillStyle = "#6b4a33";
        ctx.beginPath();
        ctx.arc(x + 90, y + 34, 9, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }
}

function drawWalls(ctx: CanvasRenderingContext2D, s: MapScene) {
  for (const w of WALLS) {
    ctx.fillStyle = WALL_FILL;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = WALL_EDGE;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w.x + 0.75, w.y + 0.75, w.w - 1.5, w.h - 1.5);
  }
  // Parede preta da recepção (lado norte)
  ctx.fillStyle = "#101010";
  ctx.fillRect(1540, 748, 260, 24);
  // Porta de entrada com luz vazando
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(1440, 1288, 90, 12);
  const leak = ctx.createLinearGradient(0, 1300, 0, 1230);
  leak.addColorStop(0, "rgba(255,244,220,0.22)");
  leak.addColorStop(1, "rgba(255,244,220,0)");
  ctx.fillStyle = leak;
  ctx.fillRect(1430, 1230, 110, 58);

  for (const d of DOORS) {
    const closed = s.closedDoors.includes(d.id);
    if (!closed) continue;
    ctx.fillStyle = "#1a0b0a";
    ctx.fillRect(d.rect.x, d.rect.y, d.rect.w, d.rect.h);
    ctx.fillStyle = ACCENT_RED;
    const horizontal = d.rect.w > d.rect.h;
    for (let i = 0; i < 6; i++) {
      if (horizontal) ctx.fillRect(d.rect.x + i * (d.rect.w / 6) + 4, d.rect.y + 4, d.rect.w / 12, d.rect.h - 8);
      else ctx.fillRect(d.rect.x + 4, d.rect.y + i * (d.rect.h / 6) + 4, d.rect.w - 8, d.rect.h / 12);
    }
  }
}

function drawStations(ctx: CanvasRenderingContext2D, s: MapScene) {
  const pulse = 0.5 + 0.5 * Math.sin(s.time * 0.006);
  for (const t of TASKS) {
    if (!s.pendingTasks.has(t.id)) continue;
    ctx.strokeStyle = `rgba(255,214,61,${0.35 + 0.45 * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(t.pos.x, t.pos.y, 16 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,214,61,0.9)";
    ctx.beginPath();
    ctx.arc(t.pos.x, t.pos.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Quadro de luz
  ctx.fillStyle = s.lights ? (pulse > 0.5 ? ACCENT_RED : "#5a1712") : "#202020";
  roundRect(ctx, LIGHTS_PANEL.x - 16, LIGHTS_PANEL.y - 22, 32, 22, 3);
  ctx.fill();
  ctx.fillStyle = "#e9e9e9";
  ctx.fillRect(LIGHTS_PANEL.x - 9, LIGHTS_PANEL.y - 16, 4, 9);
  ctx.fillRect(LIGHTS_PANEL.x - 2, LIGHTS_PANEL.y - 16, 4, 9);
  ctx.fillRect(LIGHTS_PANEL.x + 5, LIGHTS_PANEL.y - 16, 4, 9);

  for (const p of CRITICAL_PANELS) {
    const active = s.critical;
    const ok = s.panels?.[p.id] ?? false;
    ctx.fillStyle = active ? (ok ? "#2ed47a" : pulse > 0.5 ? ACCENT_RED : "#5a1712") : "#202020";
    roundRect(ctx, p.pos.x - 14, p.pos.y - 14, 28, 28, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(p.pos.x - 7, p.pos.y - 7, 14, 3);
    ctx.fillRect(p.pos.x - 7, p.pos.y - 1, 14, 3);
    ctx.fillRect(p.pos.x - 7, p.pos.y + 5, 9, 3);
  }
}

export function drawMap(ctx: CanvasRenderingContext2D, s: MapScene) {
  ctx.fillStyle = "#050505";
  ctx.fillRect(-2000, -2000, MAP_WIDTH + 4000, MAP_HEIGHT + 4000);
  drawFloor(ctx);
  drawTrackLights(ctx, s.lights);
  drawDecals(ctx, s);
  drawStations(ctx, s);
  drawFurniture(ctx, s);
  drawWalls(ctx, s);
}

/** Trilhos de luz por cima de tudo (ficam "no teto"). */
export function drawCeiling(ctx: CanvasRenderingContext2D) {
  drawTrackRails(ctx);
}

/** Desenha a névoa fora do campo de visão (canvas separado, em coordenadas de tela). */
export function drawFog(
  fog: CanvasRenderingContext2D,
  width: number,
  height: number,
  polygon: Point[],
  origin: Point,
  radius: number,
  toScreen: (p: Point) => Point,
  zoom: number,
  darkness: number,
) {
  fog.save();
  fog.setTransform(1, 0, 0, 1, 0, 0);
  fog.globalCompositeOperation = "source-over";
  fog.clearRect(0, 0, width, height);
  fog.fillStyle = `rgba(3,3,4,${darkness})`;
  fog.fillRect(0, 0, width, height);
  fog.globalCompositeOperation = "destination-out";
  const o = toScreen(origin);
  const r = radius * zoom;
  const g = fog.createRadialGradient(o.x, o.y, r * 0.55, o.x, o.y, r);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  fog.fillStyle = g;
  fog.beginPath();
  polygon.forEach((p, i) => {
    const sp = toScreen(p);
    if (i === 0) fog.moveTo(sp.x, sp.y);
    else fog.lineTo(sp.x, sp.y);
  });
  fog.closePath();
  fog.fill();
  fog.restore();
}
