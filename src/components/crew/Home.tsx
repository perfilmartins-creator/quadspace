"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { NAME_MAX, PASSWORD_MAX, PASSWORD_MIN, normalizeRoomCode, sanitizeName } from "@/lib/crew/constants";
import { crew } from "@/lib/content";
import { CREW_AVAILABLE } from "@/lib/crew/server-url";
import { CharacterIcon } from "./CharacterIcon";
import { unlockAudio } from "./feedback";
import type { CrewClient, Snapshot } from "./net";
import { btnBlue, btnGhost, btnPrimary, card, input } from "./ui";

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

const labelCls = "block pb-1.5 text-sm font-semibold text-white/75";
const PARADE = ["red", "blue", "yellow", "green", "pink", "cyan"];

/** Lê ?sala=CODE (link/QR compartilhado) — precisa estar dentro de <Suspense>. */
export function HomeWithParams(props: { client: CrewClient; snapshot: Snapshot }) {
  const params = useSearchParams();
  const code = normalizeRoomCode(params.get("sala"));
  return <Home {...props} initialCode={code} />;
}

export function Home({ client, snapshot, initialCode }: { client: CrewClient; snapshot: Snapshot; initialCode: string | null }) {
  const [view, setView] = useState<View>(initialCode ? "join" : "menu");
  const [code, setCode] = useState(initialCode ?? "");
  const busy = snapshot.status === "connecting";

  return (
    <div className="crew-stars absolute inset-0 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <button
          type="button"
          onClick={() => setView("menu")}
          className="flex flex-col items-center text-center animate-[crew-rise_0.7s_cubic-bezier(0.16,1,0.3,1)_both]"
        >
          <Image src="/brand/estrelas-branco.png" alt="" width={62} height={18} priority />
          <span className="crew-outline mt-3 text-[clamp(2.8rem,15vw,4.2rem)] leading-[0.95] font-bold text-[#ffd23d]">AMOUNG</span>
          <span className="crew-outline text-[clamp(2.8rem,15vw,4.2rem)] leading-[0.95] font-bold text-white">QUAD</span>
          <span className="mt-4 flex items-end justify-center gap-1">
            {PARADE.map((c, i) => (
              <span key={c} className="inline-block animate-[crew-float_2.4s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.18}s` }}>
                <CharacterIcon color={c} size={i === 2 || i === 3 ? 52 : 42} />
              </span>
            ))}
          </span>
        </button>

        {!CREW_AVAILABLE && (
          <div className={`${card} mt-8 flex flex-col items-center gap-3 p-6 text-center`}>
            <p className="text-lg font-bold text-[#ffd23d]">Em breve</p>
            <p className="text-sm text-white/70">{crew.tagline}</p>
            <Link href="/game" className="pt-2 text-sm font-semibold text-white/50 hover:text-white">
              ← QUAD BOUNCE
            </Link>
          </div>
        )}

        {CREW_AVAILABLE && view === "menu" && (
          <div className="mt-8 flex flex-col gap-4 animate-[crew-rise_0.6s_cubic-bezier(0.16,1,0.3,1)_0.08s_both]">
            <div className={`${card} p-5`}>
              <p className="pb-4 text-center text-[15px] text-white/80">{crew.tagline}</p>
              <button type="button" onClick={() => setView("create")} className={`${btnPrimary} w-full py-4 text-xl`}>
                ✦ Criar sala
              </button>
              <div className="my-4 flex items-center gap-3 text-sm font-semibold text-white/50">
                <span className="h-[3px] flex-1 rounded-full bg-[#16172a]" />
                ou entre com o código
                <span className="h-[3px] flex-1 rounded-full bg-[#16172a]" />
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  unlockAudio();
                  setView("join");
                }}
              >
                <input
                  className={`${input} min-w-0 flex-1 text-center text-2xl font-bold tracking-[0.4em] uppercase`}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
                  aria-label="Código da sala"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="ABCD"
                />
                <button type="submit" className={`${btnBlue} px-5 text-lg`}>
                  Entrar
                </button>
              </form>
            </div>

            <HowToPlay />

            <Link href="/game" className="pt-1 text-center text-sm font-semibold text-white/45 hover:text-white">
              ← QUAD BOUNCE
            </Link>
          </div>
        )}

        {CREW_AVAILABLE && view !== "menu" && (
          <RoomForm
            key={view}
            client={client}
            snapshot={snapshot}
            mode={view}
            initialCode={code}
            busy={busy}
            onBack={() => {
              client.clearError();
              setView("menu");
            }}
          />
        )}
      </div>
    </div>
  );
}

const RULES: { title: string; body: string[] }[] = [
  {
    title: "O lobby",
    body: [
      "Enquanto a galera chega, o lobby já é jogo: ande, chute a bola, faça gol, cumpra missões e mande emotes.",
      "Precisa sair um pouco? Fique na SAFE ZONE: ninguém te atrapalha lá. Pronto para jogar? Pare na READY ZONE ou toque em PRONTO?.",
      "O host escolhe o modo e as configurações nos totens (ou nos ícones do topo) e inicia quando todos estiverem prontos.",
    ],
  },
  {
    title: "Modos de jogo",
    body: [
      "Clássico: tripulantes fazem tarefas e votam; o infiltrado elimina e sabota.",
      "Esconde-esconde: um caçador é liberado depois de alguns segundos; os fugitivos sobrevivem até o tempo acabar. Tarefas tiram segundos do relógio.",
      "Infecção: quem é pego vira infectado. Os saudáveis vencem se alguém sobreviver até o fim.",
    ],
  },
  {
    title: "O objetivo",
    body: [
      "Tripulantes: completem todas as tarefas da QUAD ou descubram e expulsem os infiltrados.",
      "Infiltrados: eliminem tripulantes sem serem descobertos até empatar o número.",
    ],
  },
  {
    title: "Tripulante",
    body: [
      "Siga a lista de Missões no canto da tela; o mapa mostra onde cada uma está.",
      "Achou um corpo? Toque em REPORTAR. Suspeitou de alguém? Aperte o botão de reunião na Recepção.",
      "Se morrer, vira fantasma: ainda pode terminar suas tarefas e conversar com outros fantasmas.",
    ],
  },
  {
    title: "Infiltrado",
    body: [
      "ELIMINAR quem estiver perto (tem tempo de recarga). Finja fazer tarefas para não levantar suspeita.",
      "SABOTAR apaga as luzes, tranca portas ou derruba o sistema — esse último a equipe precisa consertar a tempo.",
      "Use os DUTOS para sumir de uma sala e aparecer em outra.",
    ],
  },
  {
    title: "Reunião",
    body: ["Todos conversam no chat e votam em quem expulsar. Pode pular o voto. Quem tiver mais votos sai da nave… quer dizer, do estúdio."],
  },
  {
    title: "Júlio, a cabra",
    body: [
      "O Júlio mora na QUAD e passeia sozinho pelo estúdio. Ele aparece no mapa e bale de vez em quando.",
      "Chegue perto e toque em CARINHO para ele parar e dar um “Méééé!”. Ele não tem lado: não ajuda nem atrapalha ninguém… ou será que sim?",
    ],
  },
  {
    title: "Controles",
    body: [
      "Celular: arraste o polegar na metade esquerda para andar; botões grandes à direita.",
      "Computador: WASD/setas para andar · E ou Espaço usar/interagir · R reportar (no lobby: READY) · Q eliminar · F sabotar · V duto · M mapa · T emotes.",
    ],
  },
];

function HowToPlay() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className={`${card} overflow-hidden`}>
      <p className="px-5 pt-4 pb-2 text-lg font-bold text-white">Como jogar</p>
      <ul className="px-3 pb-3">
        {RULES.map((r, i) => (
          <li key={r.title} className="border-t-2 border-[#16172a]/60 first:border-t-0">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="flex w-full items-center justify-between px-2 py-3 text-left text-[15px] font-semibold text-[#ffd23d]"
            >
              {r.title}
              <span className={`text-white/60 transition-transform ${open === i ? "rotate-90" : ""}`}>▸</span>
            </button>
            {open === i && (
              <div className="space-y-2 px-2 pb-3 text-sm leading-relaxed text-white/80 animate-[crew-fade_0.15s_ease-out_both]">
                {r.body.map((b) => (
                  <p key={b}>{b}</p>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
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
  initialCode: string;
  busy: boolean;
  onBack: () => void;
}) {
  const [name, setName] = useState(savedName);
  const [code, setCode] = useState(initialCode);
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
      className={`${card} mt-8 flex flex-col gap-4 p-5 animate-[crew-rise_0.4s_ease-out_both]`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p className="text-center text-xl font-bold text-white">{mode === "create" ? "Criar sala" : "Entrar na sala"}</p>
      <label>
        <span className={labelCls}>Seu nome</span>
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
          <span className={labelCls}>Código da sala</span>
          <input
            className={`${input} text-center text-2xl font-bold tracking-[0.4em] uppercase`}
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
            placeholder="ABCD"
          />
        </label>
      )}
      <label>
        <span className={labelCls}>{mode === "create" ? "Defina uma senha" : "Senha da sala"}</span>
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
            className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-white/55"
          >
            {showPassword ? "ocultar" : "mostrar"}
          </button>
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-xl border-[3px] border-[#16172a] bg-[#ff4d5e] px-3 py-2.5 text-sm font-semibold text-white">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-4 text-xl`}>
        {busy ? "Conectando…" : mode === "create" ? "Criar sala" : "Entrar"}
      </button>
      {busy && <p className="-mt-2 text-center text-xs text-white/50">O primeiro acesso pode levar alguns segundos.</p>}
      <button type="button" onClick={onBack} className={`${btnGhost} w-full py-2.5 text-base`}>
        Voltar
      </button>
    </form>
  );
}
