"use client";

import { useState } from "react";
import { COLORS, MIN_PLAYERS, SETTING_LIMITS, maxInfiltratorsFor, type Settings } from "@/lib/crew/constants";
import { CharacterIcon } from "./CharacterIcon";
import { ChatBox } from "./Chat";
import { sfx, unlockAudio, vibrate } from "./feedback";
import type { CrewClient, Snapshot } from "./net";
import { btnGhost, btnPrimary, panel, toyButton } from "./ui";

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
        <div className={`${panel} mx-3 mb-2 max-h-[52dvh] overflow-hidden animate-[crew-rise_0.25s_ease-out_both] sm:mx-auto sm:w-[28rem]`}>
          {sheet === "players" && <PlayersSheet client={client} snapshot={snapshot} isHost={isHost} />}
          {sheet === "settings" && <SettingsSheet client={client} settings={state.settings} players={state.players.length} />}
          {sheet === "chat" && <ChatBox client={client} snapshot={snapshot} channel="lobby" className="h-[40dvh]" />}
        </div>
      )}

      <div className="mx-3 flex flex-col gap-2 sm:mx-auto sm:w-[28rem]">
        {/* Cores */}
        <div className={`${panel} flex items-center gap-2 overflow-x-auto px-2.5 py-2.5`}>
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
                className={`h-9 w-9 shrink-0 rounded-full border-[3px] border-[#16172a] transition-transform ${mine ? "scale-110 ring-[3px] ring-white" : ""} ${used ? "opacity-20" : ""}`}
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
            Chat{unread > 0 ? ` · ${unread}` : ""}
          </button>
          {isHost && (
            <button type="button" onClick={() => toggle("settings")} className={tab(sheet === "settings")}>
              Ajustes
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
            className={`${btnPrimary} py-4 text-xl`}
          >
            {canStart ? "▶ Iniciar partida" : `Aguardando ${MIN_PLAYERS - connected} jogador${MIN_PLAYERS - connected === 1 ? "" : "es"}`}
          </button>
        ) : (
          <p className={`${panel} py-4 text-center text-base font-semibold text-white/70`}>
            Aguardando o host iniciar…
          </p>
        )}
      </div>
    </div>
  );
}

function tab(active: boolean) {
  return `${active ? `${toyButton} bg-[#4fb6ff] text-[#16172a]` : btnGhost} flex-1 px-3 py-2.5 text-sm`;
}

function PlayersSheet({ client, snapshot, isHost }: { client: CrewClient; snapshot: Snapshot; isHost: boolean }) {
  const state = snapshot.state!;
  return (
    <ul className="max-h-[52dvh] divide-y-2 divide-[#16172a]/60 overflow-y-auto">
      {state.players.map((p) => (
        <li key={p.id} className="flex items-center gap-3 px-3 py-2">
          <CharacterIcon color={p.color} size={36} />
          <span className="min-w-0 flex-1 truncate font-semibold">
            {p.name}
            {p.id === state.you.id && <span className="font-normal text-white/45"> (você)</span>}
          </span>
          {p.isHost && <span className="rounded-md bg-[#ffd23d] px-1.5 text-[10px] font-bold text-[#16172a]">HOST</span>}
          {!p.connected && <span className="text-[10px] tracking-[0.2em] text-[#ffd23d]">RECONECTANDO</span>}
          {isHost && p.id !== state.you.id && (
            <button
              type="button"
              onClick={() => client.send({ type: "kick", playerId: p.id })}
              className={`${toyButton} bg-[#ff4d5e] px-2 py-1 text-xs text-white`}
            >
              Remover
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
    <div className="max-h-[52dvh] divide-y-2 divide-[#16172a]/60 overflow-y-auto">
      {NUMERIC.map(({ key, label, format }) => {
        const { min, max, step } = SETTING_LIMITS[key];
        const value = settings[key];
        return (
          <div key={key} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="text-sm font-semibold text-white/85">{label}</span>
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
      className={`${toyButton} h-9 w-9 bg-[#3a3f66] text-lg leading-none text-white`}
      aria-label={label === "+" ? "Aumentar" : "Diminuir"}
    >
      {label}
    </button>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="text-sm font-semibold text-white/85">{label}</span>
      <div className="flex">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`w-14 border-[3px] border-[#16172a] py-1 text-xs font-bold first:rounded-l-xl last:rounded-r-xl ${value === v ? "bg-[#3ddc84] text-[#16172a]" : "bg-[#15172b] text-white/60"}`}
          >
            {v ? "SIM" : "NÃO"}
          </button>
        ))}
      </div>
    </div>
  );
}
