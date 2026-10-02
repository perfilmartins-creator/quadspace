"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { NAME_MAX, PASSWORD_MAX, PASSWORD_MIN, normalizeRoomCode, sanitizeName } from "@/lib/crew/constants";
import { crew } from "@/lib/content";
import { CREW_AVAILABLE } from "@/lib/crew/server-url";
import { unlockAudio } from "./feedback";
import type { CrewClient, Snapshot } from "./net";

type View = "menu" | "create" | "join";

const NAME_KEY = "quad-crew:name";

function savedName() {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // sem storage
  }
}

const input =
  "w-full border border-paper/20 bg-transparent px-4 py-3.5 text-base text-paper outline-none transition-colors placeholder:text-paper/25 focus:border-paper select-text";
const labelCls = "block pb-1.5 text-[10px] tracking-[0.3em] text-paper/50";
const primary =
  "w-full border border-paper bg-paper py-4 text-sm tracking-[0.3em] text-ink transition-colors hover:bg-ink hover:text-paper disabled:border-paper/20 disabled:bg-transparent disabled:text-paper/40";

/** Lê ?sala=CODE (link/QR compartilhado) — precisa estar dentro de <Suspense>. */
export function HomeWithParams(props: { client: CrewClient; snapshot: Snapshot }) {
  const params = useSearchParams();
  const code = normalizeRoomCode(params.get("sala"));
  return <Home {...props} initialCode={code} />;
}

export function Home({ client, snapshot, initialCode }: { client: CrewClient; snapshot: Snapshot; initialCode: string | null }) {
  const [view, setView] = useState<View>(initialCode ? "join" : "menu");
  const busy = snapshot.status === "connecting";

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <button type="button" onClick={() => setView("menu")} className="flex flex-col items-center text-center animate-[crew-rise_0.7s_cubic-bezier(0.16,1,0.3,1)_both]">
          <Image src="/brand/estrelas-branco.png" alt="" width={62} height={18} priority />
          <span className="mt-4 pl-[0.5em] text-[10px] tracking-[0.5em] text-paper/50">{crew.name}</span>
          <span className="mt-3 pl-[0.55em] text-xs tracking-[0.55em]">QUAD</span>
          <span className="text-[clamp(4rem,24vw,6.5rem)] leading-[0.9] font-light tracking-tightest">CREW</span>
        </button>

        {!CREW_AVAILABLE && (
          <div className="mt-auto flex flex-col items-center gap-4 pt-12 text-center">
            <p className="text-xs tracking-[0.45em] text-paper/60">EM BREVE</p>
            <p className="text-sm text-paper/55">{crew.tagline}</p>
            <Link href="/game" className="pt-4 text-xs text-paper/40 hover:text-paper">
              ← QUAD BOUNCE
            </Link>
          </div>
        )}

        {CREW_AVAILABLE && view === "menu" && (
          <div className="mt-auto flex flex-col gap-3 pt-12 animate-[crew-rise_0.7s_cubic-bezier(0.16,1,0.3,1)_0.1s_both]">
            <p className="pb-4 text-center text-sm text-paper/55">{crew.tagline}</p>
            <button type="button" onClick={() => setView("join")} className={primary}>
              ENTRAR EM UMA SALA
            </button>
            <button type="button" onClick={() => setView("create")} className="w-full border border-paper/40 py-4 text-sm tracking-[0.3em] transition-colors hover:border-paper">
              CRIAR SALA
            </button>
            <Link href="/game" className="pt-4 text-center text-xs text-paper/40 hover:text-paper">
              ← QUAD BOUNCE
            </Link>
          </div>
        )}

        {CREW_AVAILABLE && view !== "menu" && (
          <RoomForm key={view} client={client} snapshot={snapshot} mode={view} initialCode={initialCode} busy={busy} onBack={() => setView("menu")} />
        )}
      </div>
    </div>
  );
}

function RoomForm({
  client,
  snapshot,
  mode,
  initialCode,
  busy,
  onBack,
}: {
  client: CrewClient;
  snapshot: Snapshot;
  mode: "create" | "join";
  initialCode: string | null;
  busy: boolean;
  onBack: () => void;
}) {
  const [name, setName] = useState(savedName);
  const [code, setCode] = useState(initialCode ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError ?? snapshot.error?.message ?? null;

  const submit = () => {
    unlockAudio();
    client.clearError();
    const clean = sanitizeName(name);
    if (!clean) return setLocalError("Nome inválido. Use de 2 a 16 letras ou números.");
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      return setLocalError(`A senha precisa ter de ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres.`);
    }
    if (mode === "join") {
      const normalized = normalizeRoomCode(code);
      if (!normalized) return setLocalError("O código da sala tem 4 caracteres.");
      setLocalError(null);
      rememberName(clean);
      client.joinRoom(normalized, password, clean);
    } else {
      setLocalError(null);
      rememberName(clean);
      client.createRoom(clean, password);
    }
  };

  return (
    <form
      className="mt-auto flex flex-col gap-4 pt-10 animate-[crew-rise_0.4s_ease-out_both]"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p className="text-center text-xs tracking-[0.4em] text-paper/60">{mode === "create" ? "CRIAR SALA" : "ENTRAR EM UMA SALA"}</p>
      <label>
        <span className={labelCls}>SEU NOME</span>
        <input
          className={input}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setLocalError(null);
          }}
          maxLength={NAME_MAX}
          autoComplete="nickname"
          autoCapitalize="words"
          placeholder="Ex.: Gabriel"
          enterKeyHint="next"
        />
      </label>
      {mode === "join" && (
        <label>
          <span className={labelCls}>CÓDIGO DA SALA</span>
          <input
            className={`${input} text-center text-2xl tracking-[0.5em] uppercase`}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4));
              setLocalError(null);
            }}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Q7XP"
          />
        </label>
      )}
      <label>
        <span className={labelCls}>{mode === "create" ? "DEFINA UMA SENHA" : "SENHA DA SALA"}</span>
        <span className="relative block">
          <input
            className={`${input} pr-20`}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setLocalError(null);
            }}
            maxLength={PASSWORD_MAX}
            autoComplete={mode === "create" ? "new-password" : "current-password"}
            autoCapitalize="none"
            placeholder="Ex.: QUAD123"
            enterKeyHint="go"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-[10px] tracking-[0.2em] text-paper/50"
          >
            {showPassword ? "OCULTAR" : "MOSTRAR"}
          </button>
        </span>
      </label>

      {error && (
        <p role="alert" className="border border-[#ff4d3d]/50 bg-[#ff4d3d]/10 px-3 py-2.5 text-sm text-[#ffb3ab]">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className={primary}>
        {busy ? "CONECTANDO…" : mode === "create" ? "CRIAR SALA" : "ENTRAR"}
      </button>
      {busy && <p className="-mt-2 text-center text-xs text-paper/40">O primeiro acesso pode levar alguns segundos.</p>}
      <button type="button" onClick={onBack} className="py-2 text-xs tracking-[0.3em] text-paper/45">
        VOLTAR
      </button>
    </form>
  );
}
