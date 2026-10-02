"use client";

import { useEffect, useState } from "react";
import { colorHex } from "@/lib/crew/constants";
import { CharacterIcon } from "./CharacterIcon";
import { ChatBox } from "./Chat";
import { sfx, vibrate } from "./feedback";
import { formatClock } from "./hooks";
import type { CrewClient, Snapshot } from "./net";

export function Meeting({ client, snapshot, now }: { client: CrewClient; snapshot: Snapshot; now: number }) {
  const state = snapshot.state!;
  const meeting = state.meeting!;
  const you = state.you;
  const [selected, setSelected] = useState<string | null>(null);
  const stage = meeting.stage;

  useEffect(() => {
    if (stage === "intro") {
      if (meeting.reason === "report") sfx.report();
      else sfx.meeting();
      vibrate([80, 60, 80]);
    } else if (stage === "voting") {
      sfx.meeting();
      vibrate(30);
    } else if (stage === "result") {
      sfx.vote();
    }
  }, [stage, meeting.reason]);

  const caller = state.players.find((p) => p.id === meeting.callerId);
  const victim = state.players.find((p) => p.id === meeting.victimId);

  if (stage === "intro") {
    const report = meeting.reason === "report";
    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#050505] px-6 text-center animate-[crew-fade_0.2s_ease-out_both]">
        <div className={`absolute inset-x-0 top-1/2 h-24 -translate-y-1/2 ${report ? "bg-[#ffd23d]/10" : "bg-[#ff4d3d]/10"} animate-[crew-pulse_0.6s_ease-in-out_infinite]`} />
        <p className={`relative text-sm tracking-[0.4em] ${report ? "text-[#ffd23d]" : "text-[#ff8a7e]"}`}>
          {report ? "JOGADOR ENCONTRADO" : "REUNIÃO DE EMERGÊNCIA"}
        </p>
        {report && victim && (
          <div className="relative mt-6 animate-[crew-pop_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
            <CharacterIcon color={victim.color} size={96} dead />
          </div>
        )}
        <p className="relative mt-6 text-3xl font-light tracking-tight">
          {report ? `${victim?.name ?? "Alguém"} foi eliminado` : `${caller?.name ?? "Alguém"} convocou`}
        </p>
        {report && caller && <p className="relative mt-2 text-sm text-paper/50">Reportado por {caller.name}</p>}
      </div>
    );
  }

  const voting = stage === "voting";
  const result = meeting.result;
  const canVote = voting && you.alive && you.vote === null;
  const players = state.players;
  const label = stage === "discussion" ? "DISCUSSÃO" : stage === "voting" ? "VOTAÇÃO" : "RESULTADO";

  const vote = (target: string) => {
    client.send({ type: "vote", target });
    setSelected(null);
    sfx.vote();
    vibrate(25);
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#060606]/95 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[env(safe-area-inset-bottom)] animate-[crew-fade_0.25s_ease-out_both] backdrop-blur-sm sm:items-center">
      <div className="flex w-full max-w-xl min-h-0 flex-1 flex-col">
        <header className="flex items-end justify-between px-4 pb-3">
          <div>
            <p className="text-[10px] tracking-[0.35em] text-paper/50">REUNIÃO · {caller?.name?.toUpperCase()}</p>
            <p className="text-2xl font-light tracking-[0.2em]">{label}</p>
          </div>
          {stage !== "result" && (
            <p className={`text-3xl font-light tabular-nums ${meeting.endsAt - now < 10_000 ? "text-[#ff8a7e]" : ""}`}>
              {formatClock(meeting.endsAt - now)}
            </p>
          )}
        </header>

        {stage === "discussion" && (
          <p className="px-4 pb-2 text-xs text-paper/50">Converse com o grupo. A votação começa em instantes.</p>
        )}
        {voting && !you.alive && <p className="px-4 pb-2 text-xs text-paper/50">Fantasmas não votam.</p>}
        {voting && you.alive && you.vote !== null && <p className="px-4 pb-2 text-xs text-[#2ed47a]">Voto registrado. Aguardando os outros.</p>}

        <ul className="grid shrink-0 grid-cols-2 gap-2 px-3">
          {players.map((p) => {
            const dead = !p.alive;
            const voted = meeting.voted.includes(p.id);
            const count = result?.tally[p.id] ?? 0;
            const voters = result?.votes ? Object.entries(result.votes).filter(([, t]) => t === p.id).map(([v]) => v) : [];
            const isSelected = selected === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!canVote || dead}
                  onClick={() => setSelected(isSelected ? null : p.id)}
                  className={`relative flex w-full items-center gap-2 border px-2 py-1.5 text-left transition-colors ${
                    result?.ejectedId === p.id
                      ? "border-[#ff4d3d] bg-[#ff4d3d]/10"
                      : isSelected
                        ? "border-paper bg-paper/15"
                        : "border-paper/12 bg-paper/[0.03]"
                  } ${dead ? "opacity-35" : ""}`}
                >
                  <CharacterIcon color={p.color} size={34} dead={dead} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${dead ? "line-through" : ""}`}>{p.name}</span>
                    {p.id === you.id && <span className="block text-[10px] tracking-[0.2em] text-paper/40">VOCÊ</span>}
                  </span>
                  {voting && voted && <span className="text-[10px] tracking-[0.15em] text-[#2ed47a]">VOTOU</span>}
                  {result && (
                    <span className="flex items-center gap-0.5">
                      {voters.length > 0
                        ? voters.map((v) => (
                            <span key={v} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorHex(players.find((x) => x.id === v)?.color ?? "white") }} />
                          ))
                        : count > 0 && <span className="text-sm tabular-nums">{count}</span>}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-2 px-3 pt-2">
          {selected && canVote ? (
            <>
              <button type="button" onClick={() => vote(selected)} className="flex-1 border border-paper bg-paper py-3 text-xs tracking-[0.25em] text-ink">
                VOTAR EM {players.find((p) => p.id === selected)?.name.toUpperCase()}
              </button>
              <button type="button" onClick={() => setSelected(null)} className="border border-paper/20 px-4 py-3 text-xs tracking-[0.2em]">
                ✕
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!canVote}
              onClick={() => vote("skip")}
              className="flex-1 border border-paper/25 py-3 text-xs tracking-[0.3em] text-paper/80 disabled:opacity-30"
            >
              PULAR VOTO{result ? ` · ${result.tally.skip ?? 0}` : ""}
            </button>
          )}
        </div>

        <ChatBox
          client={client}
          snapshot={snapshot}
          channel="meeting"
          show={you.alive ? ["meeting"] : ["meeting", "ghost"]}
          disabledText={you.alive ? null : "Fantasmas só observam a reunião."}
          placeholder="Diga o que você viu"
          className="mt-2 min-h-[8rem] flex-1 border-t border-paper/10"
        />
      </div>
    </div>
  );
}
