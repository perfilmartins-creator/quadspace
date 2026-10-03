"use client";

import { useEffect, useState } from "react";
import { colorHex } from "@/lib/crew/constants";
import { CharacterIcon } from "./CharacterIcon";
import { ChatBox } from "./Chat";
import { sfx, vibrate } from "./feedback";
import { formatClock } from "./hooks";
import type { CrewClient, Snapshot } from "./net";
import { btnGhost, btnPrimary, card } from "./ui";

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
      <div className="crew-stars absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center animate-[crew-fade_0.2s_ease-out_both]">
        <div className={`absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 border-y-[3px] border-[#16172a] ${report ? "bg-[#ffd23d]/25" : "bg-[#ff4d5e]/25"} animate-[crew-pulse_0.6s_ease-in-out_infinite]`} />
        <p className={`crew-outline relative text-[clamp(2rem,9vw,3.4rem)] leading-none font-bold ${report ? "text-[#ffd23d]" : "text-[#ff4d5e]"}`}>
          {report ? "CORPO ENCONTRADO!" : "REUNIÃO DE EMERGÊNCIA!"}
        </p>
        {report && victim && (
          <div className="relative mt-6 animate-[crew-pop_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
            <CharacterIcon color={victim.color} size={96} dead />
          </div>
        )}
        <p className="relative mt-6 text-2xl font-semibold">
          {report ? `${victim?.name ?? "Alguém"} foi eliminado` : `${caller?.name ?? "Alguém"} convocou`}
        </p>
        {report && caller && <p className="relative mt-2 text-sm text-white/60">Reportado por {caller.name}</p>}
      </div>
    );
  }

  const voting = stage === "voting";
  const result = meeting.result;
  const canVote = voting && you.alive && you.vote === null;
  const players = state.players;
  const label = stage === "discussion" ? "Discussão" : stage === "voting" ? "Quem é o infiltrado?" : "Resultado";

  const vote = (target: string) => {
    client.send({ type: "vote", target });
    setSelected(null);
    sfx.vote();
    vibrate(25);
  };

  return (
    <div className="crew-stars absolute inset-0 z-30 flex flex-col pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[env(safe-area-inset-bottom)] animate-[crew-fade_0.25s_ease-out_both] backdrop-blur-sm sm:items-center">
      <div className="flex w-full max-w-xl min-h-0 flex-1 flex-col">
        <header className="flex items-end justify-between px-4 pb-3">
          <div>
            <p className="text-xs font-semibold text-white/55">Reunião chamada por {caller?.name}</p>
            <p className="crew-outline text-3xl font-bold text-white">{label}</p>
          </div>
          {stage !== "result" && (
            <p className={`rounded-2xl border-[3px] border-[#16172a] px-3 py-1 text-2xl font-bold tabular-nums shadow-[0_4px_0_#16172a] ${meeting.endsAt - now < 10_000 ? "bg-[#ff4d5e] text-white" : "bg-[#ffd23d] text-[#16172a]"}`}>
              {formatClock(meeting.endsAt - now)}
            </p>
          )}
        </header>

        {stage === "discussion" && (
          <p className="px-4 pb-2 text-sm text-white/65">Converse com o grupo. A votação começa em instantes.</p>
        )}
        {voting && !you.alive && <p className="px-4 pb-2 text-sm text-white/65">Fantasmas não votam.</p>}
        {voting && you.alive && you.vote !== null && <p className="px-4 pb-2 text-sm font-semibold text-[#3ddc84]">Voto registrado. Aguardando os outros.</p>}

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
                  className={`relative flex w-full items-center gap-2 rounded-2xl border-[3px] border-[#16172a] px-2 py-1.5 text-left shadow-[0_3px_0_#16172a] transition-colors ${
                    result?.ejectedId === p.id ? "bg-[#ff4d5e]" : isSelected ? "bg-[#4fb6ff] text-[#16172a]" : "bg-[#2f3354]"
                  } ${dead ? "opacity-40" : ""}`}
                >
                  <CharacterIcon color={p.color} size={34} dead={dead} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${dead ? "line-through" : ""}`}>{p.name}</span>
                    {p.id === you.id && <span className="block text-[11px] opacity-60">você</span>}
                  </span>
                  {voting && voted && <span className="rounded-md border-2 border-[#16172a] bg-[#3ddc84] px-1 text-[10px] font-bold text-[#16172a]">VOTOU</span>}
                  {result && (
                    <span className="flex items-center gap-0.5">
                      {voters.length > 0
                        ? voters.map((v) => (
                            <span key={v} className="h-3 w-3 rounded-full border-2 border-[#16172a]" style={{ backgroundColor: colorHex(players.find((x) => x.id === v)?.color ?? "white") }} />
                          ))
                        : count > 0 && <span className="text-sm font-bold tabular-nums">{count}</span>}
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
              <button type="button" onClick={() => vote(selected)} className={`${btnPrimary} flex-1 py-3 text-base`}>
                Votar em {players.find((p) => p.id === selected)?.name}
              </button>
              <button type="button" onClick={() => setSelected(null)} className={`${btnGhost} px-4 py-3 text-base`}>
                ✕
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!canVote}
              onClick={() => vote("skip")}
              className={`${btnGhost} flex-1 py-3 text-base`}
            >
              Pular voto{result ? ` · ${result.tally.skip ?? 0}` : ""}
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
          className={`${card} mx-3 mt-3 mb-2 min-h-[8rem] flex-1 overflow-hidden`}
        />
      </div>
    </div>
  );
}
