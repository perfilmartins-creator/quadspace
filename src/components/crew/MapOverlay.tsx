"use client";

import { useEffect, useRef } from "react";
import { CRITICAL_PANELS, DOORS, LIGHTS_PANEL, MAP_HEIGHT, MAP_WIDTH, ROOMS, TASKS, WALLS } from "@/lib/crew/map";
import type { RoomState } from "@/lib/crew/protocol";
import { IconClose } from "./icons";
import type { CrewClient } from "./net";
import { card, toyButton } from "./ui";

const ROOM_TINT: Record<string, string> = {
  estudio: "#cfcbc4",
  edicao: "#c8935f",
  lounge: "#d38a62",
  corredor: "#9aa0b4",
  equipamentos: "#7f93ad",
  recepcao: "#e4ddd0",
};

/** Planta da QUAD: você, suas tarefas pendentes e sabotagens ativas. */
export function MapOverlay({ client, state, onClose }: { client: CrewClient; state: RoomState; onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const font = getComputedStyle(canvas).fontFamily;
    let raf = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(rect.width * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }
      const k = Math.min(canvas.width / MAP_WIDTH, canvas.height / MAP_HEIGHT);
      const ox = (canvas.width - MAP_WIDTH * k) / 2;
      const oy = (canvas.height - MAP_HEIGHT * k) / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(k, 0, 0, k, ox, oy);

      for (const r of ROOMS) {
        ctx.fillStyle = ROOM_TINT[r.id] ?? "#aaa";
        ctx.fillRect(r.rect.x, r.rect.y, r.rect.w, r.rect.h);
      }
      ctx.fillStyle = "#16172a";
      for (const w of WALLS) ctx.fillRect(w.x - 4, w.y - 4, w.w + 8, w.h + 8);
      const closed = state.sabotage.doors?.doors ?? [];
      ctx.fillStyle = "#ff4d5e";
      for (const d of DOORS) if (closed.includes(d.id)) ctx.fillRect(d.rect.x, d.rect.y, d.rect.w, d.rect.h);

      ctx.font = `700 ${Math.round(30 / Math.max(k, 0.3)) / 2}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 10;
      ctx.strokeStyle = "#16172a";
      ctx.fillStyle = "#ffffff";
      for (const r of ROOMS) {
        ctx.strokeText(r.name, r.rect.x + r.rect.w / 2, r.rect.y + r.rect.h / 2);
        ctx.fillText(r.name, r.rect.x + r.rect.w / 2, r.rect.y + r.rect.h / 2);
      }
      ctx.lineWidth = 6;

      const pulse = 0.5 + 0.5 * Math.sin(t * 0.008);
      if (state.phase === "playing") {
        for (const task of state.you.tasks) {
          if (task.done) continue;
          const st = TASKS.find((x) => x.id === task.id);
          if (!st) continue;
          ctx.fillStyle = "#ffd23d";
          ctx.beginPath();
          ctx.arc(st.pos.x, st.pos.y, 16 + pulse * 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        const sab: { x: number; y: number }[] = [];
        if (state.sabotage.lights) sab.push(LIGHTS_PANEL);
        if (state.sabotage.critical) sab.push(...CRITICAL_PANELS.map((p) => p.pos));
        ctx.fillStyle = `rgba(255,77,94,${0.5 + 0.5 * pulse})`;
        for (const p of sab) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 24, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const me = client.local;
      ctx.fillStyle = "#4fb6ff";
      ctx.beginPath();
      ctx.arc(me.x, me.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(79,182,255,0.7)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(me.x, me.y, 34 + pulse * 10, 0, Math.PI * 2);
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [client, state]);

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-[#0f1022]/80 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-sm animate-[crew-fade_0.15s_ease-out_both]"
      onClick={onClose}
    >
      <div className={`${card} flex max-h-full w-full max-w-3xl flex-col p-3`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-2">
          <p className="pl-1 text-xl font-bold text-white">Mapa da QUAD</p>
          <button type="button" onClick={onClose} aria-label="Fechar mapa" className={`${toyButton} h-10 w-10 bg-[#ff4d5e] text-white`}>
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <canvas ref={ref} className="max-h-[calc(100dvh-10rem)] min-h-0 w-full rounded-xl border-[3px] border-[#16172a] bg-[#1b1c2b]"
          style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }} aria-label="Mapa com sua posição e tarefas" />
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 text-sm font-semibold text-white/80">
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-[#16172a] bg-[#4fb6ff]" /> Você
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-[#16172a] bg-[#ffd23d]" /> Suas tarefas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-[#16172a] bg-[#ff4d5e]" /> Sabotagem
          </span>
          <span className="hidden text-white/45 [@media(pointer:fine)]:inline">M para fechar</span>
        </div>
      </div>
    </div>
  );
}
