"use client";

import { useState } from "react";
import { COLORS, MIN_PLAYERS, SETTING_LIMITS, type GameModeId, type NumericSettingKey, type Settings } from "@/lib/crew/constants";
import { LOBBY_MISSIONS } from "@/lib/crew/missions";
import { MODES, PRESETS, SETTING_LABELS, modeOf } from "@/lib/crew/modes";
import type { RoomState } from "@/lib/crew/protocol";
import { CharacterIcon } from "./CharacterIcon";
import { ChatBox } from "./Chat";
import { unlockAudio, vibrate } from "./feedback";
import type { CrewClient, Snapshot } from "./net";
import { toyButton } from "./ui";

const sectionTitle = "pb-2 pt-3 text-xs font-bold tracking-wider text-white/50 uppercase";

// ---------- PERSONAGEM ----------

export function CharacterPanel({ client, state }: { client: CrewClient; state: RoomState }) {
  const me = state.players.find((p) => p.id === state.you.id);
  const taken = new Set(state.players.filter((p) => p.id !== state.you.id).map((p) => p.color));
  const editable = state.phase === "lobby" || state.phase === "ended";
  return (
    <div>
      <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <CharacterIcon color={me?.color ?? "white"} size={56} />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-white">{me?.name}</p>
          <p className="text-xs text-white/50">A cor muda na hora para todo mundo.</p>
        </div>
      </div>
      <p className={sectionTitle}>Cor</p>
      <div className="grid grid-cols-6 gap-2">
        {COLORS.map((c) => {
          const mine = me?.color === c.id;
          const used = taken.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              aria-label={`${c.name}${mine ? " (sua cor)" : used ? " (ocupada)" : ""}`}
              aria-pressed={mine}
              disabled={used || !editable}
              onClick={() => {
                unlockAudio();
                client.send({ type: "color", color: c.id });
                vibrate(8);
              }}
              className={`relative flex aspect-square min-h-11 items-center justify-center rounded-full border-[3px] border-[#16172a] transition-transform ${
                mine ? "scale-105 ring-[3px] ring-white" : ""
              } ${used ? "opacity-35" : "active:scale-95"}`}
              style={{ backgroundColor: c.hex }}
            >
              {used && <span className="text-lg font-bold text-[#16172a]">×</span>}
            </button>
          );
        })}
      </div>
      <p className="pt-2 text-xs text-white/45">◉ sua cor · × ocupada</p>
      {!editable && <p className="pt-2 text-xs text-[#ffd23d]">Durante a contagem as cores ficam travadas.</p>}
    </div>
  );
}

// ---------- JOGADORES (+ chat) ----------

export function PlayersPanel({ client, snapshot }: { client: CrewClient; snapshot: Snapshot }) {
  const state = snapshot.state!;
  const [tab, setTab] = useState<"players" | "chat">("players");
  const isHost = state.hostId === state.you.id;
  const canManage = isHost && (state.phase === "lobby" || state.phase === "ended");
  const [copied, setCopied] = useState(false);
  const tabCls = (on: boolean) => `flex-1 rounded-xl py-2 text-sm font-semibold ${on ? "bg-white/15 text-white" : "text-white/55"}`;
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex gap-1 rounded-2xl bg-black/20 p-1">
        <button type="button" className={tabCls(tab === "players")} onClick={() => setTab("players")}>
          Jogadores {state.players.length}/{state.settings.maxPlayers}
        </button>
        <button type="button" className={tabCls(tab === "chat")} onClick={() => setTab("chat")}>
          Chat
        </button>
      </div>
      {tab === "chat" ? (
        <ChatBox client={client} snapshot={snapshot} channel="lobby" className="h-[38dvh] rounded-2xl bg-black/20 md:h-[60dvh]" />
      ) : (
        <>
          <ul className="space-y-1">
            {state.players.map((p) => (
              <li key={p.id} className="flex items-center gap-2.5 rounded-2xl px-2 py-1.5 hover:bg-white/5">
                <CharacterIcon color={p.color} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">
                    {p.name}
                    {p.id === state.you.id && <span className="font-normal text-white/45"> (você)</span>}
                  </span>
                  <span className="flex flex-wrap gap-1 pt-0.5">
                    {p.isHost && <Badge color="#ffd23d">HOST</Badge>}
                    {p.ready ? <Badge color="#3ddc84">READY</Badge> : <Badge color="#3a3f66" light>AGUARDANDO</Badge>}
                    {p.afk && <Badge color="#9aa0b4">AFK</Badge>}
                    {p.safe && <Badge color="#7fe6ff">SAFE</Badge>}
                    {!p.connected && <Badge color="#ff9a3d">RECONECTANDO</Badge>}
                  </span>
                </span>
                {canManage && p.id !== state.you.id && (
                  <span className="flex shrink-0 flex-col gap-1">
                    <button type="button" onClick={() => client.send({ type: "transferHost", playerId: p.id })} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#ffd23d] hover:bg-white/10">
                      Tornar host
                    </button>
                    <button type="button" onClick={() => client.send({ type: "kick", playerId: p.id })} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#ff8a95] hover:bg-white/10">
                      Remover
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-black/20 p-3">
            <span>
              <span className="block text-[11px] text-white/50">Código da sala</span>
              <span className="text-2xl font-bold tracking-[0.2em] text-[#ffd23d]">{state.code}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                const link = `${window.location.origin}/game/crew?sala=${state.code}`;
                void navigator.clipboard?.writeText(link).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className={`${toyButton} bg-[#4fb6ff] px-3 py-2 text-sm text-[#16172a]`}
            >
              {copied ? "Copiado!" : "Copiar link"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Badge({ color, light = false, children }: { color: string; light?: boolean; children: React.ReactNode }) {
  return (
    <span className={`rounded-md px-1.5 text-[10px] leading-4 font-bold ${light ? "text-white/60" : "text-[#16172a]"}`} style={{ backgroundColor: color }}>
      {children}
    </span>
  );
}

// ---------- MODOS ----------

export function ModesPanel({ client, state }: { client: CrewClient; state: RoomState }) {
  const isHost = state.hostId === state.you.id && state.phase === "lobby";
  return (
    <div className="space-y-2">
      {!isHost && <p className="pb-1 text-sm text-white/55">Só o host escolhe o modo.</p>}
      {(Object.keys(MODES) as GameModeId[]).map((id) => {
        const m = MODES[id];
        const active = state.settings.gameMode === id;
        return (
          <button
            key={id}
            type="button"
            disabled={!isHost}
            onClick={() => {
              client.send({ type: "settings", settings: { gameMode: id } });
              vibrate(10);
            }}
            className={`block w-full rounded-2xl border-[3px] p-3 text-left transition-colors ${
              active ? "border-[#ffd23d] bg-[#ffd23d]/15" : "border-[#16172a] bg-white/5 enabled:hover:bg-white/10"
            }`}
          >
            <span className="flex items-center justify-between">
              <span className="text-base font-bold text-white">{m.name}</span>
              {active && <span className="rounded-md bg-[#ffd23d] px-1.5 text-[10px] font-bold text-[#16172a]">ATUAL</span>}
            </span>
            <span className="block pt-0.5 text-sm text-white/65">{m.tagline}</span>
            <span className="flex gap-2 pt-1.5 text-[11px] font-semibold">
              <span style={{ color: m.roles.crew.color }}>{m.roles.crew.plural}</span>
              <span className="text-white/30">vs</span>
              <span style={{ color: m.roles.infiltrator.color }}>{m.roles.infiltrator.name}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- CONFIGURAÇÕES ----------

export function SettingsPanel({ client, state }: { client: CrewClient; state: RoomState }) {
  const isHost = state.hostId === state.you.id;
  const editable = isHost && state.phase === "lobby";
  const s = state.settings;
  const mode = modeOf(s);
  const update = (patch: Partial<Settings>) => client.send({ type: "settings", settings: patch });
  const keys: NumericSettingKey[] = [...mode.settings, "maxPlayers"];
  return (
    <div>
      {!isHost && <p className="pb-1 text-sm text-white/55">Só o host altera. Você pode ver como a partida está configurada.</p>}
      <p className={sectionTitle}>Configuração rápida</p>
      <div className="grid grid-cols-4 gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={!editable}
            onClick={() => client.send({ type: "preset", preset: p.id })}
            className={`rounded-xl border-2 px-1 py-2 text-center text-sm font-bold ${
              s.preset === p.id ? "border-[#ffd23d] bg-[#ffd23d] text-[#16172a]" : "border-white/10 bg-white/5 text-white"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
      <p className="pt-1 text-xs text-white/45">{s.preset === "custom" ? "CUSTOM: ajustado manualmente." : PRESETS.find((p) => p.id === s.preset)?.hint}</p>

      <p className={sectionTitle}>{mode.name}</p>
      <div className="divide-y divide-white/5">
        {keys.map((key) => {
          const { min, max, step } = SETTING_LIMITS[key];
          const value = s[key];
          const label = SETTING_LABELS[key];
          return (
            <div key={key} className="flex items-center justify-between gap-2 py-1.5">
              <span className="text-sm font-semibold text-white/85">{label.label}</span>
              <span className="flex items-center gap-1">
                <Stepper sign="−" disabled={!editable || value <= min} onClick={() => update({ [key]: value - step })} />
                <span className="w-14 text-center text-sm font-semibold text-white tabular-nums">{label.format(value)}</span>
                <Stepper sign="+" disabled={!editable || value >= max} onClick={() => update({ [key]: value + step })} />
              </span>
            </div>
          );
        })}
        {mode.toggles.includes("revealRoleOnEject") && (
          <Toggle label="Confirmar expulsões (revelar papel)" value={s.revealRoleOnEject} disabled={!editable} onChange={(v) => update({ revealRoleOnEject: v })} />
        )}
        {mode.toggles.includes("anonymousVotes") && <Toggle label="Votos anônimos" value={s.anonymousVotes} disabled={!editable} onChange={(v) => update({ anonymousVotes: v })} />}
      </div>

      <p className={sectionTitle}>Sala</p>
      <Toggle label="Iniciar só com todos READY" value={s.requireAllReady} disabled={!editable} onChange={(v) => update({ requireAllReady: v })} />
      {isHost && state.phase === "lobby" && (
        <button type="button" onClick={() => client.send({ type: "resetBall" })} className={`${toyButton} mt-3 w-full bg-[#3a3f66] py-2.5 text-sm text-white`}>
          Resetar bola
        </button>
      )}
      <p className="pt-3 text-xs text-white/40">Mínimo de {MIN_PLAYERS} jogadores para começar.</p>
    </div>
  );
}

function Stepper({ sign, disabled, onClick }: { sign: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={sign === "+" ? "Aumentar" : "Diminuir"}
      className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg font-bold text-white disabled:opacity-25"
    >
      {sign}
    </button>
  );
}

function Toggle({ label, value, disabled, onChange }: { label: string; value: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className="flex min-h-11 w-full items-center justify-between gap-3 py-1.5 text-left disabled:opacity-60"
    >
      <span className="text-sm font-semibold text-white/85">{label}</span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${value ? "bg-[#3ddc84]" : "bg-white/15"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-[left] ${value ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

// ---------- MISSÕES ----------

export function MissionsPanel({ state }: { state: RoomState }) {
  const you = state.you;
  return (
    <div>
      <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
        <span className="text-sm font-semibold text-white/70">XP de lobby</span>
        <span className="text-2xl font-bold text-[#ffd23d]">{you.xp}</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {LOBBY_MISSIONS.map((m, i) => {
          const done = i < you.missionsDone;
          const current = i === you.missionsDone && you.mission;
          return (
            <li key={m.id} className={`rounded-2xl p-3 ${current ? "bg-[#ffd23d]/12 ring-2 ring-[#ffd23d]" : "bg-white/5"} ${!done && !current ? "opacity-50" : ""}`}>
              <span className="flex items-center justify-between gap-2">
                <span className={`text-sm font-semibold ${done ? "text-[#3ddc84] line-through" : "text-white"}`}>
                  {done ? "✓ " : ""}
                  {m.label}
                </span>
                <span className="text-xs font-bold text-[#ffd23d]">+{m.reward} XP</span>
              </span>
              {current && you.mission && (
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-black/30">
                  <span className="block h-full rounded-full bg-[#ffd23d] transition-[width]" style={{ width: `${(you.mission.progress / you.mission.target) * 100}%` }} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {!you.mission && <p className="pt-3 text-center text-sm font-semibold text-[#3ddc84]">Todas as missões concluídas!</p>}
      <p className="pt-3 text-xs text-white/40">Missões do lobby são só diversão enquanto a galera chega. Missão do dia: em breve.</p>
    </div>
  );
}
