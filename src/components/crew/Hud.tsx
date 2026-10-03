"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CRITICAL_PANELS, ROOMS, VENTS, roomAt, taskById } from "@/lib/crew/map";
import type { SabotageKind } from "@/lib/crew/protocol";
import { CharacterIcon } from "./CharacterIcon";
import { GhostChat } from "./Chat";
import { serverSoundEnabled, setSoundEnabled, soundEnabled, subscribeSound, unlockAudio, vibrate } from "./feedback";
import type { Near } from "./GameScreen";
import { formatClock, useNow } from "./hooks";
import { IconBolt, IconHand, IconKnife, IconMap, IconMegaphone, IconMenu, IconVent } from "./icons";
import { LobbyPanel } from "./Lobby";
import { MapOverlay } from "./MapOverlay";
import { Meeting } from "./Meeting";
import type { CrewClient, Snapshot } from "./net";
import { Overlays } from "./Overlays";
import { panel, toyButton } from "./ui";

type Props = {
  client: CrewClient;
  snapshot: Snapshot;
  near: Near;
  onJoystick: (x: number, y: number) => void;
  onUse: () => void;
  taskOpen: boolean;
};

/** Ignora atalhos enquanto o jogador digita. */
function typing(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
}

export function Hud({ client, snapshot, near, onJoystick, onUse, taskOpen }: Props) {
  const state = snapshot.state!;
  const now = useNow(250, client.clockOffset);
  const you = state.you;
  const playing = state.phase === "playing";
  const inGame = state.phase !== "lobby" && state.phase !== "ended";
  const [mapOpen, setMapOpen] = useState(false);
  const canMap = inGame && state.phase !== "meeting";

  // M abre/fecha o mapa.
  const canMapRef = useRef(canMap);
  useEffect(() => {
    canMapRef.current = canMap;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.code !== "KeyM" || !canMapRef.current) return;
      setMapOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Barra superior */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.6rem)]">
        <div className="pointer-events-auto flex min-w-0 flex-col gap-2">
          {inGame ? (
            <>
              <PlayerCard snapshot={snapshot} />
              <MissionsPanel snapshot={snapshot} />
            </>
          ) : (
            <RoomBadge code={state.code} count={state.players.length} max={state.settings.maxPlayers} />
          )}
        </div>
        <div className="pointer-events-auto flex shrink-0 items-start gap-2">
          {canMap && (
            <SquareButton label="Mapa" hint="M" onClick={() => setMapOpen(true)}>
              <IconMap className="h-6 w-6" />
            </SquareButton>
          )}
          <MenuButton client={client} inGame={inGame} />
        </div>
      </div>

      {inGame && <SabotageBanner snapshot={snapshot} now={now} />}

      {playing && !you.alive && (
        <p className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] text-center text-xs font-semibold tracking-[0.2em] text-white/60 [text-shadow:0_2px_0_#16172a]">
          👻 MODO FANTASMA · termine suas tarefas
        </p>
      )}

      {(state.phase === "lobby" || playing || state.phase === "ended") && !taskOpen && <Joystick onMove={onJoystick} showIdle={playing} />}

      {playing && !taskOpen && <ActionButtons client={client} snapshot={snapshot} near={near} now={now} onUse={onUse} />}

      {playing && !you.alive && <GhostChat client={client} snapshot={snapshot} />}

      {state.phase === "lobby" && <LobbyPanel client={client} snapshot={snapshot} />}

      {state.phase === "meeting" && <Meeting client={client} snapshot={snapshot} now={now} />}

      {mapOpen && canMap && <MapOverlay client={client} state={state} onClose={() => setMapOpen(false)} />}

      <Overlays client={client} snapshot={snapshot} now={now} />
    </>
  );
}

function SquareButton({ label, hint, onClick, active = false, children }: { label: string; hint?: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={hint ? `${label} (${hint})` : label}
      className={`${toyButton} h-12 w-12 flex-col gap-0 text-white ${active ? "bg-[#4fb6ff] text-[#16172a]" : "bg-[#3a3f66]"}`}
    >
      {children}
      <span className="text-[9px] leading-none font-semibold">{label}</span>
    </button>
  );
}

function PlayerCard({ snapshot }: { snapshot: Snapshot }) {
  const state = snapshot.state!;
  const you = state.you;
  const me = state.players.find((p) => p.id === you.id);
  const infiltrator = you.role === "infiltrator";
  const { done, total } = state.tasks;
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className={`${panel} flex w-[min(16rem,52vw)] items-center gap-2.5 p-2`}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[3px] border-[#16172a] bg-[#cfe9ff]">
        <CharacterIcon color={me?.color ?? "white"} size={40} ghost={!you.alive} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-tight font-semibold text-white">{me?.name ?? "Você"}</span>
        <span
          className={`mt-0.5 inline-block rounded-md px-1.5 text-[10px] leading-4 font-semibold tracking-wider ${infiltrator ? "bg-[#ff4d5e] text-white" : "bg-[#3ddc84] text-[#16172a]"}`}
        >
          {infiltrator ? "INFILTRADO" : "TRIPULANTE"}
          {!you.alive && " · FANTASMA"}
        </span>
        <span className="mt-1 block h-2.5 w-full overflow-hidden rounded-full border-2 border-[#16172a] bg-[#15172b]">
          <span className="block h-full rounded-full bg-[#3ddc84] transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </span>
      </span>
    </div>
  );
}

function MissionsPanel({ snapshot }: { snapshot: Snapshot }) {
  const state = snapshot.state!;
  const [open, setOpen] = useState(true);
  const infiltrator = state.you.role === "infiltrator";
  const mine = state.you.tasks;
  const doneMine = mine.filter((t) => t.done).length;
  return (
    <div className={`${panel} w-[min(16rem,52vw)] overflow-hidden`}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-3 py-1.5 text-left">
        <span className="text-sm font-semibold text-[#ffd23d]">Missões</span>
        <span className="text-xs font-semibold text-white/60">
          {doneMine}/{mine.length} {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <ul className="space-y-1 border-t-2 border-[#16172a] px-3 py-2 text-[13px] leading-tight">
          {infiltrator && <li className="pb-0.5 text-[11px] font-semibold text-[#ff8a95]">Finja fazer estas tarefas</li>}
          {mine.map((t) => {
            const station = taskById(t.id);
            const room = ROOMS.find((r) => r.id === station?.room);
            return (
              <li key={t.id} className={`flex items-center gap-1.5 ${t.done ? "text-[#3ddc84] line-through decoration-2" : "text-white"}`}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${t.done ? "bg-[#3ddc84]" : "bg-[#ffd23d]"}`} />
                <span className="truncate">
                  {room?.name}: {station?.name}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
      className={`${panel} flex flex-col items-start px-3 py-2 text-left`}
    >
      <span className="text-[11px] font-semibold text-white/60">Código da sala</span>
      <span className="text-2xl leading-tight font-bold tracking-[0.2em] text-[#ffd23d]">{code}</span>
      <span className="text-[11px] font-semibold text-white/60">{copied ? "Código copiado!" : `${count} / ${max} jogadores · toque p/ copiar`}</span>
    </button>
  );
}

function MenuButton({ client, inGame }: { client: CrewClient; inGame: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const sound = useSyncExternalStore(subscribeSound, soundEnabled, serverSoundEnabled);
  const close = () => {
    setOpen(false);
    setConfirm(false);
  };
  const item = "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white hover:bg-white/10";
  return (
    <div className="relative">
      <SquareButton label="Menu" onClick={() => (open ? close() : setOpen(true))} active={open}>
        <IconMenu className="h-6 w-6" />
      </SquareButton>
      {open && (
        <div className={`${panel} absolute top-[3.6rem] right-0 z-40 w-52 p-1.5 animate-[crew-fade_0.12s_ease-out_both]`}>
          <button type="button" className={item} onClick={() => setSoundEnabled(!sound)}>
            Som <span className={sound ? "text-[#3ddc84]" : "text-white/40"}>{sound ? "Ligado" : "Mudo"}</span>
          </button>
          <button
            type="button"
            className={item}
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen?.();
              else void document.documentElement.requestFullscreen?.().catch(() => {});
              close();
            }}
          >
            Tela cheia <span className="text-white/40">⛶</span>
          </button>
          {confirm ? (
            <div className="mt-1 flex gap-1.5 p-1">
              <button type="button" onClick={() => client.leave()} className={`${toyButton} flex-1 bg-[#ff4d5e] py-2 text-sm text-white`}>
                Sair
              </button>
              <button type="button" onClick={() => setConfirm(false)} className={`${toyButton} flex-1 bg-[#3a3f66] py-2 text-sm text-white`}>
                Ficar
              </button>
            </div>
          ) : (
            <button type="button" className={`${item} text-[#ff8a95]`} onClick={() => (inGame ? setConfirm(true) : client.leave())}>
              Sair da sala <span>→</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SabotageBanner({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const s = snapshot.state!.sabotage;
  let content: React.ReactNode = null;
  if (s.critical) {
    const panels = CRITICAL_PANELS.map((p) => `${p.name} ${s.critical!.panels[p.id] ? "✓" : "·"}`).join("   ");
    content = (
      <>
        <span className="text-base font-bold">⚠ SISTEMA OFFLINE · {formatClock(s.critical.endsAt - now)}</span>
        <span className="mt-0.5 text-xs font-semibold opacity-90">Ative o Servidor (Edição) e o Roteador (Recepção) juntos · {panels}</span>
      </>
    );
  } else if (s.lights) {
    content = (
      <>
        <span className="text-base font-bold">💡 APAGÃO</span>
        <span className="mt-0.5 text-xs font-semibold opacity-90">Religue o quadro de luz no Corredor</span>
      </>
    );
  } else if (s.doors) {
    const room = ROOMS.find((r) => r.id === s.doors!.room);
    content = (
      <span className="text-sm font-bold">
        🔒 Portas trancadas · {room?.name} · {formatClock(s.doors.until - now)}
      </span>
    );
  }
  if (!content) return null;
  return (
    <div className="pointer-events-none absolute inset-x-3 top-[calc(env(safe-area-inset-top)+10rem)] flex flex-col items-center text-center sm:inset-x-[24%] sm:top-[calc(env(safe-area-inset-top)+0.6rem)]">
      <div className="flex animate-[crew-pulse_1.2s_ease-in-out_infinite] flex-col items-center rounded-2xl border-[3px] border-[#16172a] bg-[#ff4d5e] px-4 py-2 text-white shadow-[0_4px_0_#16172a]">
        {content}
      </div>
    </div>
  );
}

const SABOTAGES: { kind: SabotageKind; label: string; hint: string }[] = [
  { kind: "lights", label: "Apagão", hint: "Reduz a visão da equipe" },
  { kind: "critical", label: "Sistema offline", hint: "Crítico · 45s para corrigir" },
  { kind: "doors", label: "Trancar portas", hint: "Tranca a sala em que você está" },
];

/** Botão de ação grande, colorido, com ícone, rótulo e tecla de atalho. */
function ActionButton({
  label,
  hint,
  color,
  text = "text-[#16172a]",
  size = "h-[4.6rem] w-[4.6rem]",
  disabled = false,
  cooldown = 0,
  pulse = false,
  onClick,
  children,
}: {
  label: string;
  hint: string;
  color: string;
  text?: string;
  size?: string;
  disabled?: boolean;
  cooldown?: number;
  pulse?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${toyButton} relative ${size} flex-col gap-0.5 ${color} ${text} ${pulse ? "animate-[crew-pulse_0.9s_ease-in-out_infinite]" : ""}`}
    >
      {cooldown > 0 ? <span className="text-3xl leading-none font-bold">{Math.ceil(cooldown / 1000)}</span> : children}
      <span className="text-[11px] leading-none font-bold">{label}</span>
      <span className="absolute -top-2 -right-2 hidden h-5 min-w-5 items-center justify-center rounded-md border-2 border-[#16172a] bg-white px-1 text-[10px] font-bold text-[#16172a] [@media(pointer:fine)]:flex">
        {hint}
      </span>
    </button>
  );
}

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
          : near.use.kind === "goat"
            ? "CARINHO"
            : "PAINEL"
    : "USAR";

  const kill = () => {
    if (!infiltrator || !near.killId || killCooldown > 0) return;
    client.send({ type: "kill", targetId: near.killId });
    vibrate(40);
  };
  const report = () => {
    if (!near.bodyId) return;
    client.send({ type: "report", bodyId: near.bodyId });
    vibrate([60, 40, 60]);
  };
  const vent = () => {
    if (!infiltrator) return;
    if (you.vent) client.send({ type: "vent", action: "exit" });
    else if (near.ventId) client.send({ type: "vent", action: "enter" });
    else return;
    vibrate(15);
  };
  const toggleSabotage = () => {
    if (infiltrator) setSabotageOpen((v) => !v);
  };

  // Atalhos de teclado no desktop.
  const handlers = useRef({ onUse, kill, report, vent, toggleSabotage });
  useEffect(() => {
    handlers.current = { onUse, kill, report, vent, toggleSabotage };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.repeat) return;
      const h = handlers.current;
      if (e.code === "KeyE" || e.code === "Space") {
        e.preventDefault();
        h.onUse();
      } else if (e.code === "KeyQ") h.kill();
      else if (e.code === "KeyR") h.report();
      else if (e.code === "KeyV") h.vent();
      else if (e.code === "KeyF") h.toggleSabotage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const menuItem = "block w-full rounded-xl px-3 py-2.5 text-left hover:bg-white/10 disabled:opacity-35";

  return (
    <div className="absolute right-[calc(env(safe-area-inset-right)+0.9rem)] bottom-[calc(env(safe-area-inset-bottom)+1rem)] flex flex-col items-end gap-3">
      {sabotageOpen && infiltrator && (
        <div className={`${panel} mb-1 w-56 p-1.5 animate-[crew-fade_0.12s_ease-out_both]`}>
          <p className="px-3 pt-1 pb-1.5 text-xs font-bold text-[#ff8a95]">Sabotar</p>
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
              className={menuItem}
            >
              <span className="block text-sm font-semibold text-white">{s.label}</span>
              <span className="block text-[11px] text-white/55">{s.hint}</span>
            </button>
          ))}
        </div>
      )}
      {infiltrator && you.vent && (
        <div className={`${panel} mb-1 w-56 p-1.5`}>
          <p className="px-3 pt-1 pb-1.5 text-xs font-bold text-[#c9b0ff]">No duto · ir para</p>
          {VENTS.find((v) => v.id === you.vent)?.links.map((id) => {
            const target = VENTS.find((v) => v.id === id)!;
            const room = roomAt(target.pos) ?? ROOMS[0];
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  client.send({ type: "ventMove", ventId: id });
                  vibrate(10);
                }}
                className={`${menuItem} text-sm font-semibold text-white`}
              >
                → {room.name}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-end gap-3">
        {infiltrator && (near.ventId || you.vent) && (
          <ActionButton label={you.vent ? "SAIR" : "DUTO"} hint="V" color="bg-[#9b6bff]" text="text-white" onClick={vent}>
            <IconVent className="h-7 w-7" />
          </ActionButton>
        )}
        {infiltrator && (
          <div className="flex flex-col items-end gap-3">
            <ActionButton
              label="SABOTAR"
              hint="F"
              color="bg-[#ff9a3d]"
              cooldown={sabotageCooldown}
              disabled={!!you.vent}
              onClick={toggleSabotage}
            >
              <IconBolt className="h-7 w-7" />
            </ActionButton>
            <ActionButton
              label="ELIMINAR"
              hint="Q"
              color="bg-[#ff4d5e]"
              text="text-white"
              size="h-[5.2rem] w-[5.2rem]"
              cooldown={killCooldown}
              disabled={!near.killId || killCooldown > 0 || !!you.vent}
              onClick={kill}
            >
              <IconKnife className="h-8 w-8" />
            </ActionButton>
          </div>
        )}
        <div className="flex flex-col items-end gap-3">
          {near.bodyId && (
            <ActionButton label="REPORTAR" hint="R" color="bg-[#ffd23d]" size="h-[5.2rem] w-[5.2rem]" pulse onClick={report}>
              <IconMegaphone className="h-8 w-8" />
            </ActionButton>
          )}
          <ActionButton
            label={useLabel}
            hint="E"
            color="bg-[#4fb6ff]"
            size="h-[5.8rem] w-[5.8rem]"
            disabled={!near.use || !!you.vent}
            onClick={() => {
              unlockAudio();
              onUse();
            }}
          >
            <IconHand className="h-9 w-9" />
          </ActionButton>
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
        className="pointer-events-none fixed top-0 left-0 flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-white/30 bg-[#16172a]/40 transition-opacity duration-200 [@media(pointer:fine)]:hidden"
      >
        <div ref={knobRef} className="h-12 w-12 rounded-full border-[3px] border-[#16172a] bg-white shadow-[0_3px_0_#16172a]" />
      </div>
    </div>
  );
}
