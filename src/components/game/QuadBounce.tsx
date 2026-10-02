"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { game } from "@/lib/content";
import { CREW_AVAILABLE } from "@/lib/crew/server-url";
import { readBest, readServerBest, saveBest, subscribeBest } from "./best-score";
import { FIELD_WIDTH, MAX_FIELD_ASPECT } from "./config";
import {
  readGlobalBest,
  readServerGlobalBest,
  refreshGlobalRecord,
  submitGlobalScore,
  subscribeGlobalBest,
} from "./global-record";
import {
  createWorld,
  drainEvents,
  resizeWorld,
  startRun,
  step,
  tryPlace,
  type World,
} from "./engine";
import { render, type View } from "./renderer";

type Phase = "menu" | "playing" | "paused" | "over";

type Controller = {
  start: () => void;
  restart: () => void;
  resume: () => void;
  place: (clientX: number, clientY: number) => void;
};

/** Espera entre a queda da bola e a tela de GAME OVER. */
const GAME_OVER_DELAY = 550;
/** Evita que toques da partida acionem "jogar novamente" sem querer. */
const RESTART_GUARD = 650;
const MAX_FRAME_DT = 0.05;
const MAX_DPR = 2.5;

/** Recorde mostrado no jogo: o global (todos os jogadores) ou, sem rede, o local. */
function currentBest() {
  return readGlobalBest() ?? readBest();
}

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  } catch {
    // Vibração é opcional.
  }
}

const label = "text-xs tracking-[0.3em] pl-[0.3em] text-paper/50";
const primaryButton =
  "border border-paper bg-paper py-4 text-sm tracking-[0.3em] text-ink transition-colors touch-manipulation hover:bg-ink hover:text-paper";

export function QuadBounce() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [result, setResult] = useState({ score: 0, newBest: false });
  const [restartReady, setRestartReady] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const personalBest = useSyncExternalStore(subscribeBest, readBest, readServerBest);
  const globalBest = useSyncExternalStore(subscribeGlobalBest, readGlobalBest, readServerGlobalBest);
  const best = globalBest ?? personalBest;

  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  const controllerRef = useRef<Controller | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !stage || !canvas || !ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const view: View = {
      width: 1,
      height: 1,
      dpr: 1,
      fontFamily: getComputedStyle(document.body).fontFamily,
      reducedMotion: motionQuery.matches,
      best: currentBest(),
    };

    let world: World = createWorld(200);
    let paused = false;
    let raf = 0;
    let last = performance.now();
    let shownScore = -1;
    let deaths = 0;
    const timers = new Set<number>();

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      view.width = width;
      view.height = height;
      view.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * view.dpr);
      canvas.height = Math.round(height * view.dpr);

      const fieldHeight = height / (width / FIELD_WIDTH);
      if (world.mode === "attract" && Math.abs(world.height - fieldHeight) > 1) {
        world = createWorld(fieldHeight);
      } else {
        resizeWorld(world, fieldHeight);
      }
      render(ctx, world, view);
    };

    const handleEvents = () => {
      for (const event of drainEvents(world)) {
        if (event.type === "place") {
          vibrate(10);
          setShowHint(false);
        } else if (event.type === "perfect") {
          vibrate(20);
        } else if (event.type === "death") {
          vibrate([40, 40, 70]);
          const { score } = event;
          const death = ++deaths;
          const personal = score > readBest();
          if (personal) saveBest(score);

          // Mostra "novo recorde" na hora e confirma com o servidor em seguida.
          const knownGlobal = readGlobalBest();
          let newBest = knownGlobal === null ? personal : score > knownGlobal;
          let shown = false;
          void submitGlobalScore(score).then((isRecord) => {
            if (isRecord === null || death !== deaths) return;
            newBest = isRecord;
            if (shown) setResult({ score, newBest });
          });

          later(() => {
            shown = true;
            setResult({ score, newBest });
            setPhase("over");
            later(() => setRestartReady(true), RESTART_GUARD);
          }, GAME_OVER_DELAY);
        }
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(MAX_FRAME_DT, Math.max(0, (now - last) / 1000));
      last = now;
      if (!paused) step(world, dt);
      handleEvents();
      if (world.score !== shownScore && scoreRef.current) {
        shownScore = world.score;
        scoreRef.current.textContent = String(world.score);
      }
      render(ctx, world, view);
    };

    const beginRun = () => {
      view.best = currentBest();
      // Token novo para validar a pontuação desta partida no servidor.
      void refreshGlobalRecord();
      startRun(world);
      paused = false;
      setShowHint(true);
      setPhase("playing");
    };

    controllerRef.current = {
      start: () => {
        if (world.mode === "attract") beginRun();
      },
      restart: () => {
        world = createWorld(world.height);
        setRestartReady(false);
        beginRun();
      },
      resume: () => {
        paused = false;
        last = performance.now();
        setPhase("playing");
      },
      place: (clientX, clientY) => {
        if (paused || world.mode !== "playing") return;
        const rect = canvas.getBoundingClientRect();
        const ppu = rect.width / FIELD_WIDTH;
        tryPlace(world, (clientX - rect.left) / ppu, world.cam + (rect.bottom - clientY) / ppu);
      },
    };

    const pause = () => {
      if (world.mode !== "playing" || paused) return;
      paused = true;
      setPhase("paused");
    };
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    const onMotionChange = (event: MediaQueryListEvent) => {
      view.reducedMotion = event.matches;
    };
    const prevent = (event: Event) => event.preventDefault();

    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pause);
    motionQuery.addEventListener("change", onMotionChange);
    // Safari iOS: bloqueia pinça/zoom e o "elástico" da página.
    document.addEventListener("gesturestart", prevent);
    document.addEventListener("gesturechange", prevent);
    root.addEventListener("touchmove", prevent, { passive: false });

    void refreshGlobalRecord();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pause);
      motionQuery.removeEventListener("change", onMotionChange);
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
      root.removeEventListener("touchmove", prevent);
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (phase === "over" && restartReady) restartRef.current?.focus({ preventScroll: true });
  }, [phase, restartReady]);

  const inRun = phase === "playing" || phase === "paused";

  return (
    <main
      id="conteudo"
      ref={rootRef}
      data-quad-game=""
      onContextMenu={(event) => event.preventDefault()}
      className="fixed inset-0 flex touch-none justify-center overflow-hidden overscroll-none bg-[#050505] text-paper select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
    >
      <h1 className="sr-only">{game.title}</h1>

      <div
        ref={stageRef}
        className="@container relative h-full w-full border-x border-paper/[0.07] bg-ink"
        style={{ maxWidth: `calc(100dvh * ${MAX_FIELD_ASPECT})` }}
      >
        <canvas
          ref={canvasRef}
          aria-label="Área do jogo: toque para criar plataformas"
          className="absolute inset-0 block h-full w-full"
          onPointerDown={(event) => {
            event.preventDefault();
            controllerRef.current?.place(event.clientX, event.clientY);
          }}
        />

        {/* Placar */}
        <div
          aria-hidden={!inRun}
          className={`pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-[calc(env(safe-area-inset-top)+1.25rem)] transition-opacity duration-300 ${
            inRun ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="flex items-baseline gap-1.5 font-light text-5xl leading-none tracking-tightest tabular-nums">
            <span ref={scoreRef}>0</span>
            <span className="text-sm tracking-normal text-paper/40">m</span>
          </p>
        </div>

        {phase === "playing" && showHint && (
          <p className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+11%)] px-6 text-center text-sm text-paper/55 animate-[quad-game-fade_0.6s_ease-out_0.5s_both]">
            {game.hint}
          </p>
        )}

        {phase === "menu" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center px-6 pt-[calc(env(safe-area-inset-top)+min(11svh,6rem))] pb-[calc(env(safe-area-inset-bottom)+1.75rem)]">
            <div className="flex flex-col items-center text-center animate-[quad-game-in_0.9s_cubic-bezier(0.16,1,0.3,1)_both]">
              <Image src="/brand/estrelas-branco.png" alt="" width={62} height={18} priority />
              <p className="mt-5 pl-[0.55em] text-xs tracking-[0.55em]">{game.brand}</p>
              <p className="mt-1 font-light text-[clamp(2.75rem,min(18cqw,15svh),6rem)] leading-none tracking-tightest">
                {game.name}
              </p>
              <p className="mt-5 text-sm whitespace-pre-line text-paper/55 [@media(max-height:520px)]:hidden">{game.tagline}</p>
            </div>

            <div className="pointer-events-auto mt-auto flex flex-col items-center gap-5 animate-[quad-game-in_0.9s_cubic-bezier(0.16,1,0.3,1)_0.15s_both]">
              <button
                type="button"
                onClick={() => controllerRef.current?.start()}
                className={`${primaryButton} min-w-48 pl-[calc(3rem+0.3em)] pr-12`}
              >
                {game.play}
              </button>
              {best > 0 && (
                <p className={label}>
                  {game.best} {best}
                </p>
              )}
              <div className="flex items-center gap-5">
                <Link href="/" className="text-xs text-paper/40 transition-colors hover:text-paper">
                  ← {game.backToSite}
                </Link>
                {CREW_AVAILABLE && (
                  <Link href="/game/crew" className="text-xs text-paper/40 transition-colors hover:text-paper">
                    QUAD CREW →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {phase === "paused" && (
          <button
            type="button"
            onClick={() => controllerRef.current?.resume()}
            className="absolute inset-0 flex touch-manipulation flex-col items-center justify-center gap-3 bg-ink/75 animate-[quad-game-fade_0.25s_ease-out_both]"
          >
            <span className="pl-[0.4em] text-sm tracking-[0.4em]">{game.paused}</span>
            <span className="text-sm text-paper/55">{game.resume}</span>
          </button>
        )}

        {phase === "over" && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quad-game-over"
            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-ink/80 px-6 py-6 animate-[quad-game-fade_0.4s_ease-out_both]"
          >
            <div className="flex flex-col items-center text-center animate-[quad-game-in_0.7s_cubic-bezier(0.16,1,0.3,1)_both]">
              <p id="quad-game-over" className="pl-[0.4em] text-sm tracking-[0.4em]">
                {game.gameOver}
              </p>

              <p className={`${label} mt-[min(3rem,6svh)]`}>{game.score}</p>
              <p className="mt-2 font-light text-[clamp(3rem,min(22cqw,16svh),7rem)] leading-none tracking-tightest tabular-nums">
                {result.score}
              </p>
              {result.newBest && (
                <p className="mt-3 pl-[0.3em] text-xs tracking-[0.3em] text-paper">{game.newBest}</p>
              )}

              <p className={`${label} mt-[min(2rem,4svh)]`}>{game.best}</p>
              <p className="mt-2 font-light text-3xl leading-none tabular-nums">{best}</p>
              {globalBest !== null && personalBest > 0 && personalBest < globalBest && (
                <p className="mt-3 text-xs text-paper/40">
                  {game.personalBest} {personalBest}
                </p>
              )}

              <button
                ref={restartRef}
                type="button"
                onClick={() => controllerRef.current?.restart()}
                className={`${primaryButton} mt-[min(3rem,6svh)] w-64 max-w-full whitespace-nowrap px-6 pl-[calc(1.5rem+0.3em)] ${
                  restartReady ? "" : "pointer-events-none opacity-50"
                }`}
              >
                {game.playAgain}
              </button>
              <Link
                href="/"
                className="mt-[min(1.5rem,4svh)] text-xs text-paper/40 transition-colors hover:text-paper"
              >
                ← {game.backToSite}
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
