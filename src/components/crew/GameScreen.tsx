"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BASE_SPEED,
  EMERGENCY_RANGE,
  RAT_ID,
  RAT_NAME,
  KILL_RANGE,
  RAT_HIT_RANGE,
  REPORT_RANGE,
  USE_RANGE,
  VENT_RANGE,
  VISION_BLACKOUT,
  VISION_CREW,
  VISION_INFILTRATOR,
  colorHex,
} from "@/lib/crew/constants";
import {
  EMOTES,
  EMOTE_DURATION_MS,
  LOBBY_HEIGHT,
  LOBBY_INTERACT_RANGE,
  LOBBY_OBJECTS,
  LOBBY_SOLIDS,
  LOBBY_WIDTH,
  type LobbyObjectId,
} from "@/lib/crew/lobby";
import { CRITICAL_PANELS, EMERGENCY_POS, LIGHTS_PANEL, MAP_HEIGHT, MAP_WIDTH, TASKS, VENTS, distance, type Point, type TaskId, type VentId } from "@/lib/crew/map";
import { modeOf } from "@/lib/crew/modes";
import { canSee, moveGhost, moveWithCollision, solidsWith, visibilityPolygon, visionSegments } from "@/lib/crew/physics";
import type { RoomState } from "@/lib/crew/protocol";
import { sfx, unlockAudio, vibrate } from "./feedback";
import { Hud, type PanelId } from "./Hud";
import type { CrewClient, Snapshot } from "./net";
import { buildMapCache, drawBody, drawBubble, drawCeiling, drawCharacter, drawFog, drawRat, drawKillFx, drawMapDynamic } from "./render";
import { buildLobbyCache, drawBall, drawLobbyDynamic } from "./render-lobby";
import { TaskModal, type OpenTask } from "./Tasks";

export type UseTarget =
  | { kind: "task"; taskId: TaskId }
  | { kind: "emergency" }
  | { kind: "lights" }
  | { kind: "panel"; panelId: "servidor" | "roteador" }
  | { kind: "rat" }
  | { kind: "object"; objectId: LobbyObjectId };

export type Near = { use: UseTarget | null; killId: string | null; bodyId: string | null; ventId: VentId | null };

const EMPTY_NEAR: Near = { use: null, killId: null, bodyId: null, ventId: null };

/** A névoa é um degradê suave: dá para desenhar em meia resolução. */
const FOG_RESOLUTION = 0.5;
const BALL_ID = "@ball";

function sameNear(a: Near, b: Near) {
  return (
    a.killId === b.killId &&
    a.ventId === b.ventId &&
    a.bodyId === b.bodyId &&
    JSON.stringify(a.use) === JSON.stringify(b.use)
  );
}

export type Input = { joy: Point; keys: Set<string> };

/** Lobby e contagem acontecem no mapa do lobby; o resto, no mapa da partida. */
export function isLobbyScene(state: RoomState) {
  return state.phase === "lobby" || state.phase === "countdown";
}

export function canMove(state: RoomState, now: number) {
  if (isLobbyScene(state) || state.phase === "ended") return true;
  return state.phase === "playing" && now >= state.frozenUntil && now >= state.you.releaseAt && !state.you.vent;
}

/**
 * Câmera adaptativa: usa a área da tela (não só o lado menor), então celular em pé
 * ou deitado enxerga uma área parecida, tablet fica no meio e desktop mais perto.
 */
export function cameraZoom(width: number, height: number) {
  return Math.min(1.6, Math.max(0.6, Math.sqrt(width * height) / 760));
}

type Props = { client: CrewClient; snapshot: Snapshot };

export function GameScreen({ client, snapshot }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fogRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<Input>({ joy: { x: 0, y: 0 }, keys: new Set() });
  const taskOpenRef = useRef(false);
  const [near, setNear] = useState<Near>(EMPTY_NEAR);
  const [openTask, setOpenTask] = useState<OpenTask | null>(null);
  const [panel, setPanel] = useState<PanelId | null>(null);

  useEffect(() => {
    taskOpenRef.current = openTask !== null;
  }, [openTask]);

  // ---------- Loop de jogo e renderização ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    const fogCanvas = fogRef.current;
    const ctx = canvas?.getContext("2d");
    const fog = fogCanvas?.getContext("2d");
    if (!canvas || !fogCanvas || !ctx || !fog) return;

    const font = getComputedStyle(canvas).fontFamily;
    const brand = new Image();
    let mapCache: HTMLCanvasElement | null = null;
    let mapCacheKey = "";
    const invalidateMap = () => {
      mapCache = null;
      mapCacheKey = "";
    };
    brand.onload = invalidateMap;
    brand.src = "/brand/estrelas-branco.png";
    void document.fonts?.ready.then(invalidateMap);

    let raf = 0;
    let last = performance.now();
    let width = 1;
    let height = 1;
    let dpr = 1;
    let facing = 1;
    let walk = 0;
    let moving = false;
    let lastNear = EMPTY_NEAR;
    let seenKills = 0;
    let seenSqueak = 0;
    let ballSpin = 0;
    let lastBall: Point | null = null;
    const seenEmotes = new Map<string, number>();
    const ratAnim = { facing: 1, walk: 0, lastX: 0 };
    const remoteAnim = new Map<string, { facing: number; walk: number; lastX: number }>();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      // 1.5x basta para um jogo em movimento e reduz muito o custo por quadro.
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      fogCanvas.width = Math.round(width * dpr * FOG_RESOLUTION);
      fogCanvas.height = Math.round(height * dpr * FOG_RESOLUTION);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const frame = (nowPerf: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (nowPerf - last) / 1000);
      last = nowPerf;
      const snap = client.getSnapshot();
      const state = snap.state;
      if (!state || !client.localReady) return;
      const serverNow = client.serverNow();
      const you = state.you;
      const lobby = isLobbyScene(state);
      const inGame = state.phase === "playing" || state.phase === "meeting" || state.phase === "ejecting";
      const mode = modeOf(state.settings);
      // Reunião, fim de jogo etc. fecham a tarefa aberta.
      if (taskOpenRef.current && state.phase !== "playing") {
        taskOpenRef.current = false;
        setOpenTask(null);
      }
      const ghost = inGame && !you.alive;
      const closedDoors = state.sabotage.doors?.doors ?? [];

      // Movimento local (predição) ----------------------------------
      let dx = inputRef.current.joy.x;
      let dy = inputRef.current.joy.y;
      const k = inputRef.current.keys;
      if (k.has("ArrowLeft") || k.has("KeyA")) dx -= 1;
      if (k.has("ArrowRight") || k.has("KeyD")) dx += 1;
      if (k.has("ArrowUp") || k.has("KeyW")) dy -= 1;
      if (k.has("ArrowDown") || k.has("KeyS")) dy += 1;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      const allowed = canMove(state, serverNow) && !taskOpenRef.current;
      moving = allowed && len > 0.05;
      if (moving) {
        const speed = BASE_SPEED * you.speed * dt;
        const next = ghost
          ? moveGhost(client.local, dx * speed, dy * speed)
          : moveWithCollision(client.local, dx * speed, dy * speed, lobby ? LOBBY_SOLIDS : solidsWith(closedDoors));
        client.local = next;
        if (Math.abs(dx) > 0.15) facing = dx > 0 ? 1 : -1;
        walk += dt * 14;
        client.syncPosition();
      }
      const me = client.local;

      // Posições interpoladas dos outros jogadores (uma vez por quadro).
      const remote = new Map<string, Point & { moving: boolean }>();
      for (const p of state.players) {
        if (p.id === you.id) continue;
        const pos = client.remotePosition(p.id);
        if (pos) remote.set(p.id, pos);
      }

      // Júlio, o rato (posição interpolada como a de um jogador).
      const rat = client.remotePosition(RAT_ID);
      if (rat) {
        if (Math.abs(rat.x - ratAnim.lastX) > 0.2) ratAnim.facing = rat.x > ratAnim.lastX ? 1 : -1;
        ratAnim.lastX = rat.x;
        if (rat.moving) ratAnim.walk += dt * 11;
      }
      const ball = lobby ? client.remotePosition(BALL_ID) : null;
      if (ball) {
        if (lastBall) ballSpin += (ball.x - lastBall.x) * 0.07 + (ball.y - lastBall.y) * 0.03;
        lastBall = { x: ball.x, y: ball.y };
      } else lastBall = null;

      // Interações próximas ----------------------------------------
      let use: UseTarget | null = null;
      let killId: string | null = null;
      let bodyId: string | null = null;
      let nearObject: LobbyObjectId | null = null;
      if (lobby) {
        let best = LOBBY_INTERACT_RANGE;
        for (const o of LOBBY_OBJECTS) {
          const d = distance(me, o.pos);
          if (d < best) {
            best = d;
            nearObject = o.id;
          }
        }
        if (nearObject) use = { kind: "object", objectId: nearObject };
        else if (rat && distance(me, rat) < RAT_HIT_RANGE) use = { kind: "rat" };
      } else if (state.phase === "playing" && serverNow >= state.frozenUntil) {
        let best = USE_RANGE;
        for (const t of you.tasks) {
          if (t.done) continue;
          const station = TASKS.find((s) => s.id === t.id);
          if (!station) continue;
          const d = distance(me, station.pos);
          if (d < best) {
            best = d;
            use = { kind: "task", taskId: t.id };
          }
        }
        if (you.alive) {
          if (state.sabotage.lights && distance(me, LIGHTS_PANEL) < USE_RANGE + 10) use = { kind: "lights" };
          if (state.sabotage.critical) {
            for (const p of CRITICAL_PANELS) if (distance(me, p.pos) < USE_RANGE + 10) use = { kind: "panel", panelId: p.id };
          }
          if (!use && mode.meetings && you.emergencyLeft > 0 && !state.sabotage.critical && distance(me, EMERGENCY_POS) < EMERGENCY_RANGE - 10) {
            use = { kind: "emergency" };
          }
          let bestBody = REPORT_RANGE - 10;
          for (const b of state.bodies) {
            const d = distance(me, b);
            if (d < bestBody) {
              bestBody = d;
              bodyId = b.id;
            }
          }
          if (you.role === "infiltrator" && serverNow >= you.releaseAt) {
            let bestKill = KILL_RANGE - 8;
            for (const p of state.players) {
              // Parceiros (clássico) e outros infectados/caçadores não são alvo.
              if (p.id === you.id || !p.alive || you.partners.includes(p.id) || p.role === "infiltrator") continue;
              const pos = remote.get(p.id);
              if (!pos || client.tracks.get(p.id)?.ghost) continue;
              const d = distance(me, pos);
              if (d < bestKill) {
                bestKill = d;
                killId = p.id;
              }
            }
          }
          if (!use && rat && !you.vent && distance(me, rat) < RAT_HIT_RANGE) use = { kind: "rat" };
        }
      }
      let ventId: VentId | null = null;
      if (mode.vents && state.phase === "playing" && serverNow >= state.frozenUntil && you.alive && you.role === "infiltrator" && !you.vent) {
        for (const v of VENTS) if (distance(me, v.pos) < VENT_RANGE - 6) ventId = v.id;
      }
      const nextNear: Near = { use, killId, bodyId, ventId };
      if (!sameNear(nextNear, lastNear)) {
        lastNear = nextNear;
        setNear(nextNear);
      }

      // Eliminações vistas -----------------------------------------
      if (client.kills.length > seenKills) {
        seenKills = client.kills.length;
        sfx.kill();
        vibrate([30, 40, 30]);
      }
      client.kills = client.kills.filter((kf) => nowPerf - kf.at < 1000);
      seenKills = client.kills.length;

      // Câmera -------------------------------------------------------
      const zoom = cameraZoom(width, height);
      // Correções do servidor são suavizadas visualmente (sem "tranco").
      const off = client.renderOffset;
      off.x *= Math.exp(-dt * 12);
      off.y *= Math.exp(-dt * 12);
      const view = { x: me.x + off.x, y: me.y + off.y };
      const camX = view.x;
      const camY = view.y - 20;
      const toScreen = (p: Point) => ({
        x: (p.x - camX) * zoom * dpr + (width * dpr) / 2,
        y: (p.y - camY) * zoom * dpr + (height * dpr) / 2,
      });
      ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, (width * dpr) / 2 - camX * zoom * dpr, (height * dpr) / 2 - camY * zoom * dpr);

      const cacheScale = Math.min(1.5, Math.max(1, zoom * dpr));
      const key = lobby ? `lobby-${cacheScale.toFixed(2)}` : `game-${state.sabotage.lights}-${cacheScale.toFixed(2)}`;
      if (!mapCache || key !== mapCacheKey) {
        mapCache = lobby ? buildLobbyCache(cacheScale, font, brand) : buildMapCache(cacheScale, { lights: state.sabotage.lights, font, brand });
        mapCacheKey = key;
      }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#0b0c16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      if (lobby) {
        ctx.drawImage(mapCache, 0, 0, LOBBY_WIDTH, LOBBY_HEIGHT);
        const countdown = state.phase === "countdown" && state.countdownEndsAt ? Math.max(0, Math.ceil((state.countdownEndsAt - serverNow) / 1000)) : null;
        drawLobbyDynamic(ctx, { time: nowPerf, font, nearObject, score: state.lobby.score, countdown });
      } else {
        ctx.drawImage(mapCache, 0, 0, MAP_WIDTH, MAP_HEIGHT);
        const pending = new Set<TaskId>(state.phase === "playing" ? you.tasks.filter((t) => !t.done).map((t) => t.id) : []);
        drawMapDynamic(ctx, {
          time: nowPerf,
          closedDoors,
          lights: state.sabotage.lights,
          critical: !!state.sabotage.critical,
          panels: state.sabotage.critical?.panels ?? null,
          pendingTasks: pending,
          showEmergency: mode.meetings && state.phase === "playing" && you.alive && you.emergencyLeft > 0,
          font,
          brand,
          lobby: false,
        });
      }

      // Visão --------------------------------------------------------
      const segments = visionSegments(closedDoors);
      const classicVision = you.role === "infiltrator" ? VISION_INFILTRATOR : state.sabotage.lights ? VISION_BLACKOUT : VISION_CREW;
      const radius = !inGame || ghost ? 5000 : (you.vision ?? classicVision);
      const visible = (p: Point) => !inGame || ghost || canSee(me, p, radius, segments);

      for (const b of state.bodies) {
        if (visible(b)) drawBody(ctx, b.x, b.y, colorHex(b.color), nowPerf);
      }

      // Bola (no chão, atrás dos personagens) + faíscas dos chutes.
      if (ball) {
        drawBall(ctx, ball.x, ball.y, ballSpin);
        for (const h of client.ballHits) {
          const age = nowPerf - h.at;
          if (age > 260) continue;
          ctx.strokeStyle = `rgba(255,255,255,${(1 - age / 260) * 0.8})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(h.x, h.y, 16 + age * 0.12 * (0.5 + h.power), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      type Drawn = {
        id: string;
        x: number;
        y: number;
        color: string;
        name: string;
        ghost: boolean;
        local: boolean;
        moving: boolean;
        facing: number;
        walk: number;
        red: boolean;
        rat?: boolean;
        badge?: string;
        badgeColor?: string;
      };
      const drawn: Drawn[] = [];
      const ratSeen = !!rat && visible(rat);
      if (rat && ratSeen) {
        drawn.push({ id: RAT_ID, x: rat.x, y: rat.y, color: "white", name: RAT_NAME, ghost: false, local: false, moving: rat.moving, facing: ratAnim.facing, walk: ratAnim.walk, red: false, rat: true });
      }
      const badgeOf = (p: RoomState["players"][number]): { badge?: string; badgeColor?: string } => {
        if (!lobby && state.phase !== "ended") {
          // Na partida, só papéis públicos (caçador / infectado) ganham etiqueta.
          if (state.settings.gameMode !== "classic" && p.role) {
            const info = mode.roles[p.role];
            return { badge: info.name.toUpperCase(), badgeColor: info.color };
          }
          return {};
        }
        if (p.afk) return { badge: "AFK", badgeColor: "#9aa0b4" };
        if (p.ready) return { badge: "✓ READY", badgeColor: "#3ddc84" };
        if (p.isHost) return { badge: "★ HOST", badgeColor: "#ffd23d" };
        return {};
      };
      for (const p of state.players) {
        const isMe = p.id === you.id;
        if (isMe) {
          if (!you.vent) {
            drawn.push({ id: p.id, x: view.x, y: view.y, color: p.color, name: p.name, ghost, local: true, moving, facing, walk, red: you.role === "infiltrator" && mode.id === "classic", ...badgeOf(p) });
          }
          continue;
        }
        const pos = remote.get(p.id);
        if (!pos) continue;
        const remoteGhost = client.tracks.get(p.id)?.ghost ?? false;
        if (remoteGhost && !ghost) continue;
        if (!visible(pos)) continue;
        let anim = remoteAnim.get(p.id);
        if (!anim) {
          anim = { facing: 1, walk: 0, lastX: pos.x };
          remoteAnim.set(p.id, anim);
        }
        if (Math.abs(pos.x - anim.lastX) > 0.2) anim.facing = pos.x > anim.lastX ? 1 : -1;
        anim.lastX = pos.x;
        if (pos.moving) anim.walk += dt * 14;
        drawn.push({
          id: p.id,
          x: pos.x,
          y: pos.y,
          color: p.color,
          name: p.name,
          ghost: remoteGhost,
          local: false,
          moving: pos.moving,
          facing: anim.facing,
          walk: anim.walk,
          red: mode.id === "classic" && p.role === "infiltrator" && you.role === "infiltrator",
          ...badgeOf(p),
        });
      }
      drawn.sort((a, b) => a.y - b.y);
      for (const d of drawn) {
        if (d.rat) {
          // Tremidinha quando apanha.
          const hitAge = client.squeak?.byId ? nowPerf - client.squeak.at : Infinity;
          const shake = hitAge < 260 ? Math.sin(hitAge * 0.12) * 4 * (1 - hitAge / 260) : 0;
          drawRat(ctx, d.x + shake, d.y + 14, { facing: d.facing, walk: d.walk, moving: d.moving, time: nowPerf });
          continue;
        }
        drawCharacter(ctx, d.x, d.y + 14, colorHex(d.color), {
          facing: d.facing,
          walk: d.walk,
          moving: d.moving,
          ghost: d.ghost,
          alpha: d.ghost ? 0.5 : 1,
        });
      }
      for (const kf of client.kills) {
        const victim = state.players.find((p) => p.id === kf.victimId);
        if (visible(kf)) drawKillFx(ctx, kf.x, kf.y + 14, colorHex(victim?.color ?? "white"), nowPerf - kf.at);
      }
      if (!lobby) drawCeiling(ctx);

      // Nomes (+ HOST / READY / AFK / papel público, discretos)
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      for (const d of drawn) {
        ctx.font = `600 14px ${font}`;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        // O rato é baixinho: o nome fica mais perto dele.
        const top = d.rat ? d.y - 28 : d.y - 42;
        ctx.fillText(d.name, d.x + 1, top + 1);
        ctx.fillStyle = d.rat ? "#ffd23d" : d.red ? "#ff6a5c" : d.ghost ? "rgba(255,255,255,0.55)" : "#ffffff";
        ctx.fillText(d.name, d.x, top);
        if (d.badge) {
          ctx.font = `700 10px ${font}`;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillText(d.badge, d.x + 1, d.y - 58 + 1);
          ctx.fillStyle = d.badgeColor ?? "#fff";
          ctx.fillText(d.badge, d.x, d.y - 58);
        }
      }

      // Emotes acima do personagem.
      for (const d of drawn) {
        if (d.rat) continue;
        const e = client.emotes.get(d.id);
        if (!e) continue;
        const age = nowPerf - e.at;
        if (age > EMOTE_DURATION_MS) continue;
        if (seenEmotes.get(d.id) !== e.at) {
          seenEmotes.set(d.id, e.at);
          if (d.local || distance(me, d) < 600) sfx.emote();
        }
        const info = EMOTES.find((x) => x.id === e.emote);
        if (!info) continue;
        const pop = Math.min(1, age / 120);
        drawBubble(ctx, d.x, d.y - (d.badge ? 70 : 60) - pop * 6, `${info.icon} ${info.label}`, font, age > EMOTE_DURATION_MS - 300 ? (EMOTE_DURATION_MS - age) / 300 : 1);
      }

      // Guincho do Júlio: balão + som (mais baixo quanto mais longe).
      const squeak = client.squeak;
      if (squeak && rat) {
        if (squeak.at > seenSqueak) {
          seenSqueak = squeak.at;
          const mine = squeak.byId === you.id;
          const volume = mine ? 1 : ratSeen ? Math.max(0, 1 - distance(me, rat) / 700) : 0;
          if (volume > 0.08) sfx.squeak(volume);
          if (mine) vibrate(25);
        }
        const age = nowPerf - squeak.at;
        if (ratSeen && age < 1800) {
          drawBubble(ctx, rat.x, rat.y - 46 - Math.min(1, age / 150) * 6, squeak.byId ? "AI! Iiic!" : "Iiic!", font, age > 1400 ? (1800 - age) / 400 : 1);
        }
      }

      // Névoa (campo de visão limitado)
      const fw = fogCanvas.width;
      const fh = fogCanvas.height;
      if (inGame && !ghost) {
        const poly = visibilityPolygon(view, radius, segments, 120);
        drawFog(fog, fw, fh, poly, view, radius, toScreen, zoom * dpr, state.sabotage.lights ? 0.96 : 0.9, FOG_RESOLUTION);
      } else {
        fog.setTransform(1, 0, 0, 1, 0, 0);
        fog.clearRect(0, 0, fw, fh);
      }

      // Setas na borda da tela apontando para tarefas, sabotagens e (no lobby) a bola.
      const targets: { p: Point; color: string }[] = [];
      if (state.phase === "playing") {
        for (const t of you.tasks) {
          if (t.done) continue;
          const station = TASKS.find((x) => x.id === t.id);
          if (station) targets.push({ p: station.pos, color: "#ffd23d" });
        }
        if (you.alive && state.sabotage.lights) targets.push({ p: LIGHTS_PANEL, color: "#ff4d3d" });
        if (you.alive && state.sabotage.critical) for (const cp of CRITICAL_PANELS) targets.push({ p: cp.pos, color: "#ff4d3d" });
      } else if (lobby && ball) {
        targets.push({ p: ball, color: "rgba(255,255,255,0.75)" });
      }
      const cx = fw / 2;
      const cy = fh / 2;
      const margin = 26 * dpr * FOG_RESOLUTION;
      for (const target of targets) {
        const sp = toScreen(target.p);
        const x = sp.x * FOG_RESOLUTION;
        const y = sp.y * FOG_RESOLUTION;
        if (x > margin && x < fw - margin && y > margin && y < fh - margin) continue;
        const angle = Math.atan2(y - cy, x - cx);
        const kx = (fw / 2 - margin) / Math.max(0.001, Math.abs(Math.cos(angle)));
        const ky = (fh / 2 - margin) / Math.max(0.001, Math.abs(Math.sin(angle)));
        const r = Math.min(kx, ky);
        const ax = cx + Math.cos(angle) * r;
        const ay = cy + Math.sin(angle) * r;
        const size = 9 * dpr * FOG_RESOLUTION;
        fog.save();
        fog.translate(ax, ay);
        fog.rotate(angle);
        fog.fillStyle = target.color;
        fog.beginPath();
        fog.moveTo(size, 0);
        fog.lineTo(-size * 0.8, -size * 0.75);
        fog.lineTo(-size * 0.8, size * 0.75);
        fog.closePath();
        fog.fill();
        fog.restore();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [client]);

  // ---------- Teclado ----------
  useEffect(() => {
    const keys = inputRef.current.keys;
    const isTyping = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        keys.add(e.code);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const clear = () => keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);

  const state = snapshot.state;

  const setJoystick = useCallback((x: number, y: number) => {
    inputRef.current.joy = { x, y };
  }, []);

  const onUse = useCallback(() => {
    unlockAudio();
    const target = near.use;
    if (!target) return;
    if (target.kind === "emergency") {
      client.send({ type: "emergency" });
      return;
    }
    if (target.kind === "rat") {
      client.send({ type: "hitRat" });
      return;
    }
    if (target.kind === "object") {
      client.send({ type: "interact", objectId: target.objectId });
      // Painéis físicos abrem o painel lateral correspondente.
      if (target.objectId === "modes") setPanel("modes");
      else if (target.objectId === "settings") setPanel("settings");
      else if (target.objectId === "missions") setPanel("missions");
      return;
    }
    if (target.kind === "task") client.send({ type: "taskStart", taskId: target.taskId });
    setOpenTask(target);
  }, [client, near.use]);

  if (!state) return null;

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-label="Mapa da QUAD" />
      <canvas ref={fogRef} className="pointer-events-none absolute inset-0 block h-full w-full transition-opacity duration-500" aria-hidden="true" />
      <Hud
        client={client}
        snapshot={snapshot}
        near={near}
        onJoystick={setJoystick}
        onUse={onUse}
        taskOpen={openTask !== null}
        panel={panel}
        setPanel={setPanel}
      />
      {openTask && state.phase === "playing" && (
        <TaskModal client={client} state={state} task={openTask} onClose={() => setOpenTask(null)} />
      )}
    </div>
  );
}
