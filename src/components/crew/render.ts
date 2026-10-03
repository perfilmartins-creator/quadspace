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
  VENTS,
  WALLS,
  type DoorId,
  type Point,
  type Rect,
  type RoomId,
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
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#16172a";
  const bob = o.ghost ? Math.sin(o.walk * 0.6) * 3 - 6 : o.moving ? Math.abs(Math.sin(o.walk)) * -2.5 : 0;

  if (!o.ghost) {
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pernas
    const step = o.moving ? Math.sin(o.walk) * 4 : 0;
    ctx.fillStyle = shade(hex, -0.3);
    roundRect(ctx, x - 13, y - 13 + step, 11, 13, 4.5);
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, x + 2, y - 13 - step, 11, 13, 4.5);
    ctx.fill();
    ctx.stroke();
  }

  const top = y - 47 + bob;
  // Corpo em formato de cápsula
  ctx.fillStyle = hex;
  if (o.ghost) {
    ctx.beginPath();
    ctx.moveTo(x - 17, top + 15);
    ctx.arcTo(x - 17, top, x, top, 15);
    ctx.arcTo(x + 17, top, x + 17, top + 15, 15);
    ctx.lineTo(x + 17, top + 34);
    for (let i = 0; i <= 6; i++) {
      const px = x + 17 - (34 * i) / 6;
      ctx.lineTo(px, top + 34 + (i % 2 === 0 ? 0 : 6) + Math.sin(o.walk + i) * 1.5);
    }
    ctx.closePath();
  } else {
    roundRect(ctx, x - 17, top, 34, 39, 16);
  }
  ctx.fill();
  ctx.stroke();
  // Sombra lateral (volume)
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x - f * 17 - (f > 0 ? 0 : -9) - 9 * (f > 0 ? 1 : 0), top, 9, 42);
  ctx.restore();

  // Visor de vidro com brilho
  const vx = x - 12 + f * 3;
  const vy = top + 8;
  const glass = ctx.createLinearGradient(0, vy, 0, vy + 14);
  glass.addColorStop(0, "#d6f3ff");
  glass.addColorStop(1, "#5eb3e0");
  ctx.fillStyle = glass;
  roundRect(ctx, vx, vy, 24, 14, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  roundRect(ctx, vx + 4 + (f > 0 ? 8 : 0), vy + 3, 8, 3.5, 1.75);
  ctx.fill();

  // Antena (detalhe próprio do personagem QUAD)
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - f * 8, top + 1);
  ctx.lineTo(x - f * 10, top - 9);
  ctx.stroke();
  ctx.fillStyle = "#ffd23d";
  ctx.beginPath();
  ctx.arc(x - f * 10, top - 11, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

/** Personagem desativado (eliminado) com holograma. */
export function drawBody(ctx: CanvasRenderingContext2D, x: number, y: number, hex: string, t: number) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#16172a";
  ctx.lineWidth = 3;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Corpo desligado, deitado
  ctx.fillStyle = shade(hex, -0.25);
  roundRect(ctx, x - 24, y - 18, 44, 24, 11);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#3a3f55";
  roundRect(ctx, x + 4, y - 14, 12, 15, 5);
  ctx.fill();
  ctx.stroke();
  // Olhos de "desligado"
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 7, y - 10);
  ctx.lineTo(x + 13, y - 4);
  ctx.moveTo(x + 13, y - 10);
  ctx.lineTo(x + 7, y - 4);
  ctx.stroke();
  // Holograma de alerta girando
  const hy = y - 44 + Math.sin(t * 0.004) * 3;
  const w = Math.abs(Math.cos(t * 0.003)) * 10 + 3;
  ctx.fillStyle = "#ffd23d";
  ctx.strokeStyle = "#16172a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, hy - 12);
  ctx.lineTo(x + w, hy);
  ctx.lineTo(x, hy + 12);
  ctx.lineTo(x - w, hy);
  ctx.closePath();
  ctx.fill();
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

type FloorStyle = { base: string; line: string; tile: number; kind: "tile" | "planks" | "checker" | "plate" | "concrete" };

const FLOORS: Record<RoomId, FloorStyle> = {
  estudio: { base: "#cfcbc4", line: "rgba(0,0,0,0.07)", tile: 80, kind: "concrete" },
  edicao: { base: "#b9824f", line: "rgba(60,30,10,0.28)", tile: 28, kind: "planks" },
  lounge: { base: "#c97c52", line: "rgba(90,40,15,0.3)", tile: 64, kind: "tile" },
  corredor: { base: "#8c90a0", line: "rgba(20,20,40,0.22)", tile: 64, kind: "tile" },
  equipamentos: { base: "#6d7f96", line: "rgba(255,255,255,0.08)", tile: 48, kind: "plate" },
  recepcao: { base: "#e4ddd0", line: "#cfc5b4", tile: 48, kind: "checker" },
};

function drawFloor(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#1b1c2b";
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  for (const room of ROOMS) {
    const { x, y, w, h } = room.rect;
    const st = FLOORS[room.id];
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = st.base;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = st.line;
    ctx.fillStyle = st.line;
    ctx.lineWidth = 2;
    if (st.kind === "checker") {
      for (let ty = y; ty < y + h; ty += st.tile)
        for (let tx = x; tx < x + w; tx += st.tile)
          if (((tx - x) / st.tile + (ty - y) / st.tile) % 2 === 0) ctx.fillRect(tx, ty, st.tile, st.tile);
    } else if (st.kind === "planks") {
      for (let ty = y, row = 0; ty < y + h; ty += st.tile, row++) {
        ctx.beginPath();
        ctx.moveTo(x, ty);
        ctx.lineTo(x + w, ty);
        ctx.stroke();
        for (let tx = x + (row % 3) * 60; tx < x + w; tx += 180) {
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx, ty + st.tile);
          ctx.stroke();
        }
      }
    } else if (st.kind === "plate") {
      for (let ty = y; ty < y + h; ty += st.tile)
        for (let tx = x; tx < x + w; tx += st.tile) {
          ctx.fillRect(tx + 10, ty + 14, 10, 4);
          ctx.fillRect(tx + 30, ty + 30, 4, 10);
        }
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      for (let tx = x; tx < x + w; tx += st.tile * 2) {
        ctx.beginPath();
        ctx.moveTo(tx, y);
        ctx.lineTo(tx, y + h);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      for (let tx = x; tx <= x + w; tx += st.tile) {
        ctx.moveTo(tx, y);
        ctx.lineTo(tx, y + h);
      }
      for (let ty = y; ty <= y + h; ty += st.tile) {
        ctx.moveTo(x, ty);
        ctx.lineTo(x + w, ty);
      }
      ctx.stroke();
    }
    // Sombra suave junto às paredes (profundidade)
    const shadow = ctx.createLinearGradient(0, y, 0, y + 40);
    shadow.addColorStop(0, "rgba(0,0,0,0.22)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadow;
    ctx.fillRect(x, y, w, 40);
    ctx.restore();
  }

  // Recepção: tapete listrado
  const rug = { x: 1330, y: 920, w: 240, h: 200 };
  ctx.fillStyle = "#2c2f40";
  roundRect(ctx, rug.x, rug.y, rug.w, rug.h, 10);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = 10; i < rug.h - 10; i += 14) ctx.fillRect(rug.x + 12, rug.y + i, rug.w - 24, 5);

  // Estúdio: fundo infinito branco
  const bd = { x: 330, y: 12, w: 440, h: 300 };
  const g = ctx.createLinearGradient(0, bd.y, 0, bd.y + bd.h);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.8, "#f1efea");
  g.addColorStop(1, "rgba(241,239,234,0)");
  ctx.fillStyle = g;
  ctx.fillRect(bd.x, bd.y, bd.w, bd.h);
  ctx.fillStyle = "#16172a";
  ctx.fillRect(bd.x - 30, 14, bd.w + 60, 10);
}

function drawTrackLights(ctx: CanvasRenderingContext2D, dim: boolean) {
  for (const t of TRACKS) {
    for (let i = 0; i < t.spots; i++) {
      const k = (i + 0.5) / t.spots;
      const x = t.x1 + (t.x2 - t.x1) * k;
      const y = t.y1 + (t.y2 - t.y1) * k;
      const pool = ctx.createRadialGradient(x, y + 30, 0, x, y + 30, 130);
      pool.addColorStop(0, dim ? "rgba(255,90,70,0.05)" : "rgba(255,236,190,0.18)");
      pool.addColorStop(1, "rgba(255,236,190,0)");
      ctx.fillStyle = pool;
      ctx.fillRect(x - 130, y - 100, 260, 260);
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

function outlined(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, size: number, font: string, fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `700 ${size}px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.22;
  ctx.strokeStyle = "#16172a";
  ctx.strokeText(label, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(label, x, y);
  ctx.restore();
}

function drawDecals(ctx: CanvasRenderingContext2D, s: MapScene) {
  // Estrelas da marca na parede do estúdio
  if (s.brand && s.brand.complete && s.brand.naturalWidth > 0) {
    ctx.save();
    ctx.filter = "invert(1)";
    ctx.drawImage(s.brand, 820, 40, 120, 35);
    ctx.restore();
  }
  text(ctx, ["Create.", "Focus.", "Work.", "Repeat."], 120, 300, 22, s.font, "rgba(22,23,42,0.55)", "left", 600, 1.0);
  text(ctx, ["WILLKOMMEN", "BEM VINDO", "欢迎光临"], 380, 548, 22, s.font, "rgba(22,23,42,0.5)", "left", 600, 1.05);
  text(ctx, ["Artístico", "evento", "Publicidade", "Filme."], 1480, 330, 18, s.font, "rgba(22,23,42,0.5)", "left", 600, 1.15);

  // Nomes dos ambientes em letras grossas (como placas no chão)
  for (const room of ROOMS) {
    const c = center(room.rect);
    const y = room.id === "corredor" ? c.y + 34 : c.y + room.rect.h * 0.2;
    outlined(ctx, room.name, c.x, y, 38, s.font, "#f4f1ea", 0.85);
  }
}

function drawFurniture(ctx: CanvasRenderingContext2D, s: MapScene) {
  // Sombra de contato de cada móvel
  for (const f of FURNITURE) {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    roundRect(ctx, f.rect.x + 4, f.rect.y + 6, f.rect.w, f.rect.h, 8);
    ctx.fill();
  }
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
        // botão de reunião (o pulso é desenhado na camada dinâmica)
        ctx.fillStyle = "#2a2a2a";
        ctx.beginPath();
        ctx.arc(EMERGENCY_POS.x, EMERGENCY_POS.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ACCENT_RED;
        ctx.beginPath();
        ctx.arc(EMERGENCY_POS.x, EMERGENCY_POS.y, 13, 0, Math.PI * 2);
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

function drawWalls(ctx: CanvasRenderingContext2D) {
  ctx.lineJoin = "round";
  for (const w of WALLS) {
    // Face frontal (altura) + topo
    ctx.fillStyle = "#2d3044";
    ctx.fillRect(w.x, w.y, w.w, w.h + 10);
    ctx.fillStyle = "#4b5070";
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = "#62688c";
    ctx.fillRect(w.x, w.y, w.w, 4);
    ctx.strokeStyle = "#16172a";
    ctx.lineWidth = 3;
    ctx.strokeRect(w.x, w.y, w.w, w.h + 10);
  }
  // Parede preta da recepção (lado norte)
  ctx.fillStyle = "#0e0f18";
  ctx.fillRect(1540, 748, 260, 24);
  // Porta de entrada com luz vazando
  ctx.fillStyle = "#16172a";
  ctx.fillRect(1440, 1286, 90, 14);
  const leak = ctx.createLinearGradient(0, 1300, 0, 1230);
  leak.addColorStop(0, "rgba(255,244,200,0.35)");
  leak.addColorStop(1, "rgba(255,244,200,0)");
  ctx.fillStyle = leak;
  ctx.fillRect(1430, 1230, 110, 56);
}

function drawDoors(ctx: CanvasRenderingContext2D, s: MapScene) {
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

function drawVents(ctx: CanvasRenderingContext2D) {
  for (const v of VENTS) {
    const { x, y } = v.pos;
    ctx.fillStyle = "#0a0a0a";
    roundRect(ctx, x - 22, y - 14, 44, 28, 4);
    ctx.fill();
    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 21, y - 13, 42, 26);
    ctx.fillStyle = "#2a2a2a";
    for (let i = 0; i < 5; i++) ctx.fillRect(x - 17 + i * 8, y - 9, 4, 18);
  }
}

/**
 * Parte fixa do mapa desenhada uma vez numa imagem (piso, luzes, textos,
 * móveis, paredes, dutos). Só é refeita quando o apagão liga/desliga.
 */
export function buildMapCache(scale: number, s: Pick<MapScene, "lights" | "font" | "brand">) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(MAP_WIDTH * scale);
  canvas.height = Math.round(MAP_HEIGHT * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const scene: MapScene = {
    time: 0,
    closedDoors: [],
    lights: s.lights,
    critical: false,
    panels: null,
    pendingTasks: new Set(),
    showEmergency: false,
    font: s.font,
    brand: s.brand,
    lobby: false,
  };
  drawFloor(ctx);
  drawTrackLights(ctx, s.lights);
  drawDecals(ctx, scene);
  drawVents(ctx);
  drawFurniture(ctx, scene);
  drawWalls(ctx);
  return canvas;
}

/** Parte que muda a cada quadro: tarefas, painéis, botão de reunião, portas. */
export function drawMapDynamic(ctx: CanvasRenderingContext2D, s: MapScene) {
  drawStations(ctx, s);
  if (s.showEmergency) {
    const pulse = 0.5 + 0.5 * Math.sin(s.time * 0.005);
    ctx.strokeStyle = `rgba(255,77,61,${0.25 + 0.35 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(EMERGENCY_POS.x, EMERGENCY_POS.y, 24 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawDoors(ctx, s);
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
  resolution = 1,
) {
  fog.save();
  fog.setTransform(1, 0, 0, 1, 0, 0);
  fog.globalCompositeOperation = "source-over";
  fog.clearRect(0, 0, width, height);
  fog.fillStyle = `rgba(3,3,4,${darkness})`;
  fog.fillRect(0, 0, width, height);
  fog.globalCompositeOperation = "destination-out";
  const scaled = (p: Point) => {
    const sp = toScreen(p);
    return { x: sp.x * resolution, y: sp.y * resolution };
  };
  const o = scaled(origin);
  const r = radius * zoom * resolution;
  const g = fog.createRadialGradient(o.x, o.y, r * 0.55, o.x, o.y, r);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  fog.fillStyle = g;
  fog.beginPath();
  polygon.forEach((p, i) => {
    const sp = scaled(p);
    if (i === 0) fog.moveTo(sp.x, sp.y);
    else fog.lineTo(sp.x, sp.y);
  });
  fog.closePath();
  fog.fill();
  fog.restore();
}

// ---------- Júlio, a cabra ----------

/** Cabra cartoon vista de lado. (x, y) = ponto dos pés. */
export function drawGoat(ctx: CanvasRenderingContext2D, x: number, y: number, o: { facing: number; walk: number; moving: boolean; time: number }) {
  const OUT = "#16172a";
  const swing = o.moving ? Math.sin(o.walk) * 4 : 0;
  const bob = o.moving ? Math.abs(Math.sin(o.walk)) * 1.5 : 0;
  // Parado, abaixa a cabeça para "pastar" de vez em quando.
  const graze = o.moving ? 0 : Math.max(0, Math.sin(o.time * 0.0016)) * 9;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "rgba(10,10,25,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(o.facing >= 0 ? 1 : -1, 1);
  ctx.translate(0, -bob);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;

  // Pernas (as de trás mais escuras)
  const leg = (lx: number, phase: number, back: boolean) => {
    const off = swing * phase;
    ctx.fillStyle = back ? "#cfc6b6" : "#ebe5d8";
    roundRect(ctx, lx - 3 + off, -16, 7, 15, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#3b3330";
    roundRect(ctx, lx - 3 + off, -4, 7, 5, 2);
    ctx.fill();
  };
  leg(-12, -1, true);
  leg(10, 1, true);
  leg(-6, 1, false);
  leg(15, -1, false);

  // Rabinho
  ctx.fillStyle = "#f3efe6";
  ctx.beginPath();
  ctx.moveTo(-20, -30);
  ctx.quadraticCurveTo(-30, -42 + swing * 0.4, -24, -40);
  ctx.quadraticCurveTo(-21, -36, -17, -33);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Corpo
  ctx.fillStyle = "#f3efe6";
  ctx.beginPath();
  ctx.ellipse(0, -26, 23, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Mancha marrom e sombra da barriga
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -26, 21.5, 12.5, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#c9a27a";
  ctx.beginPath();
  ctx.ellipse(-8, -32, 9, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(22,23,42,0.12)";
  ctx.fillRect(-24, -20, 48, 10);
  ctx.restore();

  // Cabeça (desce quando pasta)
  ctx.save();
  ctx.translate(18, -36 + graze);
  ctx.rotate(graze * 0.04);
  // Pescoço
  ctx.fillStyle = "#f3efe6";
  ctx.beginPath();
  ctx.moveTo(-10, 2);
  ctx.lineTo(-2, -6);
  ctx.lineTo(6, 2);
  ctx.lineTo(-2, 14 - graze * 0.5);
  ctx.closePath();
  ctx.fill();
  // Chifres
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.quadraticCurveTo(-6, -22, -14, -18);
  ctx.stroke();
  ctx.strokeStyle = "#c79a62";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  // Orelha
  ctx.fillStyle = "#e2d9c8";
  ctx.beginPath();
  ctx.ellipse(-7, -4, 7, 3.5, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Cabeça
  ctx.fillStyle = "#f3efe6";
  ctx.beginPath();
  ctx.ellipse(4, -2, 11, 9, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Focinho
  ctx.fillStyle = "#f7c9c4";
  ctx.beginPath();
  ctx.ellipse(12, 3, 4.5, 3.5, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = OUT;
  ctx.beginPath();
  ctx.arc(14, 2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // Barbicha
  ctx.fillStyle = "#d9d2c3";
  ctx.beginPath();
  ctx.moveTo(6, 7);
  ctx.lineTo(9, 7);
  ctx.lineTo(6, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Olho
  ctx.fillStyle = OUT;
  ctx.beginPath();
  ctx.arc(6, -5, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(6.8, -5.8, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/** Balão de fala cartoon acima de (x, y). */
export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, font: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `700 15px ${font}`;
  const w = ctx.measureText(label).width + 20;
  const h = 26;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#16172a";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  roundRect(ctx, x - w / 2, y - h - 8, w, h, 12);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 9.5);
  ctx.lineTo(x, y);
  ctx.lineTo(x + 6, y - 9.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 6.5, y - 12, 13, 3);
  ctx.fillStyle = "#16172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y - h / 2 - 8 + 1);
  ctx.restore();
}
