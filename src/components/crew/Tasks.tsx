"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CRITICAL_PANELS, taskById, type TaskId } from "@/lib/crew/map";
import type { RoomState } from "@/lib/crew/protocol";
import { sfx, vibrate } from "./feedback";
import type { UseTarget } from "./GameScreen";
import type { CrewClient } from "./net";
import { btnPrimary, toyButton } from "./ui";

export type OpenTask = Exclude<UseTarget, { kind: "emergency" } | { kind: "goat" }>;

const MIN_OPEN_MS = 1700;

/** Números estáveis por montagem (embaralhamentos e alvos dos minigames). */
function useRandom<T>(make: () => T): T {
  const [value] = useState(make);
  return value;
}

function shuffled<T>(items: T[]) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function TaskModal({ client, state, task, onClose }: { client: CrewClient; state: RoomState; task: OpenTask; onClose: () => void }) {
  const [openedAt] = useState(() => performance.now());
  const [done, setDone] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  const finishTask = (send: () => void) => {
    if (done) return;
    setDone(true);
    sfx.task();
    vibrate(25);
    const wait = Math.max(0, MIN_OPEN_MS - (performance.now() - openedAt));
    setTimeout(() => {
      send();
      setTimeout(() => closeRef.current(), 650);
    }, wait);
  };

  let title = "";
  let body: ReactNode = null;
  if (task.kind === "task") {
    const station = taskById(task.taskId);
    title = station?.name ?? "Tarefa";
    const complete = () => finishTask(() => client.send({ type: "taskComplete", taskId: task.taskId }));
    body = <TaskGame id={task.taskId} onDone={complete} />;
  } else if (task.kind === "lights") {
    title = "Quadro de luz";
    body = <LightsFix onDone={() => finishTask(() => client.send({ type: "fixLights" }))} />;
  } else {
    title = CRITICAL_PANELS.find((p) => p.id === task.panelId)?.name ?? "Painel";
    body = <PanelHold client={client} state={state} panelId={task.panelId} onResolved={onClose} />;
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-[#0f1022]/70 backdrop-blur-[2px] animate-[crew-fade_0.15s_ease-out_both] sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl border-[3px] border-[#16172a] bg-[#262a45] pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_6px_0_#16172a] animate-[crew-rise_0.25s_cubic-bezier(0.16,1,0.3,1)_both] sm:rounded-3xl">
        <header className="flex items-center justify-between px-4 py-3">
          <p className="text-lg font-bold text-[#ffd23d]">{title}</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className={`${toyButton} h-9 w-9 bg-[#ff4d5e] text-base text-white`}>
            ✕
          </button>
        </header>
        <div className="relative px-4">
          {body}
          {done && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#262a45]/90 animate-[crew-fade_0.2s_ease-out_both]">
              <p className="crew-outline text-4xl font-bold text-[#3ddc84] animate-[crew-pop_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">Concluído!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskGame({ id, onDone }: { id: TaskId; onDone: () => void }) {
  switch (id) {
    case "ajustar-luz":
      return <SliderMatch onDone={onDone} labels={["Intensidade", "Temperatura", "Difusão"]} />;
    case "color-grading":
      return <ColorGrading onDone={onDone} />;
    case "exportar-projeto":
      return <Export onDone={onDone} />;
    case "sincronizar-audio":
      return <AudioSync onDone={onDone} />;
    case "ajustar-camera":
      return <Framing onDone={onDone} />;
    case "carregar-baterias":
      return <Batteries onDone={onDone} />;
    case "organizar-cartoes":
      return <Cards onDone={onDone} />;
    case "conectar-cabos":
      return <Cables onDone={onDone} />;
    case "montar-set":
      return <PlaceItems onDone={onDone} items={["Cadeira", "Softbox", "Câmera"]} hint="Toque no item e depois no lugar marcado." />;
    case "organizar-equipamentos":
      return <PlaceItems onDone={onDone} items={["Lente 50mm", "Câmera", "Microfone"]} hint="Guarde cada equipamento no espaço certo do case." />;
  }
}

const sliderClass =
  "h-10 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[#15172b] [&::-webkit-slider-thumb]:mt-[-10px] [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[#16172a] [&::-webkit-slider-thumb]:bg-[#ffd23d] [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-[#16172a] [&::-moz-range-thumb]:bg-[#ffd23d] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-[#15172b]";

function Hint({ children }: { children: ReactNode }) {
  return <p className="pb-3 text-sm text-white/70">{children}</p>;
}

/** AJUSTAR LUZ: leve cada slider até a marca. */
function SliderMatch({ onDone, labels }: { onDone: () => void; labels: string[] }) {
  const targets = useRandom(() => labels.map(() => 15 + Math.round(Math.random() * 70)));
  const [values, setValues] = useState(() => labels.map(() => 50));
  const ok = values.map((v, i) => Math.abs(v - targets[i]) <= 6);
  const brightness = values[0] / 100;
  useEffect(() => {
    if (ok.every(Boolean)) onDone();
  });
  return (
    <div>
      <Hint>Ajuste cada controle até a marca amarela.</Hint>
      <div className="mb-3 flex h-20 items-center justify-center rounded-xl bg-[#15172b]">
        <div
          className="h-14 w-14 rounded-full transition-all"
          style={{
            background: `hsl(${30 + values[1] * 1.6}, 80%, ${30 + brightness * 50}%)`,
            boxShadow: `0 0 ${10 + values[2] / 2}px ${values[2] / 6}px hsla(${30 + values[1] * 1.6}, 90%, 70%, ${brightness})`,
          }}
        />
      </div>
      {labels.map((label, i) => (
        <label key={label} className="block pb-1">
          <span className={`flex justify-between text-[11px] tracking-[0.2em] ${ok[i] ? "text-[#2ed47a]" : "text-paper/60"}`}>
            {label.toUpperCase()} {ok[i] && <span>OK</span>}
          </span>
          <span className="relative block">
            <span className="pointer-events-none absolute top-1/2 h-5 w-1 -translate-y-1/2 bg-[#ffd23d]" style={{ left: `calc(${targets[i]}% - 2px)` }} />
            <input
              type="range"
              min={0}
              max={100}
              value={values[i]}
              onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? Number(e.target.value) : x)))}
              className={sliderClass}
            />
          </span>
        </label>
      ))}
    </div>
  );
}

/** COLOR GRADING: deixe a sua imagem igual à referência. */
function ColorGrading({ onDone }: { onDone: () => void }) {
  const target = useRandom(() => ({ hue: 20 + Math.round(Math.random() * 280), light: 35 + Math.round(Math.random() * 30) }));
  const [hue, setHue] = useState(180);
  const [light, setLight] = useState(50);
  const ok = Math.abs(hue - target.hue) <= 12 && Math.abs(light - target.light) <= 5;
  useEffect(() => {
    if (ok) onDone();
  });
  const swatch = (h: number, l: number) => ({ background: `linear-gradient(135deg, hsl(${h},70%,${l + 15}%), hsl(${(h + 40) % 360},60%,${l - 15}%))` });
  return (
    <div>
      <Hint>Combine a sua cena com a referência.</Hint>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <p className="pb-1 text-[10px] tracking-[0.25em] text-paper/45">REFERÊNCIA</p>
          <div className="h-20" style={swatch(target.hue, target.light)} />
        </div>
        <div>
          <p className={`pb-1 text-[10px] tracking-[0.25em] ${ok ? "text-[#2ed47a]" : "text-paper/45"}`}>SUA CENA</p>
          <div className="h-20" style={swatch(hue, light)} />
        </div>
      </div>
      <p className="text-[11px] tracking-[0.2em] text-paper/60">TOM</p>
      <input type="range" min={0} max={360} value={hue} onChange={(e) => setHue(Number(e.target.value))} className={sliderClass} />
      <p className="text-[11px] tracking-[0.2em] text-paper/60">EXPOSIÇÃO</p>
      <input type="range" min={20} max={80} value={light} onChange={(e) => setLight(Number(e.target.value))} className={sliderClass} />
    </div>
  );
}

/** EXPORTAR PROJETO: inicia e aguarda a barra. */
function Export({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState<number | null>(null);
  useEffect(() => {
    if (progress === null) return;
    if (progress >= 100) {
      onDone();
      return;
    }
    const id = setTimeout(() => setProgress((p) => Math.min(100, (p ?? 0) + 2 + Math.random() * 3)), 110);
    return () => clearTimeout(id);
  });
  return (
    <div className="pb-2">
      <Hint>Renderize o vídeo final da campanha.</Hint>
      <div className="mb-2 flex items-center justify-between text-xs text-paper/60">
        <span>campanha_quad_final_v3.mp4</span>
        <span className="tabular-nums">{Math.floor(progress ?? 0)}%</span>
      </div>
      <div className="mb-4 h-3 w-full bg-paper/10">
        <div className="h-full bg-[#3d7bff] transition-[width] duration-100" style={{ width: `${progress ?? 0}%` }} />
      </div>
      <button
        type="button"
        disabled={progress !== null}
        onClick={() => setProgress(0)}
        className={`${btnPrimary} w-full py-3 text-base`}
      >
        {progress === null ? "Exportar" : "Exportando…"}
      </button>
    </div>
  );
}

function wavePath(offset: number, seed: number) {
  let d = "M0 30";
  for (let x = 0; x <= 300; x += 4) {
    const t = x + offset;
    const y = 30 + Math.sin(t * 0.07 + seed) * 12 * Math.sin(t * 0.013 + seed * 2) + Math.sin(t * 0.31 + seed) * 4;
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return d;
}

/** SINCRONIZAR ÁUDIO: alinhe a onda da câmera com a do gravador. */
function AudioSync({ onDone }: { onDone: () => void }) {
  const seed = useRandom(() => Math.random() * 10);
  const target = useRandom(() => (Math.random() < 0.5 ? -1 : 1) * (40 + Math.round(Math.random() * 60)));
  const [offset, setOffset] = useState(0);
  const ok = Math.abs(offset - target) <= 4;
  useEffect(() => {
    if (ok) onDone();
  });
  return (
    <div>
      <Hint>Arraste até as duas ondas ficarem alinhadas.</Hint>
      <svg viewBox="0 0 300 60" className="mb-1 h-16 w-full bg-ink">
        <path d={wavePath(target, seed)} stroke="#3de0ff" strokeWidth="2" fill="none" />
      </svg>
      <svg viewBox="0 0 300 60" className="mb-2 h-16 w-full bg-ink">
        <path d={wavePath(offset, seed)} stroke={ok ? "#2ed47a" : "#ff6fb5"} strokeWidth="2" fill="none" />
      </svg>
      <input type="range" min={-120} max={120} value={offset} onChange={(e) => setOffset(Number(e.target.value))} className={sliderClass} />
    </div>
  );
}

/** AJUSTAR CÂMERA: arraste o enquadramento até centralizar. */
function Framing({ onDone }: { onDone: () => void }) {
  const start = useRandom(() => ({ x: (Math.random() < 0.5 ? -1 : 1) * (45 + Math.random() * 30), y: (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 20) }));
  const [pos, setPos] = useState(start);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const ok = Math.hypot(pos.x, pos.y) <= 7;
  useEffect(() => {
    if (ok) onDone();
  });
  return (
    <div>
      <Hint>Arraste a cena para centralizar o modelo na mira.</Hint>
      <div
        className="relative mb-2 h-44 touch-none overflow-hidden bg-[#e9e6e0]"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setPos({ x: Math.max(-90, Math.min(90, d.px + e.clientX - d.x)), y: Math.max(-60, Math.min(60, d.py + e.clientY - d.y)) });
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <div className="absolute top-1/2 left-1/2" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
          <div className="-translate-x-1/2 -translate-y-1/2">
            <div className="mx-auto h-8 w-8 rounded-full bg-[#1d1d1d]" />
            <div className="mx-auto mt-1 h-12 w-14 rounded-t-2xl bg-[#1d1d1d]" />
          </div>
        </div>
        <div className={`pointer-events-none absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 border-2 ${ok ? "border-[#2ed47a]" : "border-[#ff4d3d]"}`} />
        <div className="pointer-events-none absolute inset-3 border border-ink/30" />
        <span className="absolute top-2 left-3 text-[10px] tracking-[0.2em] text-[#ff4d3d]">● REC</span>
      </div>
    </div>
  );
}

/** CARREGAR BATERIAS: coloque as baterias nos carregadores. */
function Batteries({ onDone }: { onDone: () => void }) {
  const [inserted, setInserted] = useState(0);
  const [charged, setCharged] = useState(false);
  useEffect(() => {
    if (inserted < 4 || charged) return;
    const id = setTimeout(() => setCharged(true), 1400);
    return () => clearTimeout(id);
  }, [inserted, charged]);
  useEffect(() => {
    if (charged) onDone();
  });
  return (
    <div>
      <Hint>Toque nas baterias para colocá-las no carregador.</Hint>
      <div className="mb-3 flex justify-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            disabled={i < inserted}
            onClick={() => {
              setInserted((n) => n + 1);
              vibrate(8);
            }}
            className="h-14 w-9 border-2 border-paper/60 bg-[#151515] disabled:opacity-0"
            aria-label={`Bateria ${i + 1}`}
          >
            <span className="mx-auto block h-1.5 w-3 -translate-y-2 bg-paper/60" />
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-3 bg-ink p-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex h-16 w-11 items-end border border-paper/20 p-1">
            {i < inserted && (
              <div className="w-full bg-[#2ed47a] transition-[height] duration-[1400ms] ease-out" style={{ height: inserted === 4 ? "100%" : "25%" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** ORGANIZAR CARTÕES: separe cartões gravados dos vazios. */
function Cards({ onDone }: { onDone: () => void }) {
  const cards = useRandom(() => shuffled(["gravado", "gravado", "gravado", "vazio", "vazio", "vazio"]));
  const [index, setIndex] = useState(0);
  const [shake, setShake] = useState(0);
  useEffect(() => {
    if (index >= cards.length) onDone();
  });
  const current = cards[index];
  const pick = (box: string) => {
    if (box === current) {
      setIndex((i) => i + 1);
      vibrate(8);
    } else {
      setShake((s) => s + 1);
      sfx.error();
    }
  };
  return (
    <div>
      <Hint>Separe os cartões de memória: gravados para o backup, vazios para formatar.</Hint>
      <div className="mb-3 flex h-24 items-center justify-center">
        {current && (
          <div key={`${index}-${shake}`} className={`flex h-20 w-16 flex-col justify-between border-2 p-1.5 ${shake ? "animate-[crew-shake_0.3s]" : "animate-[crew-pop_0.25s_ease-out]"} ${current === "gravado" ? "border-[#ffd23d] bg-[#ffd23d]/15" : "border-paper/40 bg-paper/5"}`}>
            <span className="text-[9px] tracking-wider">SD 64GB</span>
            <span className="text-[9px] tracking-wider">{current === "gravado" ? "● 238 ARQ." : "○ VAZIO"}</span>
          </div>
        )}
      </div>
      <p className="pb-2 text-center text-[11px] tracking-[0.2em] text-paper/45">{Math.min(index, cards.length)} / {cards.length}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => pick("gravado")} className={`${btnPrimary} py-3 text-base`}>
          BACKUP
        </button>
        <button type="button" onClick={() => pick("vazio")} className={`${toyButton} bg-[#3a3f66] py-3 text-base text-white`}>
          FORMATAR
        </button>
      </div>
    </div>
  );
}

const CABLE_COLORS = ["#ff4d3d", "#3d7bff", "#ffd23d", "#2ed47a"];

/** CONECTAR CABOS: ligue cada cabo ao conector da mesma cor. */
function Cables({ onDone }: { onDone: () => void }) {
  const right = useRandom(() => shuffled(CABLE_COLORS));
  const [selected, setSelected] = useState<string | null>(null);
  const [connected, setConnected] = useState<string[]>([]);
  useEffect(() => {
    if (connected.length === CABLE_COLORS.length) onDone();
  });
  const rowY = (i: number) => 22 + i * 44;
  return (
    <div>
      <Hint>Toque em um cabo e depois no conector da mesma cor.</Hint>
      <div className="relative mb-2 h-48 bg-ink">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 300 180" preserveAspectRatio="none">
          {connected.map((c) => {
            const a = CABLE_COLORS.indexOf(c);
            const b = right.indexOf(c);
            return <path key={c} d={`M40 ${rowY(a)} C150 ${rowY(a)} 150 ${rowY(b)} 260 ${rowY(b)}`} stroke={c} strokeWidth="6" fill="none" />;
          })}
        </svg>
        {CABLE_COLORS.map((c, i) => (
          <button
            key={`l-${c}`}
            type="button"
            disabled={connected.includes(c)}
            onClick={() => setSelected(c)}
            className={`absolute left-2 h-9 w-12 -translate-y-1/2 border-2 ${selected === c ? "border-paper" : "border-transparent"}`}
            style={{ top: `${(rowY(i) / 180) * 100}%`, background: c }}
            aria-label={`Cabo ${i + 1}`}
          />
        ))}
        {right.map((c, i) => (
          <button
            key={`r-${c}`}
            type="button"
            onClick={() => {
              if (!selected) return;
              if (selected === c) {
                setConnected((list) => [...list, c]);
                vibrate(10);
              } else sfx.error();
              setSelected(null);
            }}
            className="absolute right-2 flex h-9 w-12 -translate-y-1/2 items-center justify-center border border-paper/30 bg-[#151515]"
            style={{ top: `${(rowY(i) / 180) * 100}%` }}
            aria-label={`Conector ${i + 1}`}
          >
            <span className="h-4 w-4 rounded-full" style={{ background: c }} />
          </button>
        ))}
      </div>
    </div>
  );
}

const ITEM_SHAPES = ["rounded-full", "rounded-none", "rounded-t-full"];

/** MONTAR SET / ORGANIZAR EQUIPAMENTOS: toque no item e depois no lugar certo. */
function PlaceItems({ onDone, items, hint }: { onDone: () => void; items: string[]; hint: string }) {
  const slots = useRandom(() => shuffled(items.map((_, i) => i)));
  const [selected, setSelected] = useState<number | null>(null);
  const [placed, setPlaced] = useState<number[]>([]);
  useEffect(() => {
    if (placed.length === items.length) onDone();
  });
  return (
    <div>
      <Hint>{hint}</Hint>
      <div className="mb-3 grid grid-cols-3 gap-2 bg-ink p-3">
        {slots.map((itemIndex) => {
          const filled = placed.includes(itemIndex);
          return (
            <button
              key={`slot-${itemIndex}`}
              type="button"
              onClick={() => {
                if (selected === null || filled) return;
                if (selected === itemIndex) {
                  setPlaced((p) => [...p, itemIndex]);
                  vibrate(10);
                } else sfx.error();
                setSelected(null);
              }}
              className={`flex h-20 flex-col items-center justify-center border border-dashed ${filled ? "border-[#2ed47a]" : "border-paper/30"}`}
            >
              <span className={`h-8 w-8 ${ITEM_SHAPES[itemIndex]} ${filled ? "bg-paper" : "border-2 border-paper/30"}`} />
              <span className="mt-1 text-[10px] text-paper/50">{items[itemIndex]}</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((label, i) => (
          <button
            key={label}
            type="button"
            disabled={placed.includes(i)}
            onClick={() => setSelected(i)}
            className={`flex h-16 flex-col items-center justify-center border ${selected === i ? "border-paper bg-paper/10" : "border-paper/15"} disabled:opacity-20`}
          >
            <span className={`h-6 w-6 bg-paper ${ITEM_SHAPES[i]}`} />
            <span className="mt-1 text-[10px]">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Corrige o APAGÃO: ligue todas as chaves. */
function LightsFix({ onDone }: { onDone: () => void }) {
  const [switches, setSwitches] = useState(() => {
    const s = [0, 1, 2, 3, 4].map(() => Math.random() < 0.5);
    if (s.every(Boolean)) s[0] = false;
    return s;
  });
  useEffect(() => {
    if (switches.every(Boolean)) onDone();
  });
  return (
    <div>
      <Hint>Ligue todas as chaves para restaurar a luz.</Hint>
      <div className="mb-2 flex justify-between gap-2 bg-ink p-4">
        {switches.map((on, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setSwitches((s) => s.map((v, j) => (j === i ? !v : v)));
              vibrate(8);
            }}
            className="flex h-24 flex-1 flex-col items-center justify-between border border-paper/20 py-2"
            aria-label={`Chave ${i + 1} ${on ? "ligada" : "desligada"}`}
          >
            <span className={`h-2 w-2 rounded-full ${on ? "bg-[#2ed47a]" : "bg-[#ff4d3d]"}`} />
            <span className="relative h-12 w-5 border border-paper/30">
              <span className={`absolute left-0.5 h-5 w-3.5 bg-paper transition-all ${on ? "top-0.5" : "bottom-0.5"}`} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** SISTEMA OFFLINE: segure o botão enquanto outra pessoa segura o outro painel. */
function PanelHold({ client, state, panelId, onResolved }: { client: CrewClient; state: RoomState; panelId: "servidor" | "roteador"; onResolved: () => void }) {
  const [holding, setHolding] = useState(false);
  const critical = state.sabotage.critical;
  useEffect(() => {
    if (!holding) return;
    const send = () => client.send({ type: "panel", panelId });
    send();
    const id = setInterval(send, 350);
    return () => clearInterval(id);
  }, [holding, client, panelId]);
  useEffect(() => {
    if (!critical) onResolved();
  }, [critical, onResolved]);
  return (
    <div className="pb-2">
      <Hint>Segure o botão. Outra pessoa precisa segurar o outro painel ao mesmo tempo.</Hint>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {CRITICAL_PANELS.map((p) => {
          const on = critical?.panels[p.id] ?? false;
          return (
            <div key={p.id} className={`border px-3 py-2 text-center text-[11px] tracking-[0.2em] ${on ? "border-[#2ed47a] text-[#2ed47a]" : "border-paper/20 text-paper/50"}`}>
              {p.name.toUpperCase()}
              <span className="block text-[10px]">{on ? "ATIVO" : "AGUARDANDO"}</span>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setHolding(true);
          vibrate(15);
        }}
        onPointerUp={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
        onContextMenu={(e) => e.preventDefault()}
        className={`h-24 w-full touch-none border text-sm tracking-[0.3em] transition-colors ${holding ? "border-[#2ed47a] bg-[#2ed47a] text-ink" : "border-paper/40 text-paper"}`}
      >
        {holding ? "MANTENHA PRESSIONADO" : "SEGURAR"}
      </button>
    </div>
  );
}
