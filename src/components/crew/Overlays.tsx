"use client";

import { useEffect, useRef } from "react";
import { colorHex } from "@/lib/crew/constants";
import { CharacterIcon } from "./CharacterIcon";
import { sfx, vibrate } from "./feedback";
import type { CrewClient, Snapshot } from "./net";
import { btnGhost, btnPrimary, card } from "./ui";

const RED = "#ff4d5e";

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
          <p className="animate-[crew-pulse_1s_ease-in-out_infinite] rounded-2xl border-[3px] border-[#16172a] bg-[#ffd23d] px-4 py-2 text-sm font-bold text-[#16172a] shadow-[0_4px_0_#16172a]">
            Reconectando…
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+9.5rem)] z-40 flex flex-col items-center gap-1.5">
        {snapshot.notices.map((n) => (
          <p key={n.id} className="animate-[crew-rise_0.25s_ease-out_both] rounded-xl border-[3px] border-[#16172a] bg-[#262a45] px-3 py-1.5 text-sm font-semibold text-white shadow-[0_3px_0_#16172a]">
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
    <div className="crew-stars absolute inset-0 z-40 flex flex-col items-center justify-center animate-[crew-fade_0.2s_ease-out_both]">
      <p className="text-lg font-semibold text-white/70">A partida começa em</p>
      <p key={n} className="crew-outline mt-4 text-[9rem] leading-none font-bold text-[#ffd23d] animate-[crew-pop_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
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
        background: `radial-gradient(circle at 50% 45%, ${infiltrator ? "rgba(255,77,94,0.45)" : "rgba(79,182,255,0.35)"}, transparent 65%), #0f1022`,
      }}
    >
      <p className="text-lg font-semibold text-white/70">Você é</p>
      <p
        className="crew-outline mt-2 text-6xl font-bold animate-[crew-pop_0.6s_cubic-bezier(0.16,1,0.3,1)_both] sm:text-7xl"
        style={{ color: infiltrator ? RED : "#4fb6ff" }}
      >
        {infiltrator ? "INFILTRADO" : "TRIPULANTE"}
      </p>
      <div className="mt-6 animate-[crew-rise_0.6s_ease-out_0.2s_both]">{me && <CharacterIcon color={me.color} size={110} />}</div>
      <p className="mt-6 text-lg font-semibold text-white/90">
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
        <p className="mt-4 text-base font-semibold text-[#ff8a95]">Seu parceiro: {partners.map((p) => p.name).join(", ")}</p>
      )}
      {!infiltrator && (
        <p className="mt-4 rounded-xl border-[3px] border-[#16172a] bg-[#ff4d5e] px-3 py-1 text-sm font-bold text-white">
          {state.settings.infiltrators > 1 && state.players.length >= 7 ? "2 infiltrados entre vocês" : "1 infiltrado entre vocês"}
        </p>
      )}
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
};

function Results({ client, snapshot }: { client: CrewClient; snapshot: Snapshot }) {
  const state = snapshot.state!;
  const end = state.end!;
  const crewWon = end.winner === "crew";
  const youWon = state.you.role === end.winner;
  const isHost = state.hostId === state.you.id;
  const hostOnline = state.players.find((p) => p.id === state.hostId)?.connected;
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto crew-stars px-6 py-[calc(env(safe-area-inset-top)+2rem)] text-center animate-[crew-fade_0.4s_ease-out_both]">
      <p className={`text-2xl font-bold ${youWon ? "text-[#3ddc84]" : "text-[#ff8a95]"}`}>{youWon ? "Vitória!" : "Derrota"}</p>
      <p
        className="crew-outline mt-3 text-5xl font-bold animate-[crew-pop_0.7s_cubic-bezier(0.16,1,0.3,1)_both] sm:text-6xl"
        style={{ color: crewWon ? "#4fb6ff" : RED }}
      >
        {crewWon ? "TRIPULANTES VENCEM" : "INFILTRADOS VENCEM"}
      </p>
      <p className="mt-4 text-base text-white/70">{REASONS[end.reason]}</p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {end.infiltrators.map((p) => (
          <div key={p.id} className="flex flex-col items-center">
            <CharacterIcon color={p.color} size={72} />
            <p className="mt-1 text-sm font-semibold" style={{ color: colorHex(p.color) }}>
              {p.name}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-1 text-sm font-bold text-[#ff8a95]">{end.infiltrators.length > 1 ? "INFILTRADOS" : "INFILTRADO"}</p>

      <dl className={`${card} mt-8 grid w-full max-w-xs grid-cols-2 overflow-hidden text-left`}>
        <div className="border-r-[3px] border-[#16172a] px-4 py-3">
          <dt className="text-xs font-semibold text-white/55">Eliminados</dt>
          <dd className="text-3xl font-bold">{end.eliminated}</dd>
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
        {isHost || !hostOnline ? (
          <button
            type="button"
            onClick={() => client.send({ type: "backToLobby" })}
            className={`${btnPrimary} py-4 text-xl`}
          >
            Jogar novamente
          </button>
        ) : (
          <p className="py-3 text-base font-semibold text-white/65">Aguardando o host para a revanche…</p>
        )}
        <button type="button" onClick={() => client.leave()} className={`${btnGhost} py-3 text-base`}>
          Sair da sala
        </button>
      </div>
    </div>
  );
}
