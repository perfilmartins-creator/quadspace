"use client";

import { useEffect, useRef } from "react";
import { CRITICAL_PANELS, DOORS, LIGHTS_PANEL, MAP_HEIGHT, MAP_WIDTH, ROOMS, TASKS, WALLS } from "@/lib/crew/map";
import type { RoomState } from "@/lib/crew/protocol";
import type { CrewClient } from "./net";

/** Planta da QUAD: você, suas tarefas pendentes e sabotagens ativas. */
export function MapOverlay({ client, state, onClose }: { client: CrewClient; state: RoomState; onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const font = getComputedStyle(document.body).fontFamily;
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

      ctx.fillStyle = "#151210";
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      ctx.fillStyle = "#d9d7d2";
      for (const w of WALLS) ctx.fillRect(w.x, w.y, w.w, w.h);
      const closed = state.sabotage.doors?.doors ?? [];
      ctx.fillStyle = "#ff4d3d";
      for (const d of DOORS) if (closed.includes(d.id)) ctx.fillRect(d.rect.x, d.rect.y, d.rect.w, d.rect.h);

      ctx.font = `400 ${Math.round(26 / Math.max(k, 0.3)) / 2}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      for (const r of ROOMS) ctx.fillText(r.name, r.rect.x + r.rect.w / 2, r.rect.y + r.rect.h / 2);

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
        }
        const sab: { x: number; y: number }[] = [];
        if (state.sabotage.lights) sab.push(LIGHTS_PANEL);
        if (state.sabotage.critical) sab.push(...CRITICAL_PANELS.map((p) => p.pos));
        ctx.fillStyle = `rgba(255,77,61,${0.5 + 0.5 * pulse})`;
        for (const p of sab) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 24, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const me = client.local;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(me.x, me.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(me.x, me.y, 34 + pulse * 10, 0, Math.PI * 2);
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [client, state]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-ink/90 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-sm animate-[crew-fade_0.15s_ease-out_both]">
      <div className="flex items-center justify-between px-4 pb-2">
        <p className="text-xs tracking-[0.35em] text-paper/70">MAPA DA QUAD</p>
        <button type="button" onClick={onClose} className="border border-paper/30 px-3 py-1.5 text-[11px] tracking-[0.2em]">
          FECHAR
        </button>
      </div>
      <canvas ref={ref} className="min-h-0 w-full flex-1" onClick={onClose} aria-label="Mapa com sua posição e tarefas" />
      <p className="px-4 pt-2 text-center text-[11px] text-paper/50">● você · <span className="text-[#ffd23d]">●</span> tarefas · <span className="text-[#ff4d3d]">●</span> sabotagem</p>
    </div>
  );
}
