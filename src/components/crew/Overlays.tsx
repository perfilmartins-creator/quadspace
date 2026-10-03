"use client";

import { useEffect, useRef, useState } from "react";
import { colorHex } from "@/lib/crew/constants";
import { modeOf } from "@/lib/crew/modes";
import { CharacterIcon } from "./CharacterIcon";
import { sfx, vibrate } from "./feedback";
import type { CrewClient, NoticeTone, Snapshot } from "./net";
import { btnGhost, btnPrimary, card } from "./ui";

const RED = "#ff4d5e";

export function Overlays({ client, snapshot, now }: { client: CrewClient; snapshot: Snapshot; now: number }) {
  const state = snapshot.state!;
  const localNow = now - client.clockOffset;
  useSounds(snapshot);

  return (
    <>
      {state.phase === "countdown" && state.countdownEndsAt && <CountdownTicks endsAt={state.countdownEndsAt} now={now} />}
      {state.phase === "playing" && now < state.revealUntil && <RoleReveal snapshot={snapshot} />}
      {state.phase === "playing" && snapshot.diedAt && localNow - snapshot.diedAt < 2600 && <DeathScreen color={state.players.find((p) => p.id === state.you.id)?.color ?? "white"} />}
      {state.phase === "ejecting" && state.eject && <Eject snapshot={snapshot} />}
      {state.phase === "ended" && state.end && <Results client={client} snapshot={snapshot} />}

      {snapshot.status === "reconnecting" && (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex justify-center">
          <p className="animate-[crew-pulse_1s_ease-in-out_infinite] rounded-2xl border-[3px] border-[#16172a] bg-[#ffd23d] px-4 py-2 text-sm font-bold text-[#16172a] shadow-[0_4px_0_#16172a]">
            Reconectando…
          </p>
        </div>
      )}

      {/* Avisos curtos no topo: aparecem e somem sozinhos, sem cobrir o centro. */}
      <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+3.6rem)] z-40 flex flex-col items-center gap-1.5 px-3">
        {snapshot.notices.map((n) => (
          <p key={n.id} className={`max-w-full animate-[crew-rise_0.2s_ease-out_both] truncate rounded-full px-3.5 py-1.5 text-center backdrop-blur ${TONE[n.tone]}`}>
            {n.text}
          </p>
        ))}
      </div>
      <SafeFlash snapshot={snapshot} />
    </>
  );
}

/** Sons e vibrações das transições de fase (efeitos colaterais apenas). */
function useSounds(snapshot: Snapshot) {
  const state = snapshot.state!;
  const prev = useRef({ phase: state.phase, players: state.players.length, lights: false, critical: false, doors: false });

  useEffect(() => {
    const p = prev.current;
    const s = state.sabotage;
    if (p.phase !== state.phase) {
      if (state.phase === "playing" && p.phase === "countdown") {
        sfx.reveal();
        vibrate([40, 60, 40]);
      }
      if (state.phase === "ejecting") sfx.eject();
      if (state.phase === "ended" && state.end) {
        const won = state.end.winner === state.you.role;
        if (won) sfx.win();
        else sfx.lose();
        vibrate(won ? [30, 40, 30, 40, 80] : 200);
      }
    }
    if (state.phase === "lobby" && state.players.length < p.players) sfx.leave();
    const sabotageStarted = (s.lights && !p.lights) || (!!s.critical && !p.critical) || (!!s.doors && !p.doors);
    if (sabotageStarted) {
      sfx.sabotage();
      vibrate([100, 60, 100]);
    }
    if ((p.lights && !s.lights) || (p.critical && !s.critical)) sfx.fixed();
    prev.current = { phase: state.phase, players: state.players.length, lights: s.lights, critical: !!s.critical, doors: !!s.doors };
  }, [state]);
}

const TONE: Record<NoticeTone, string> = {
  info: "bg-[#16172a]/70 text-xs font-semibold text-white",
  good: "bg-[#4fb6ff]/90 text-xs font-bold text-[#16172a]",
  mission: "bg-[#ffd23d] text-sm font-bold text-[#16172a]",
  goal: "bg-[#3ddc84] text-base font-bold text-[#16172a]",
  alert: "bg-[#ff4d5e]/90 text-xs font-bold text-white",
};

/** Contagem no lobby: só sons e vibração (o número aparece pequeno no HUD). */
function CountdownTicks({ endsAt, now }: { endsAt: number; now: number }) {
  const n = Math.max(1, Math.ceil((endsAt - now) / 1000));
  useEffect(() => {
    sfx.countdown();
    vibrate(n <= 1 ? 30 : 12);
  }, [n]);
  return null;
}

/** "SAFE ZONE" por ~1 s ao entrar na área segura do lobby. */
function SafeFlash({ snapshot }: { snapshot: Snapshot }) {
  const state = snapshot.state!;
  const safe = !!state.players.find((p) => p.id === state.you.id)?.safe;
  const [shownAt, setShownAt] = useState(0);
  const prev = useRef(safe);
  useEffect(() => {
    if (safe && !prev.current) setShownAt(Date.now());
    prev.current = safe;
  }, [safe]);
  useEffect(() => {
    if (!shownAt) return;
    const t = setTimeout(() => setShownAt(0), 1100);
    return () => clearTimeout(t);
  }, [shownAt]);
  if (!shownAt) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[30%] flex justify-center">
      <p className="crew-outline text-3xl font-bold text-[#c9f5ff] animate-[crew-pop_0.3s_ease-out_both]">SAFE ZONE</p>
    </div>
  );
}

function RoleReveal({ snapshot }: { snapshot: Snapshot }) {
  const state = snapshot.state!;
  const mode = modeOf(state.settings);
  const role = state.you.role ?? "crew";
  const info = mode.roles[role];
  const me = state.players.find((p) => p.id === state.you.id);
  const partners = state.players.filter((p) => state.you.partners.includes(p.id));
  const hunters = state.players.filter((p) => p.role === "infiltrator" && p.id !== state.you.id);
  const killers = role === "infiltrator";
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center px-6 text-center animate-[crew-fade_0.35s_ease-out_both]"
      style={{ background: `radial-gradient(circle at 50% 45%, ${info.color}66, transparent 65%), #0f1022` }}
    >
      <p className="text-sm font-bold tracking-[0.2em] text-white/60 uppercase">{mode.name}</p>
      <p className="mt-1 text-lg font-semibold text-white/70">Você é</p>
      <p className="crew-outline mt-2 text-6xl font-bold animate-[crew-pop_0.6s_cubic-bezier(0.16,1,0.3,1)_both] sm:text-7xl" style={{ color: info.color }}>
        {info.name.toUpperCase()}
      </p>
      <div className="mt-6 animate-[crew-rise_0.6s_ease-out_0.2s_both]">{me && <CharacterIcon color={me.color} size={110} />}</div>
      <p className="mt-6 max-w-sm text-lg font-semibold text-white/90">{info.goal}</p>
      {killers && partners.length > 0 && <p className="mt-4 text-base font-semibold text-[#ff8a95]">Seu parceiro: {partners.map((p) => p.name).join(", ")}</p>}
      {!killers && mode.id === "classic" && (
        <p className="mt-4 rounded-full bg-[#ff4d5e] px-3 py-1 text-sm font-bold text-white">
          {state.settings.infiltrators > 1 && state.players.length >= 7 ? "2 infiltrados entre vocês" : "1 infiltrado entre vocês"}
        </p>
      )}
      {!killers && mode.id !== "classic" && hunters.length > 0 && (
        <p className="mt-4 rounded-full px-3 py-1 text-sm font-bold text-[#16172a]" style={{ backgroundColor: mode.roles.infiltrator.color }}>
          {mode.roles.infiltrator.name}: {hunters.map((p) => p.name).join(", ")}
        </p>
      )}
      {mode.id === "hide_seek" && <p className="mt-3 text-sm text-white/60">{killers ? "Você será liberado em alguns segundos." : "Corra e se esconda!"}</p>}
    </div>
  );
}

function DeathScreen({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#0f1022]/95 px-6 text-center animate-[crew-fade_0.15s_ease-out_both]">
      <div className="animate-[crew-glitch_0.5s_steps(2)_3]">
        <CharacterIcon color={color} size={110} dead />
      </div>
      <p className="crew-outline mt-6 text-4xl font-bold text-[#ff4d5e] animate-[crew-glitch_0.4s_steps(2)_2]">Você foi eliminado!</p>
      <p className="mt-3 text-base text-white/70">Agora você é um fantasma. Continue ajudando com as tarefas.</p>
    </div>
  );
}

function Eject({ snapshot }: { snapshot: Snapshot }) {
  const state = snapshot.state!;
  const e = state.eject!;
  let line1 = "Ninguém foi removido.";
  let line2 = e.tie ? "A votação empatou." : "A votação foi pulada.";
  if (e.playerId && e.name) {
    line1 = `${e.name} foi removido.`;
    if (e.role === "infiltrator") line2 = `${e.name} era o INFILTRADO.`;
    else if (e.role === "crew") line2 = `${e.name} não era o infiltrado.`;
    else line2 = `O papel de ${e.name} não foi revelado.`;
  }
  const line3 =
    e.remaining === undefined
      ? null
      : e.remaining === 0
        ? null
        : `${e.remaining} ${e.remaining === 1 ? "infiltrado restante" : "infiltrados restantes"}.`;
  return (
    <div className="crew-stars absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Feixe de luz de estúdio */}
      <div className="absolute inset-y-0 left-1/2 w-40 -translate-x-1/2 bg-gradient-to-b from-paper/10 via-paper/[0.03] to-transparent" />
      {e.color && (
        <div className="relative animate-[crew-eject_4.6s_cubic-bezier(0.45,0,0.2,1)_both]">
          <CharacterIcon color={e.color} size={120} />
        </div>
      )}
      <p className="crew-outline relative mt-8 text-3xl font-bold text-white animate-[crew-rise_0.6s_ease-out_0.6s_both]">{line1}</p>
      <p
        className="relative mt-3 text-lg font-semibold animate-[crew-rise_0.6s_ease-out_1.6s_both]"
        style={{ color: e.role === "infiltrator" ? RED : "rgba(255,255,255,0.8)" }}
      >
        {line2}
      </p>
      {line3 && <p className="relative mt-4 text-base font-semibold text-[#ffd23d] animate-[crew-rise_0.6s_ease-out_2.4s_both]">{line3}</p>}
    </div>
  );
}

const REASONS: Record<string, string> = {
  tasks: "Todas as tarefas foram concluídas.",
  votes: "Os infiltrados foram descobertos.",
  kills: "A equipe foi reduzida demais.",
  sabotage: "O sistema não foi restaurado a tempo.",
  abandon: "Jogadores deixaram a partida.",
  time: "O tempo acabou e ainda tinha gente de pé.",
  caught: "Todos os fugitivos foram pegos.",
  infected: "Todo mundo foi infectado.",
};

function Results({ client, snapshot }: { client: CrewClient; snapshot: Snapshot }) {
  const state = snapshot.state!;
  const end = state.end!;
  const mode = modeOf({ gameMode: end.mode });
  const winner = mode.roles[end.winner];
  const youWon = state.you.role === end.winner;
  const isHost = state.hostId === state.you.id;
  const killers = mode.roles.infiltrator;
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto crew-stars px-6 py-[calc(env(safe-area-inset-top)+2rem)] text-center animate-[crew-fade_0.4s_ease-out_both]">
      <p className="text-xs font-bold tracking-[0.2em] text-white/50 uppercase">{mode.name}</p>
      <p className={`mt-1 text-2xl font-bold ${youWon ? "text-[#3ddc84]" : "text-[#ff8a95]"}`}>{youWon ? "Vitória!" : "Derrota"}</p>
      <p className="crew-outline mt-3 text-5xl font-bold animate-[crew-pop_0.7s_cubic-bezier(0.16,1,0.3,1)_both] sm:text-6xl" style={{ color: winner.color }}>
        {winner.plural.toUpperCase()} {end.winner === "infiltrator" && end.infiltrators.length === 1 ? "VENCE" : "VENCEM"}
      </p>
      <p className="mt-4 text-base text-white/70">{REASONS[end.reason]}</p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {end.infiltrators.map((p) => (
          <div key={p.id} className="flex flex-col items-center">
            <CharacterIcon color={p.color} size={64} />
            <p className="mt-1 text-sm font-semibold" style={{ color: colorHex(p.color) }}>
              {p.name}
            </p>
          </div>
        ))}
      </div>
      {end.infiltrators.length > 0 && (
        <p className="mt-1 text-sm font-bold" style={{ color: killers.color }}>
          {(end.infiltrators.length > 1 ? killers.plural : killers.name).toUpperCase()}
        </p>
      )}

      <dl className={`${card} mt-6 grid w-full max-w-xs grid-cols-2 overflow-hidden text-left`}>
        <div className="border-r-[3px] border-[#16172a] px-4 py-3">
          <dt className="text-xs font-semibold text-white/55">{mode.id === "infection" ? "Infectados" : mode.id === "hide_seek" ? "Pegos" : "Eliminados"}</dt>
          <dd className="text-3xl font-bold">{mode.id === "infection" ? end.infiltrators.length : end.eliminated}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs font-semibold text-white/55">Tarefas</dt>
          <dd className="text-3xl font-bold">
            {end.tasksDone}
            <span className="text-base text-white/45">/{end.tasksTotal}</span>
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
        {isHost && (
          <button type="button" onClick={() => client.send({ type: "backToLobby", again: true })} className={`${btnPrimary} py-4 text-xl`}>
            Jogar novamente
          </button>
        )}
        <button type="button" onClick={() => client.send({ type: "backToLobby" })} className={`${isHost ? btnGhost : btnPrimary} py-3 text-base`}>
          Voltar ao lobby
        </button>
        <button type="button" onClick={() => client.leave()} className="py-2 text-sm font-semibold text-white/50">
          Sair da sala
        </button>
      </div>
    </div>
  );
}
