"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CRITICAL_PANELS, ROOMS, taskById } from "@/lib/crew/map";
import type { SabotageKind } from "@/lib/crew/protocol";
import { serverSoundEnabled, setSoundEnabled, soundEnabled, subscribeSound, unlockAudio, vibrate } from "./feedback";
import type { Near } from "./GameScreen";
import { formatClock, useNow } from "./hooks";
import { LobbyPanel } from "./Lobby";
import { Meeting } from "./Meeting";
import type { CrewClient, Snapshot } from "./net";
import { Overlays } from "./Overlays";
import { GhostChat } from "./Chat";

type Props = {
  client: CrewClient;
  snapshot: Snapshot;
  near: Near;
  onJoystick: (x: number, y: number) => void;
  onUse: () => void;
  taskOpen: boolean;
};

export const actionButton =
  "flex flex-col items-center justify-center rounded-full border text-[11px] tracking-[0.18em] select-none touch-manipulation transition-[opacity,transform] active:scale-95";

export function Hud({ client, snapshot, near, onJoystick, onUse, taskOpen }: Props) {
  const state = snapshot.state!;
  const now = useNow(250, client.clockOffset);
  const you = state.you;
  const playing = state.phase === "playing";
  const inGame = state.phase !== "lobby" && state.phase !== "ended";
  const sound = useSyncExternalStore(subscribeSound, soundEnabled, serverSoundEnabled);

  return (
    <>
      {/* Barra superior */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="pointer-events-auto min-w-0">
          {inGame ? <TaskPanel snapshot={snapshot} /> : <RoomBadge code={state.code} count={state.players.length} max={state.settings.maxPlayers} />}
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          {inGame && (
            <span className="hidden border border-paper/15 bg-ink/60 px-2.5 py-1.5 text-[11px] tracking-[0.2em] text-paper/60 backdrop-blur sm:inline">
              {state.code}
            </span>
          )}
          <button
            type="button"
            onClick={() => setSoundEnabled(!sound)}
            aria-label={sound ? "Desligar som" : "Ligar som"}
            className="border border-paper/15 bg-ink/60 px-2.5 py-1.5 text-[11px] tracking-[0.15em] text-paper/70 backdrop-blur"
          >
            SOM {sound ? "ON" : "OFF"}
          </button>
          <LeaveButton client={client} inGame={inGame} />
        </div>
      </div>

      {inGame && <SabotageBanner snapshot={snapshot} now={now} />}

      {playing && !you.alive && (
        <p className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] text-center text-[10px] tracking-[0.3em] text-paper/45">
          MODO FANTASMA
        </p>
      )}

      {(state.phase === "lobby" || playing || state.phase === "ended") && !taskOpen && <Joystick onMove={onJoystick} showIdle={playing} />}

      {playing && !taskOpen && (
        <ActionButtons client={client} snapshot={snapshot} near={near} now={now} onUse={onUse} />
      )}

      {playing && !you.alive && <GhostChat client={client} snapshot={snapshot} />}

      {state.phase === "lobby" && <LobbyPanel client={client} snapshot={snapshot} />}

      {state.phase === "meeting" && <Meeting client={client} snapshot={snapshot} now={now} />}

      <Overlays client={client} snapshot={snapshot} now={now} />
    </>
  );
}

function RoomBadge({ code, count, max }: { code: string; count: number; max: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="flex flex-col items-start border border-paper/15 bg-ink/60 px-3 py-2 text-left backdrop-blur"
    >
      <span className="text-[10px] tracking-[0.3em] text-paper/50">QUAD CREW · SALA</span>
      <span className="text-xl leading-tight font-normal tracking-[0.25em]">{code}</span>
      <span className="text-[10px] tracking-[0.2em] text-paper/50">
        {copied ? "CÓDIGO COPIADO" : `JOGADORES ${count} / ${max}`}
      </span>
    </button>
  );
}

function LeaveButton({ client, inGame }: { client: CrewClient; inGame: boolean }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => client.leave()}
          className="border border-[#ff4d3d] bg-[#ff4d3d] px-2.5 py-1.5 text-[11px] tracking-[0.15em] text-ink"
        >
          SAIR
        </button>
        <button type="button" onClick={() => setConfirm(false)} className="border border-paper/15 bg-ink/60 px-2.5 py-1.5 text-[11px] tracking-[0.15em]">
          FICAR
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => (inGame ? setConfirm(true) : client.leave())}
      aria-label="Sair da sala"
      className="border border-paper/15 bg-ink/60 px-2.5 py-1.5 text-[11px] tracking-[0.15em] text-paper/70 backdrop-blur"
    >
      SAIR
    </button>
  );
}

function TaskPanel({ snapshot }: { snapshot: Snapshot }) {
  const state = snapshot.state!;
  const [open, setOpen] = useState(true);
  const { done, total } = state.tasks;
  const infiltrator = state.you.role === "infiltrator";
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="w-[min(15rem,52vw)] border border-paper/15 bg-ink/70 backdrop-blur">
      <button type="button" onClick={() => setOpen((v) => !v)} className="block w-full px-3 pt-2 pb-2 text-left">
        <span className="flex items-center justify-between text-[10px] tracking-[0.3em] text-paper/60">
          TAREFAS <span>{Math.round(pct)}%</span>
        </span>
        <span className="mt-1.5 block h-1.5 w-full bg-paper/10">
          <span className="block h-full bg-[#2ed47a] transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </span>
      </button>
      {open && (
        <ul className="space-y-1 border-t border-paper/10 px-3 py-2 text-xs">
          {infiltrator && <li className="pb-1 text-[10px] tracking-[0.2em] text-[#ff6a5c]">FINJA FAZER ESTAS TAREFAS</li>}
          {state.you.tasks.map((t) => {
            const station = taskById(t.id);
            const room = ROOMS.find((r) => r.id === station?.room);
            return (
              <li key={t.id} className={`flex justify-between gap-2 ${t.done ? "text-[#2ed47a]" : "text-paper/85"}`}>
                <span className="truncate">{station?.name}</span>
                <span className="shrink-0 text-[10px] tracking-wider text-paper/40">{t.done ? "OK" : room?.name}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SabotageBanner({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const s = snapshot.state!.sabotage;
  let content: React.ReactNode = null;
  if (s.critical) {
    const panels = CRITICAL_PANELS.map((p) => `${p.name.toUpperCase()} ${s.critical!.panels[p.id] ? "✓" : "·"}`).join("   ");
    content = (
      <>
        <span className="text-sm tracking-[0.25em]">SISTEMA OFFLINE · {formatClock(s.critical.endsAt - now)}</span>
        <span className="mt-0.5 text-[11px] tracking-[0.12em] opacity-80">Ative o Servidor (Edição) e o Roteador (Recepção) ao mesmo tempo · {panels}</span>
      </>
    );
  } else if (s.lights) {
    content = (
      <>
        <span className="text-sm tracking-[0.25em]">APAGÃO</span>
        <span className="mt-0.5 text-[11px] tracking-[0.12em] opacity-80">Religue o quadro de luz no CORREDOR</span>
      </>
    );
  } else if (s.doors) {
    const room = ROOMS.find((r) => r.id === s.doors!.room);
    content = (
      <span className="text-[11px] tracking-[0.2em]">
        PORTAS TRANCADAS · {room?.name} · {formatClock(s.doors.until - now)}
      </span>
    );
  }
  if (!content) return null;
  return (
    <div className="pointer-events-none absolute inset-x-3 top-[calc(env(safe-area-inset-top)+6.2rem)] flex flex-col items-center text-center sm:top-[calc(env(safe-area-inset-top)+0.75rem)] sm:inset-x-[20%]">
      <div className="flex animate-[crew-pulse_1.2s_ease-in-out_infinite] flex-col items-center border border-[#ff4d3d]/70 bg-[#ff4d3d]/15 px-4 py-2 text-[#ffb3ab] backdrop-blur">
        {content}
      </div>
    </div>
  );
}

const SABOTAGES: { kind: SabotageKind; label: string; hint: string }[] = [
  { kind: "lights", label: "APAGÃO", hint: "Reduz a visão da equipe" },
  { kind: "critical", label: "SISTEMA OFFLINE", hint: "Crítico · 45s para corrigir" },
  { kind: "doors", label: "PORTAS", hint: "Tranca a sala em que você está" },
];

function ActionButtons({ client, snapshot, near, now, onUse }: { client: CrewClient; snapshot: Snapshot; near: Near; now: number; onUse: () => void }) {
  const state = snapshot.state!;
  const you = state.you;
  const [sabotageOpen, setSabotageOpen] = useState(false);
  const infiltrator = you.role === "infiltrator" && you.alive;
  const killCooldown = Math.max(0, you.killReadyAt - now);
  const sabotageCooldown = Math.max(0, you.sabotageReadyAt - now);
  const sabotageBusy = !!state.sabotage.critical || state.sabotage.lights;

  const useLabel = near.use
    ? near.use.kind === "task"
      ? "TAREFA"
      : near.use.kind === "emergency"
        ? "REUNIÃO"
        : near.use.kind === "lights"
          ? "LUZ"
          : "PAINEL"
    : "USAR";

  // Atalhos de teclado no desktop.
  const handlers = useRef({ onUse, kill: () => {}, report: () => {} });
  const kill = () => {
    if (!near.killId || killCooldown > 0) return;
    client.send({ type: "kill", targetId: near.killId });
    vibrate(40);
  };
  const report = () => {
    if (!near.bodyId) return;
    client.send({ type: "report", bodyId: near.bodyId });
    vibrate([60, 40, 60]);
  };
  useEffect(() => {
    handlers.current = { onUse, kill, report };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.code === "KeyE" || e.code === "Space") {
        e.preventDefault();
        handlers.current.onUse();
      } else if (e.code === "KeyQ") handlers.current.kill();
      else if (e.code === "KeyR") handlers.current.report();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="absolute right-[calc(env(safe-area-inset-right)+0.9rem)] bottom-[calc(env(safe-area-inset-bottom)+1rem)] flex flex-col items-end gap-3">
      {sabotageOpen && infiltrator && (
        <div className="mb-1 w-56 border border-[#ff4d3d]/50 bg-ink/90 backdrop-blur">
          {SABOTAGES.map((s) => (
            <button
              key={s.kind}
              type="button"
              disabled={sabotageCooldown > 0 || sabotageBusy || (s.kind === "doors" && !!state.sabotage.doors)}
              onClick={() => {
                client.send({ type: "sabotage", kind: s.kind });
                setSabotageOpen(false);
                vibrate(20);
              }}
              className="block w-full border-b border-paper/10 px-4 py-3 text-left disabled:opacity-35"
            >
              <span className="block text-xs tracking-[0.2em] text-[#ff8a7e]">{s.label}</span>
              <span className="block text-[11px] text-paper/50">{s.hint}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-3">
        {infiltrator && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setSabotageOpen((v) => !v)}
              className={`${actionButton} h-16 w-16 border-[#ff4d3d]/60 bg-ink/70 text-[#ff8a7e] ${sabotageCooldown > 0 ? "opacity-60" : ""}`}
            >
              {sabotageCooldown > 0 ? <span className="text-lg tracking-normal">{Math.ceil(sabotageCooldown / 1000)}</span> : "SABOTAR"}
            </button>
            <button
              type="button"
              onClick={kill}
              disabled={!near.killId || killCooldown > 0}
              className={`${actionButton} h-20 w-20 border-[#ff4d3d] bg-[#ff4d3d] text-ink disabled:border-[#ff4d3d]/40 disabled:bg-[#ff4d3d]/15 disabled:text-[#ff8a7e]`}
            >
              {killCooldown > 0 ? <span className="text-2xl tracking-normal">{Math.ceil(killCooldown / 1000)}</span> : "ELIMINAR"}
            </button>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {near.bodyId && (
            <button
              type="button"
              onClick={report}
              className={`${actionButton} h-20 w-20 animate-[crew-pulse_0.9s_ease-in-out_infinite] border-[#ffd23d] bg-[#ffd23d] text-ink`}
            >
              REPORTAR
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              onUse();
            }}
            disabled={!near.use}
            className={`${actionButton} h-24 w-24 border-paper bg-paper text-ink disabled:border-paper/25 disabled:bg-ink/50 disabled:text-paper/40`}
          >
            <span className="text-xs">{useLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Joystick virtual: nasce onde o polegar toca na metade esquerda da tela. */
function Joystick({ onMove, showIdle }: { onMove: (x: number, y: number) => void; showIdle: boolean }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const idleOpacity = useRef("0.35");
  useEffect(() => {
    idleOpacity.current = showIdle ? "0.35" : "0";
    if (!origin.current && baseRef.current) baseRef.current.style.opacity = idleOpacity.current;
  }, [showIdle]);
  const RADIUS = 48;

  const place = (x: number, y: number, kx: number, ky: number, active: boolean) => {
    const base = baseRef.current;
    const knob = knobRef.current;
    if (!base || !knob) return;
    base.style.transform = `translate(${x - 56}px, ${y - 56}px)`;
    base.style.opacity = active ? "1" : idleOpacity.current;
    knob.style.transform = `translate(${kx}px, ${ky}px)`;
  };

  useEffect(() => {
    const reset = () => {
      const h = window.innerHeight;
      place(84, h - 130, 0, 0, false);
    };
    reset();
    window.addEventListener("resize", reset);
    return () => window.removeEventListener("resize", reset);
  }, []);

  return (
    <div
      className="absolute bottom-0 left-0 h-[62%] w-[55%] touch-none"
      onPointerDown={(e) => {
        unlockAudio();
        if (origin.current) return;
        origin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        e.currentTarget.setPointerCapture(e.pointerId);
        place(e.clientX, e.clientY, 0, 0, true);
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (!o || o.id !== e.pointerId) return;
        let dx = e.clientX - o.x;
        let dy = e.clientY - o.y;
        const d = Math.hypot(dx, dy);
        if (d > RADIUS) {
          dx = (dx / d) * RADIUS;
          dy = (dy / d) * RADIUS;
        }
        onMove(dx / RADIUS, dy / RADIUS);
        if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }}
      onPointerUp={(e) => {
        if (origin.current?.id !== e.pointerId) return;
        origin.current = null;
        onMove(0, 0);
        place(84, window.innerHeight - 130, 0, 0, false);
      }}
      onPointerCancel={() => {
        origin.current = null;
        onMove(0, 0);
        place(84, window.innerHeight - 130, 0, 0, false);
      }}
    >
      <div
        ref={baseRef}
        className="pointer-events-none fixed top-0 left-0 flex h-28 w-28 items-center justify-center rounded-full border border-paper/25 bg-paper/5 transition-opacity duration-200 [@media(pointer:fine)]:hidden"
      >
        <div ref={knobRef} className="h-12 w-12 rounded-full bg-paper/80 shadow-[0_0_20px_rgba(255,255,255,0.25)]" />
      </div>
    </div>
  );
}
