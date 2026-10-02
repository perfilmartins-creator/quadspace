"use client";

import { useState } from "react";
import { COLORS, MIN_PLAYERS, SETTING_LIMITS, maxInfiltratorsFor, type Settings } from "@/lib/crew/constants";
import { CharacterIcon } from "./CharacterIcon";
import { ChatBox } from "./Chat";
import { sfx, unlockAudio, vibrate } from "./feedback";
import type { CrewClient, Snapshot } from "./net";

type Sheet = null | "players" | "settings" | "chat";

export function LobbyPanel({ client, snapshot }: { client: CrewClient; snapshot: Snapshot }) {
  const state = snapshot.state!;
  const [sheet, setSheet] = useState<Sheet>(null);
  const isHost = state.hostId === state.you.id;
  const me = state.players.find((p) => p.id === state.you.id);
  const taken = new Set(state.players.filter((p) => p.id !== state.you.id).map((p) => p.color));
  const connected = state.players.filter((p) => p.connected).length;
  const canStart = isHost && connected >= MIN_PLAYERS;
  const unread = snapshot.chat.filter((m) => m.channel === "lobby").length;

  const toggle = (s: Sheet) => setSheet((cur) => (cur === s ? null : s));

  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col items-stretch pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      {sheet && (
        <div className="mx-3 mb-2 max-h-[52dvh] overflow-hidden border border-paper/15 bg-ink/90 backdrop-blur animate-[crew-rise_0.25s_ease-out_both] sm:mx-auto sm:w-[28rem]">
          {sheet === "players" && <PlayersSheet client={client} snapshot={snapshot} isHost={isHost} />}
          {sheet === "settings" && <SettingsSheet client={client} settings={state.settings} players={state.players.length} />}
          {sheet === "chat" && <ChatBox client={client} snapshot={snapshot} channel="lobby" className="h-[40dvh]" />}
        </div>
      )}

      <div className="mx-3 flex flex-col gap-2 sm:mx-auto sm:w-[28rem]">
        {/* Cores */}
        <div className="flex items-center gap-2 overflow-x-auto border border-paper/15 bg-ink/70 px-2 py-2 backdrop-blur">
          {COLORS.map((c) => {
            const mine = me?.color === c.id;
            const used = taken.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-label={`Cor ${c.name}${used ? " (em uso)" : ""}`}
                disabled={used}
                onClick={() => {
                  unlockAudio();
                  client.send({ type: "color", color: c.id });
                  vibrate(8);
                }}
                className={`h-8 w-8 shrink-0 rounded-full border-2 transition-transform ${mine ? "scale-110 border-paper" : "border-transparent"} ${used ? "opacity-20" : ""}`}
                style={{ backgroundColor: c.hex }}
              />
            );
          })}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => toggle("players")} className={tab(sheet === "players")}>
            {state.players.length}/{state.settings.maxPlayers}
          </button>
          <button type="button" onClick={() => toggle("chat")} className={tab(sheet === "chat")}>
            CHAT{unread > 0 ? ` · ${unread}` : ""}
          </button>
          {isHost && (
            <button type="button" onClick={() => toggle("settings")} className={tab(sheet === "settings")}>
              AJUSTES
            </button>
          )}
        </div>

        {isHost ? (
          <button
            type="button"
            disabled={!canStart}
            onClick={() => {
              unlockAudio();
              sfx.tap();
              client.send({ type: "start" });
            }}
            className="border border-paper bg-paper py-4 text-sm tracking-[0.35em] text-ink transition-colors disabled:border-paper/20 disabled:bg-transparent disabled:text-paper/40"
          >
            {canStart ? "INICIAR" : `AGUARDANDO ${MIN_PLAYERS - connected} JOGADOR${MIN_PLAYERS - connected === 1 ? "" : "ES"}`}
          </button>
        ) : (
          <p className="border border-paper/15 bg-ink/70 py-4 text-center text-[11px] tracking-[0.3em] text-paper/60 backdrop-blur">
            AGUARDANDO O HOST INICIAR
          </p>
        )}
      </div>
    </div>
  );
}

function tab(active: boolean) {
  return `flex-1 border px-3 py-2.5 text-[11px] tracking-[0.2em] backdrop-blur transition-colors ${
    active ? "border-paper bg-paper text-ink" : "border-paper/15 bg-ink/70 text-paper/75"
  }`;
}

function PlayersSheet({ client, snapshot, isHost }: { client: CrewClient; snapshot: Snapshot; isHost: boolean }) {
  const state = snapshot.state!;
  return (
    <ul className="max-h-[52dvh] divide-y divide-paper/10 overflow-y-auto">
      {state.players.map((p) => (
        <li key={p.id} className="flex items-center gap-3 px-3 py-2">
          <CharacterIcon color={p.color} size={36} />
          <span className="min-w-0 flex-1 truncate">
            {p.name}
            {p.id === state.you.id && <span className="text-paper/40"> (você)</span>}
          </span>
          {p.isHost && <span className="text-[10px] tracking-[0.25em] text-paper/50">HOST</span>}
          {!p.connected && <span className="text-[10px] tracking-[0.2em] text-[#ffd23d]">RECONECTANDO</span>}
          {isHost && p.id !== state.you.id && (
            <button
              type="button"
              onClick={() => client.send({ type: "kick", playerId: p.id })}
              className="border border-[#ff4d3d]/50 px-2 py-1 text-[10px] tracking-[0.2em] text-[#ff8a7e]"
            >
              REMOVER
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

type NumericKey = keyof typeof SETTING_LIMITS;

const NUMERIC: { key: NumericKey; label: string; format: (v: number) => string }[] = [
  { key: "infiltrators", label: "Infiltrados", format: (v) => String(v) },
  { key: "maxPlayers", label: "Máximo de jogadores", format: (v) => String(v) },
  { key: "speed", label: "Velocidade", format: (v) => `${v.toFixed(2)}x` },
  { key: "killCooldown", label: "Cooldown de eliminação", format: (v) => `${v}s` },
  { key: "tasksPerPlayer", label: "Tarefas por jogador", format: (v) => String(v) },
  { key: "discussionTime", label: "Tempo de discussão", format: (v) => `${v}s` },
  { key: "votingTime", label: "Tempo de votação", format: (v) => `${v}s` },
  { key: "emergencyPerPlayer", label: "Reuniões por jogador", format: (v) => String(v) },
];

function SettingsSheet({ client, settings, players }: { client: CrewClient; settings: Settings; players: number }) {
  const update = (patch: Partial<Settings>) => client.send({ type: "settings", settings: patch });
  return (
    <div className="max-h-[52dvh] divide-y divide-paper/10 overflow-y-auto">
      {NUMERIC.map(({ key, label, format }) => {
        const { min, max, step } = SETTING_LIMITS[key];
        const value = settings[key];
        return (
          <div key={key} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="text-sm text-paper/80">{label}</span>
            <div className="flex items-center gap-1">
              <Stepper label="−" disabled={value <= min} onClick={() => update({ [key]: value - step })} />
              <span className="w-14 text-center text-sm tabular-nums">{format(value)}</span>
              <Stepper label="+" disabled={value >= max} onClick={() => update({ [key]: value + step })} />
            </div>
          </div>
        );
      })}
      {settings.infiltrators > maxInfiltratorsFor(players) && (
        <p className="px-3 py-2 text-xs text-[#ffd23d]">Com menos de 7 jogadores a partida usa 1 infiltrado.</p>
      )}
      <Toggle label="Revelar papel após votação" value={settings.revealRoleOnEject} onChange={(v) => update({ revealRoleOnEject: v })} />
      <Toggle label="Votos anônimos" value={settings.anonymousVotes} onChange={(v) => update({ anonymousVotes: v })} />
    </div>
  );
}

function Stepper({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-9 w-9 border border-paper/20 text-lg leading-none disabled:opacity-25"
      aria-label={label === "+" ? "Aumentar" : "Diminuir"}
    >
      {label}
    </button>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="text-sm text-paper/80">{label}</span>
      <div className="flex">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`w-14 border py-1.5 text-[11px] tracking-[0.2em] ${value === v ? "border-paper bg-paper text-ink" : "border-paper/20 text-paper/60"}`}
          >
            {v ? "SIM" : "NÃO"}
          </button>
        ))}
      </div>
    </div>
  );
}
