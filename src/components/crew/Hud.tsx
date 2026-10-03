"use client";

// HUD do AMOUNG QUAD — GAMEPLAY FIRST.
// O centro da tela fica livre. Informações aparecem pequenas nas bordas;
// configurações, jogadores, personagem, modos e missões abrem num painel
// (bottom sheet no celular, gaveta lateral no desktop) e fecham na hora.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MIN_PLAYERS } from "@/lib/crew/constants";
import { EMOTES, LOBBY_OBJECTS, READY_HOLD_MS, READY_ZONE, inRect } from "@/lib/crew/lobby";
import { CRITICAL_PANELS, ROOMS, VENTS, roomAt, taskById } from "@/lib/crew/map";
import { modeOf } from "@/lib/crew/modes";
import type { SabotageKind } from "@/lib/crew/protocol";
import { GhostChat } from "./Chat";
import { serverSoundEnabled, setSoundEnabled, soundEnabled, subscribeSound, unlockAudio, vibrate } from "./feedback";
import { isLobbyScene, type Near } from "./GameScreen";
import { formatClock, useNow } from "./hooks";
import { IconBolt, IconGear, IconHand, IconKnife, IconMap, IconMegaphone, IconMenu, IconPalette, IconSmile, IconUsers, IconVent } from "./icons";
import { MapOverlay } from "./MapOverlay";
import { Meeting } from "./Meeting";
import type { CrewClient, Snapshot } from "./net";
import { Overlays } from "./Overlays";
import { CharacterPanel, MissionsPanel, ModesPanel, PlayersPanel, SettingsPanel } from "./panels";
import { SidePanel } from "./SidePanel";
import { toyButton } from "./ui";

export type PanelId = "character" | "players" | "settings" | "modes" | "missions";

const PANEL_TITLES: Record<PanelId, string> = {
  character: "Personagem",
  players: "Sala",
  settings: "Configurações",
  modes: "Modos de jogo",
  missions: "Missões do lobby",
};

type Props = {
  client: CrewClient;
  snapshot: Snapshot;
  near: Near;
  onJoystick: (x: number, y: number) => void;
  onUse: () => void;
  taskOpen: boolean;
  panel: PanelId | null;
  setPanel: (p: PanelId | null) => void;
};

/** Ignora atalhos enquanto o jogador digita. */
function typing(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
}

/** Botão de ícone discreto (área de toque ≥ 44px). */
function IconButton({ label, onClick, active = false, children, badge }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode; badge?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative flex h-11 min-w-11 items-center justify-center gap-1 rounded-full px-2.5 text-white backdrop-blur transition-colors ${
        active ? "bg-[#4fb6ff] text-[#16172a]" : "bg-[#16172a]/55 hover:bg-[#16172a]/75"
      }`}
    >
      {children}
      {badge && <span className="text-xs font-bold tabular-nums">{badge}</span>}
    </button>
  );
}

export function Hud({ client, snapshot, near, onJoystick, onUse, taskOpen, panel, setPanel }: Props) {
  const state = snapshot.state!;
  const now = useNow(250, client.clockOffset);
  const lobby = isLobbyScene(state);
  const playing = state.phase === "playing";
  const [mapOpen, setMapOpen] = useState(false);
  const canMap = state.phase === "playing" || state.phase === "ejecting";

  // Painéis só existem no lobby/resultado; ao começar a partida eles fecham.
  const panelOpen = panel && (lobby || state.phase === "ended") ? panel : null;

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
      {lobby ? (
        <LobbyHud client={client} snapshot={snapshot} now={now} near={near} onUse={onUse} setPanel={setPanel} />
      ) : (
        <GameHud client={client} snapshot={snapshot} now={now} canMap={canMap} onMap={() => setMapOpen(true)} />
      )}

      {(lobby || playing || state.phase === "ended") && !taskOpen && !panelOpen && <Joystick onMove={onJoystick} showIdle={playing} />}

      {playing && !taskOpen && <ActionButtons client={client} snapshot={snapshot} near={near} now={now} onUse={onUse} />}

      {playing && !state.you.alive && <GhostChat client={client} snapshot={snapshot} />}

      {state.phase === "meeting" && <Meeting client={client} snapshot={snapshot} now={now} />}

      {mapOpen && canMap && <MapOverlay client={client} state={state} onClose={() => setMapOpen(false)} />}

      <Overlays client={client} snapshot={snapshot} now={now} />

      {panelOpen && (
        <SidePanel title={PANEL_TITLES[panelOpen]} onClose={() => setPanel(null)}>
          {panelOpen === "character" && <CharacterPanel client={client} state={state} />}
          {panelOpen === "players" && <PlayersPanel client={client} snapshot={snapshot} />}
          {panelOpen === "settings" && <SettingsPanel client={client} state={state} />}
          {panelOpen === "modes" && <ModesPanel client={client} state={state} />}
          {panelOpen === "missions" && <MissionsPanel state={state} />}
        </SidePanel>
      )}
    </>
  );
}

// ==================================================================
// LOBBY
// ==================================================================

function LobbyHud({
  client,
  snapshot,
  now,
  near,
  onUse,
  setPanel,
}: {
  client: CrewClient;
  snapshot: Snapshot;
  now: number;
  near: Near;
  onUse: () => void;
  setPanel: (p: PanelId | null) => void;
}) {
  const state = snapshot.state!;
  const you = state.you;
  const me = state.players.find((p) => p.id === you.id);
  const isHost = state.hostId === you.id;
  const mode = modeOf(state.settings);
  const connected = state.players.filter((p) => p.connected).length;
  const readyCount = state.players.filter((p) => p.ready).length;
  const countdown = state.phase === "countdown" && state.countdownEndsAt ? Math.max(0, Math.ceil((state.countdownEndsAt - now) / 1000)) : null;
  const [emotesOpen, setEmotesOpen] = useState(false);
  const mission = you.mission;

  // Atalhos: E interage, T emotes, R ready.
  const handlers = useRef({ onUse, ready: () => {} });
  useEffect(() => {
    handlers.current = { onUse, ready: () => client.send({ type: "ready", ready: !me?.ready }) };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.repeat) return;
      if (e.code === "KeyE" || e.code === "Space") {
        e.preventDefault();
        handlers.current.onUse();
      } else if (e.code === "KeyR") handlers.current.ready();
      else if (e.code === "KeyT") setEmotesOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const useLabel =
    near.use?.kind === "rat" ? "BATER" : near.use?.kind === "object" ? (LOBBY_OBJECTS.find((o) => o.id === (near.use as { objectId: string }).objectId)?.label ?? "INTERAGIR") : null;

  return (
    <>
      {/* Topo: código + modo à esquerda, ícones à direita. Nada no centro. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pr-[calc(env(safe-area-inset-right)+0.5rem)] pl-[calc(env(safe-area-inset-left)+0.5rem)]">
        <button
          type="button"
          onClick={() => setPanel("modes")}
          className="pointer-events-auto flex h-11 min-w-0 items-center gap-2 rounded-full bg-[#16172a]/55 pr-3.5 pl-3 text-left backdrop-blur"
          aria-label={`Sala ${state.code}, modo ${mode.name}`}
        >
          <span className="text-base font-bold tracking-[0.15em] text-[#ffd23d]">{state.code}</span>
          <span className="truncate text-xs font-semibold text-white/75 uppercase">{mode.name}</span>
          {me?.safe && <span className="rounded-md bg-[#7fe6ff] px-1 text-[10px] font-bold text-[#16172a]">SAFE</span>}
        </button>
        <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
          <IconButton label="Jogadores e chat" onClick={() => setPanel("players")} badge={`${state.players.length}/${state.settings.maxPlayers}`}>
            <IconUsers className="h-5 w-5" />
          </IconButton>
          <IconButton label="Configurações" onClick={() => setPanel("settings")}>
            <IconGear className="h-5 w-5" />
          </IconButton>
          <IconButton label="Personagem" onClick={() => setPanel("character")}>
            <IconPalette className="h-5 w-5" />
          </IconButton>
          <MenuButton client={client} inGame={false} />
        </div>
      </div>

      {/* Contagem: pequena, no topo. O host pode cancelar. */}
      {countdown !== null && (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+3.6rem)] flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-[#16172a]/80 py-1.5 pr-1.5 pl-4 backdrop-blur">
            <span className="text-sm font-bold text-white">PARTIDA COMEÇANDO</span>
            <span key={countdown} className="text-2xl font-bold text-[#ffd23d] tabular-nums animate-[crew-pop_0.35s_ease-out_both]">
              {countdown}
            </span>
            {isHost ? (
              <button type="button" onClick={() => client.send({ type: "cancelStart" })} className="h-9 rounded-full bg-white/15 px-3 text-xs font-bold text-white">
                Cancelar
              </button>
            ) : (
              <span className="pr-2" />
            )}
          </div>
        </div>
      )}
      {countdown !== null && countdown <= 1 && <div className="pointer-events-none absolute inset-0 bg-white animate-[crew-flash_1s_ease-out_both]" />}

      <ReadyZoneHint client={client} snapshot={snapshot} />

      {/* Missão atual: pequena, canto inferior esquerdo. */}
      {mission && (
        <button
          type="button"
          onClick={() => setPanel("missions")}
          className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.4rem)] left-[calc(env(safe-area-inset-left)+0.6rem)] z-10 max-w-[60vw] sm:bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] sm:max-w-[40vw] rounded-2xl bg-[#16172a]/55 px-3 py-1.5 text-left backdrop-blur"
        >
          <span className="block text-[10px] font-bold tracking-wider text-[#ffd23d]">MISSÃO</span>
          <span className="block truncate text-xs font-semibold text-white">
            {mission.label} <span className="text-white/60">{mission.progress}/{mission.target}</span>
          </span>
        </button>
      )}

      {/* Ações: só o que faz sentido agora. */}
      <div className="absolute right-[calc(env(safe-area-inset-right)+0.75rem)] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-10 flex flex-col items-end gap-2">
        {emotesOpen && (
          <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-[#16172a]/80 p-1.5 backdrop-blur animate-[crew-fade_0.12s_ease-out_both]">
            {EMOTES.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-label={e.label}
                title={e.label}
                onClick={() => {
                  unlockAudio();
                  client.send({ type: "emote", emote: e.id });
                  setEmotesOpen(false);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl hover:bg-white/10"
              >
                {e.icon}
              </button>
            ))}
          </div>
        )}
        {useLabel && (
          <ActionButton label={useLabel} hint="E" color="bg-[#4fb6ff]" size="h-[5.2rem] w-[5.2rem]" onClick={() => {
            unlockAudio();
            onUse();
          }}>
            <IconHand className="h-8 w-8" />
          </ActionButton>
        )}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Emotes"
            onClick={() => setEmotesOpen((v) => !v)}
            className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur ${emotesOpen ? "bg-[#ffd23d] text-[#16172a]" : "bg-[#16172a]/55 text-white"}`}
          >
            <IconSmile className="h-6 w-6" />
          </button>
          {state.phase === "lobby" && (
            <button
              type="button"
              onClick={() => {
                unlockAudio();
                client.send({ type: "ready", ready: !me?.ready });
              }}
              className={`h-11 rounded-full px-4 text-sm font-bold backdrop-blur transition-colors ${me?.ready ? "bg-[#3ddc84] text-[#16172a]" : "bg-[#16172a]/55 text-white"}`}
            >
              {me?.ready ? "✓ READY" : "PRONTO?"}
            </button>
          )}
          {isHost && state.phase === "lobby" && (
            <button
              type="button"
              disabled={connected < MIN_PLAYERS}
              onClick={() => {
                unlockAudio();
                client.send({ type: "start" });
              }}
              className={`${toyButton} h-11 bg-[#ffd23d] px-4 text-sm text-[#16172a]`}
              title={connected < MIN_PLAYERS ? `Mínimo de ${MIN_PLAYERS} jogadores` : `${readyCount}/${connected} prontos`}
            >
              {connected < MIN_PLAYERS ? `${connected}/${MIN_PLAYERS}` : "▶ INICIAR"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/** Dentro da READY ZONE: "segure" com uma barrinha de ~1 s. */
function ReadyZoneHint({ client, snapshot }: { client: CrewClient; snapshot: Snapshot }) {
  const state = snapshot.state!;
  const me = state.players.find((p) => p.id === state.you.id);
  const [inside, setInside] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setInside(inRect(client.local, READY_ZONE)), 120);
    return () => clearInterval(id);
  }, [client]);
  if (!inside || me?.ready || state.phase !== "lobby") return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] flex justify-center">
      <div className="rounded-full bg-[#16172a]/75 px-4 py-2 text-center backdrop-blur">
        <p className="text-xs font-bold text-[#3ddc84]">SEGURE PARA FICAR READY</p>
        <span className="mt-1 block h-1.5 w-40 overflow-hidden rounded-full bg-white/15">
          <span className="block h-full rounded-full bg-[#3ddc84]" style={{ animation: `crew-ready-fill ${READY_HOLD_MS}ms linear both` }} />
        </span>
      </div>
    </div>
  );
}

// ==================================================================
// PARTIDA
// ==================================================================

function GameHud({ client, snapshot, now, canMap, onMap }: { client: CrewClient; snapshot: Snapshot; now: number; canMap: boolean; onMap: () => void }) {
  const state = snapshot.state!;
  const inMatch = state.phase !== "ended";
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pr-[calc(env(safe-area-inset-right)+0.5rem)] pl-[calc(env(safe-area-inset-left)+0.5rem)]">
        <div className="pointer-events-auto min-w-0">{inMatch && <MissionsChip snapshot={snapshot} />}</div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
          {canMap && (
            <IconButton label="Mapa (M)" onClick={onMap}>
              <IconMap className="h-5 w-5" />
            </IconButton>
          )}
          <MenuButton client={client} inGame={inMatch} />
        </div>
      </div>
      {inMatch && <MatchTimer snapshot={snapshot} now={now} />}
      {inMatch && <SabotageBanner snapshot={snapshot} now={now} />}
      {state.phase === "playing" && !state.you.alive && (
        <p className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] text-center text-xs font-semibold tracking-[0.15em] text-white/55 [text-shadow:0_2px_0_#16172a]">
          {modeOf(state.settings).id === "classic" ? "MODO FANTASMA · termine suas tarefas" : "VOCÊ FOI PEGO · assistindo"}
        </p>
      )}
    </>
  );
}

/** Papel + progresso compactos; a lista de tarefas abre/fecha (fechada por padrão no celular). */
function MissionsChip({ snapshot }: { snapshot: Snapshot }) {
  const state = snapshot.state!;
  const you = state.you;
  const mode = modeOf(state.settings);
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const role = you.role ? mode.roles[you.role] : null;
  const mine = you.tasks;
  const doneMine = mine.filter((t) => t.done).length;
  const { done, total } = state.tasks;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const pretend = you.role === "infiltrator" && mode.id === "classic";
  return (
    <div className="w-[min(15rem,56vw)] overflow-hidden rounded-2xl bg-[#16172a]/60 backdrop-blur">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-h-11 w-full items-center gap-2 px-3 py-1.5 text-left" aria-expanded={open}>
        {role && (
          <span className="shrink-0 rounded-md px-1.5 text-[10px] leading-4 font-bold text-[#16172a]" style={{ backgroundColor: role.color }}>
            {role.name.toUpperCase()}
          </span>
        )}
        {mine.length > 0 ? (
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between text-[11px] font-semibold text-white/80">
              Tarefas {doneMine}/{mine.length}
              <span className="text-white/50">{open ? "▾" : "▸"}</span>
            </span>
            {mode.id === "classic" && (
              <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-white/15">
                <span className="block h-full rounded-full bg-[#3ddc84] transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </span>
            )}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-white/70">{role?.goal}</span>
        )}
      </button>
      {open && mine.length > 0 && (
        <ul className="space-y-0.5 px-3 pb-2 text-xs leading-tight">
          {pretend && <li className="pb-0.5 text-[10px] font-semibold text-[#ff8a95]">Finja fazer estas tarefas</li>}
          {mine.map((t) => {
            const station = taskById(t.id);
            const room = ROOMS.find((r) => r.id === station?.room);
            return (
              <li key={t.id} className={`flex items-center gap-1.5 ${t.done ? "text-[#3ddc84] line-through" : "text-white"}`}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.done ? "bg-[#3ddc84]" : "bg-[#ffd23d]"}`} />
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

/** Cronômetro dos modos de perseguição + contagem de liberação do caçador. */
function MatchTimer({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const state = snapshot.state!;
  const timer = state.timer;
  if (!timer || state.phase !== "playing" || now < state.revealUntil) return null;
  const release = timer.releaseAt;
  const releaseLeft = release ? Math.ceil((release - now) / 1000) : 0;
  const justReleased = release !== null && now >= release && now - release < 1500;
  const hunterName = modeOf(state.settings).roles.infiltrator.name.toUpperCase();
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+3.6rem)] flex justify-center sm:top-[calc(env(safe-area-inset-top)+0.5rem)]">
        <span className={`rounded-full bg-[#16172a]/65 px-3 py-1 text-lg font-bold tabular-nums backdrop-blur ${timer.endsAt - now < 15_000 ? "text-[#ff8a95]" : "text-white"}`}>
          {formatClock(Math.max(0, timer.endsAt - now))}
        </span>
      </div>
      {release !== null && releaseLeft > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-[34%] flex flex-col items-center">
          <p className="text-sm font-bold text-white/80 [text-shadow:0_2px_0_#16172a]">{hunterName} LIBERADO EM</p>
          <p key={releaseLeft} className="crew-outline text-7xl font-bold text-[#ffd23d] animate-[crew-pop_0.35s_ease-out_both]">
            {releaseLeft}
          </p>
        </div>
      )}
      {justReleased && (
        <div className="pointer-events-none absolute inset-x-0 top-[34%] flex justify-center">
          <p className="crew-outline text-4xl font-bold text-[#ff4d5e] animate-[crew-pop_0.35s_ease-out_both]">{hunterName} LIBERADO!</p>
        </div>
      )}
    </>
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
  const item = "flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-white hover:bg-white/10";
  return (
    <div className="relative">
      <IconButton label="Menu" onClick={() => (open ? close() : setOpen(true))} active={open}>
        <IconMenu className="h-5 w-5" />
      </IconButton>
      {open && (
        <div className="absolute top-12 right-0 z-50 w-52 rounded-2xl bg-[#1f2238]/95 p-1.5 shadow-xl backdrop-blur animate-[crew-fade_0.12s_ease-out_both]">
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
        <span className="text-sm font-bold">⚠ SISTEMA OFFLINE · {formatClock(s.critical.endsAt - now)}</span>
        <span className="mt-0.5 text-[11px] font-semibold opacity-90">Servidor (Edição) + Roteador (Recepção) juntos · {panels}</span>
      </>
    );
  } else if (s.lights) {
    content = <span className="text-sm font-bold">💡 APAGÃO · religue o quadro no Corredor</span>;
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
    <div className="pointer-events-none absolute inset-x-3 top-[calc(env(safe-area-inset-top)+3.8rem)] flex flex-col items-center text-center sm:inset-x-[24%] sm:top-[calc(env(safe-area-inset-top)+0.5rem)]">
      <div className="flex animate-[crew-pulse_1.2s_ease-in-out_infinite] flex-col items-center rounded-2xl bg-[#ff4d5e]/90 px-3 py-1.5 text-white backdrop-blur">{content}</div>
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
  const mode = modeOf(state.settings);
  const [sabotageOpen, setSabotageOpen] = useState(false);
  const killer = you.role === "infiltrator" && you.alive;
  const killCooldown = Math.max(0, you.killReadyAt - now, you.releaseAt - now);
  const sabotageCooldown = Math.max(0, you.sabotageReadyAt - now);
  const sabotageBusy = !!state.sabotage.critical || state.sabotage.lights;
  const canSabotage = killer && mode.sabotage;

  const useLabel = near.use
    ? near.use.kind === "task"
      ? "TAREFA"
      : near.use.kind === "emergency"
        ? "REUNIÃO"
        : near.use.kind === "lights"
          ? "LUZ"
          : near.use.kind === "rat"
            ? "BATER"
            : "PAINEL"
    : null;

  const kill = () => {
    if (!killer || !near.killId || killCooldown > 0) return;
    client.send({ type: "kill", targetId: near.killId });
    vibrate(40);
  };
  const report = () => {
    if (!near.bodyId) return;
    client.send({ type: "report", bodyId: near.bodyId });
    vibrate([60, 40, 60]);
  };
  const vent = () => {
    if (!killer || !mode.vents) return;
    if (you.vent) client.send({ type: "vent", action: "exit" });
    else if (near.ventId) client.send({ type: "vent", action: "enter" });
    else return;
    vibrate(15);
  };
  const toggleSabotage = () => {
    if (canSabotage) setSabotageOpen((v) => !v);
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
    <div className="absolute right-[calc(env(safe-area-inset-right)+0.75rem)] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] flex flex-col items-end gap-3">
      {sabotageOpen && canSabotage && (
        <div className="mb-1 w-56 rounded-2xl bg-[#1f2238]/95 p-1.5 backdrop-blur animate-[crew-fade_0.12s_ease-out_both]">
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
      {killer && you.vent && (
        <div className="mb-1 w-56 rounded-2xl bg-[#1f2238]/95 p-1.5 backdrop-blur">
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
        {killer && mode.vents && (near.ventId || you.vent) && (
          <ActionButton label={you.vent ? "SAIR" : "DUTO"} hint="V" color="bg-[#9b6bff]" text="text-white" onClick={vent}>
            <IconVent className="h-7 w-7" />
          </ActionButton>
        )}
        {killer && (
          <div className="flex flex-col items-end gap-3">
            {canSabotage && (
              <ActionButton label="SABOTAR" hint="F" color="bg-[#ff9a3d]" cooldown={sabotageCooldown} disabled={!!you.vent} onClick={toggleSabotage}>
                <IconBolt className="h-7 w-7" />
              </ActionButton>
            )}
            <ActionButton
              label={mode.killLabel}
              hint="Q"
              color={mode.id === "infection" ? "bg-[#b6f03d]" : "bg-[#ff4d5e]"}
              text={mode.id === "infection" ? "text-[#16172a]" : "text-white"}
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
          {near.bodyId && mode.bodies && (
            <ActionButton label="REPORTAR" hint="R" color="bg-[#ffd23d]" size="h-[5.2rem] w-[5.2rem]" pulse onClick={report}>
              <IconMegaphone className="h-8 w-8" />
            </ActionButton>
          )}
          {useLabel && !you.vent && (
            <ActionButton
              label={useLabel}
              hint="E"
              color="bg-[#4fb6ff]"
              size="h-[5.4rem] w-[5.4rem]"
              onClick={() => {
                unlockAudio();
                onUse();
              }}
            >
              <IconHand className="h-9 w-9" />
            </ActionButton>
          )}
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
  const idleOpacity = useRef("0.22");
  useEffect(() => {
    idleOpacity.current = showIdle ? "0.22" : "0";
    if (!origin.current && baseRef.current) baseRef.current.style.opacity = idleOpacity.current;
  }, [showIdle]);
  const RADIUS = 42;

  const place = (x: number, y: number, kx: number, ky: number, active: boolean) => {
    const base = baseRef.current;
    const knob = knobRef.current;
    if (!base || !knob) return;
    base.style.transform = `translate(${x - 48}px, ${y - 48}px)`;
    base.style.opacity = active ? "0.75" : idleOpacity.current;
    knob.style.transform = `translate(${kx}px, ${ky}px)`;
  };

  useEffect(() => {
    const reset = () => {
      const h = window.innerHeight;
      place(76, h - 120, 0, 0, false);
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
        place(76, window.innerHeight - 120, 0, 0, false);
      }}
      onPointerCancel={() => {
        origin.current = null;
        onMove(0, 0);
        place(76, window.innerHeight - 120, 0, 0, false);
      }}
    >
      <div
        ref={baseRef}
        className="pointer-events-none fixed top-0 left-0 flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-white/30 bg-[#16172a]/40 transition-opacity duration-200 [@media(pointer:fine)]:hidden"
      >
        <div ref={knobRef} className="h-11 w-11 rounded-full border-[3px] border-[#16172a] bg-white/90 shadow-[0_3px_0_#16172a]" />
      </div>
    </div>
  );
}
