"use client";

import { useEffect, useRef } from "react";
import { colorHex } from "@/lib/crew/constants";
import { CharacterIcon } from "./CharacterIcon";
import { sfx, vibrate } from "./feedback";
import type { CrewClient, Snapshot } from "./net";

const RED = "#ff4d3d";

export function Overlays({ client, snapshot, now }: { client: CrewClient; snapshot: Snapshot; now: number }) {
  const state = snapshot.state!;
  const localNow = now - client.clockOffset;
  useSounds(snapshot);

  return (
    <>
      {state.phase === "countdown" && state.countdownEndsAt && <Countdown endsAt={state.countdownEndsAt} now={now} />}
      {state.phase === "playing" && now < state.revealUntil && <RoleReveal snapshot={snapshot} />}
      {state.phase === "playing" && snapshot.diedAt && localNow - snapshot.diedAt < 2600 && <DeathScreen color={state.players.find((p) => p.id === state.you.id)?.color ?? "white"} />}
      {state.phase === "ejecting" && state.eject && <Eject snapshot={snapshot} />}
      {state.phase === "ended" && state.end && <Results client={client} snapshot={snapshot} />}

      {snapshot.status === "reconnecting" && (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex justify-center">
          <p className="animate-[crew-pulse_1s_ease-in-out_infinite] border border-[#ffd23d]/60 bg-ink/90 px-4 py-2 text-[11px] tracking-[0.3em] text-[#ffd23d]">
            RECONECTANDO…
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+9.5rem)] z-40 flex flex-col items-center gap-1.5">
        {snapshot.notices.map((n) => (
          <p key={n.id} className="animate-[crew-rise_0.25s_ease-out_both] bg-ink/80 px-3 py-1.5 text-xs text-paper/85 backdrop-blur">
            {n.text}
          </p>
        ))}
      </div>
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
    if (state.phase === "lobby" && state.players.length !== p.players) {
      if (state.players.length > p.players) sfx.join();
      else sfx.leave();
    }
    const sabotageStarted = (s.lights && !p.lights) || (!!s.critical && !p.critical) || (!!s.doors && !p.doors);
    if (sabotageStarted) {
      sfx.sabotage();
      vibrate([100, 60, 100]);
    }
    if ((p.lights && !s.lights) || (p.critical && !s.critical)) sfx.fixed();
    prev.current = { phase: state.phase, players: state.players.length, lights: s.lights, critical: !!s.critical, doors: !!s.doors };
  }, [state]);
}

function Countdown({ endsAt, now }: { endsAt: number; now: number }) {
  const n = Math.max(1, Math.ceil((endsAt - now) / 1000));
  useEffect(() => {
    sfx.countdown();
    vibrate(20);
  }, [n]);
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-ink/85 animate-[crew-fade_0.2s_ease-out_both]">
      <p className="text-xs tracking-[0.5em] text-paper/50">A PARTIDA COMEÇA EM</p>
      <p key={n} className="mt-4 text-[9rem] leading-none font-light animate-[crew-pop_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
        {n}
      </p>
    </div>
  );
}

function RoleReveal({ snapshot }: { snapshot: Snapshot }) {
  const state = snapshot.state!;
  const infiltrator = state.you.role === "infiltrator";
  const me = state.players.find((p) => p.id === state.you.id);
  const partners = state.players.filter((p) => state.you.partners.includes(p.id));
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center px-6 text-center animate-[crew-fade_0.35s_ease-out_both]"
      style={{
        background: `radial-gradient(circle at 50% 45%, ${infiltrator ? "rgba(255,77,61,0.3)" : "rgba(255,255,255,0.12)"}, transparent 65%), #050505`,
      }}
    >
      <p className="text-xs tracking-[0.5em] text-paper/50">SEU PAPEL</p>
      <p
        className="mt-3 text-6xl font-light tracking-[0.12em] animate-[crew-pop_0.6s_cubic-bezier(0.16,1,0.3,1)_both] sm:text-7xl"
        style={{ color: infiltrator ? RED : "#fff" }}
      >
        {infiltrator ? "INFILTRADO" : "CREW"}
      </p>
      <div className="mt-6 animate-[crew-rise_0.6s_ease-out_0.2s_both]">{me && <CharacterIcon color={me.color} size={110} />}</div>
      <p className="mt-6 text-base text-paper/80">
        {infiltrator ? (
          <>
            Elimine a equipe.
            <br />
            Não seja descoberto.
          </>
        ) : (
          <>
            Complete suas tarefas.
            <br />
            Encontre o infiltrado.
          </>
        )}
      </p>
      {infiltrator && partners.length > 0 && (
        <p className="mt-4 text-sm text-[#ff8a7e]">Seu parceiro: {partners.map((p) => p.name).join(", ")}</p>
      )}
      {!infiltrator && (
        <p className="mt-4 text-xs tracking-[0.2em] text-paper/40">
          {state.settings.infiltrators > 1 && state.players.length >= 7 ? "2 INFILTRADOS ENTRE VOCÊS" : "1 INFILTRADO ENTRE VOCÊS"}
        </p>
      )}
    </div>
  );
}

function DeathScreen({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#050505]/95 px-6 text-center animate-[crew-fade_0.15s_ease-out_both]">
      <div className="animate-[crew-glitch_0.5s_steps(2)_3]">
        <CharacterIcon color={color} size={110} dead />
      </div>
      <p className="mt-6 text-xl font-light tracking-[0.18em] text-[#ff8a7e] animate-[crew-glitch_0.4s_steps(2)_2]">VOCÊ FOI ELIMINADO</p>
      <p className="mt-3 text-sm text-paper/60">Agora você é um fantasma. Continue ajudando com as tarefas.</p>
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
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-[#030303] px-6 text-center">
      {/* Feixe de luz de estúdio */}
      <div className="absolute inset-y-0 left-1/2 w-40 -translate-x-1/2 bg-gradient-to-b from-paper/10 via-paper/[0.03] to-transparent" />
      {e.color && (
        <div className="relative animate-[crew-eject_4.6s_cubic-bezier(0.45,0,0.2,1)_both]">
          <CharacterIcon color={e.color} size={120} />
        </div>
      )}
      <p className="relative mt-8 text-2xl font-light tracking-tight animate-[crew-rise_0.6s_ease-out_0.6s_both]">{line1}</p>
      <p
        className="relative mt-2 text-base animate-[crew-rise_0.6s_ease-out_1.6s_both]"
        style={{ color: e.role === "infiltrator" ? RED : "rgba(255,255,255,0.7)" }}
      >
        {line2}
      </p>
      {line3 && <p className="relative mt-4 text-sm tracking-[0.15em] text-paper/50 animate-[crew-rise_0.6s_ease-out_2.4s_both]">{line3}</p>}
    </div>
  );
}

const REASONS: Record<string, string> = {
  tasks: "Todas as tarefas foram concluídas.",
  votes: "Os infiltrados foram descobertos.",
  kills: "A equipe foi reduzida demais.",
  sabotage: "O sistema não foi restaurado a tempo.",
  abandon: "Jogadores deixaram a partida.",
};

function Results({ client, snapshot }: { client: CrewClient; snapshot: Snapshot }) {
  const state = snapshot.state!;
  const end = state.end!;
  const crewWon = end.winner === "crew";
  const youWon = state.you.role === end.winner;
  const isHost = state.hostId === state.you.id;
  const hostOnline = state.players.find((p) => p.id === state.hostId)?.connected;
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto bg-[#040404]/95 px-6 py-[calc(env(safe-area-inset-top)+2rem)] text-center animate-[crew-fade_0.4s_ease-out_both]">
      <p className="text-xs tracking-[0.5em] text-paper/50">{youWon ? "VITÓRIA" : "DERROTA"}</p>
      <p
        className="mt-3 text-5xl font-light tracking-[0.08em] animate-[crew-pop_0.7s_cubic-bezier(0.16,1,0.3,1)_both] sm:text-6xl"
        style={{ color: crewWon ? "#fff" : RED }}
      >
        {crewWon ? "CREW VENCEU" : "INFILTRADO VENCEU"}
      </p>
      <p className="mt-3 text-sm text-paper/55">{REASONS[end.reason]}</p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {end.infiltrators.map((p) => (
          <div key={p.id} className="flex flex-col items-center">
            <CharacterIcon color={p.color} size={72} />
            <p className="mt-1 text-sm" style={{ color: colorHex(p.color) }}>
              {p.name}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] tracking-[0.3em] text-[#ff8a7e]">{end.infiltrators.length > 1 ? "INFILTRADOS" : "INFILTRADO"}</p>

      <dl className="mt-8 grid w-full max-w-xs grid-cols-2 gap-px border border-paper/10 bg-paper/10 text-left">
        <div className="bg-ink px-4 py-3">
          <dt className="text-[10px] tracking-[0.25em] text-paper/45">ELIMINADOS</dt>
          <dd className="text-2xl font-light">{end.eliminated}</dd>
        </div>
        <div className="bg-ink px-4 py-3">
          <dt className="text-[10px] tracking-[0.25em] text-paper/45">TAREFAS</dt>
          <dd className="text-2xl font-light">
            {end.tasksDone}
            <span className="text-sm text-paper/40">/{end.tasksTotal}</span>
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
        {isHost || !hostOnline ? (
          <button
            type="button"
            onClick={() => client.send({ type: "backToLobby" })}
            className="border border-paper bg-paper py-4 text-sm tracking-[0.3em] text-ink"
          >
            JOGAR NOVAMENTE
          </button>
        ) : (
          <p className="border border-paper/15 py-4 text-[11px] tracking-[0.25em] text-paper/55">AGUARDANDO O HOST · REMATCH</p>
        )}
        <button type="button" onClick={() => client.leave()} className="border border-paper/20 py-3 text-xs tracking-[0.3em] text-paper/70">
          SAIR DA SALA
        </button>
      </div>
    </div>
  );
}
