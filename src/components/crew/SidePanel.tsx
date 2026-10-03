"use client";

import { useEffect } from "react";
import { IconClose } from "./icons";

/**
 * Painel genérico (personagem, jogadores, configurações, modos, missões).
 * Celular: bottom sheet baixo, o jogo continua visível em cima.
 * Desktop/tablet (≥ 768px): gaveta lateral direita de ~340px.
 * Fundo semiopaco: o mapa continua aparecendo atrás.
 */
export function SidePanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-40">
      <button type="button" aria-label="Fechar painel" onClick={onClose} className="absolute inset-0 bg-[#0b0c16]/25 animate-[crew-fade_0.15s_ease-out_both]" />
      <section
        role="dialog"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 flex max-h-[min(62dvh,560px)] flex-col rounded-t-3xl border-t-[3px] border-[#16172a] bg-[#1f2238]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md animate-[crew-sheet-in_0.2s_cubic-bezier(0.2,0.9,0.3,1)_both] md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:max-h-none md:w-[340px] md:rounded-none md:rounded-l-3xl md:border-t-0 md:border-l-[3px] md:pt-[env(safe-area-inset-top)] md:pr-[env(safe-area-inset-right)] md:animate-[crew-drawer-in_0.2s_cubic-bezier(0.2,0.9,0.3,1)_both]"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-white/20 md:hidden" aria-hidden="true" />
        <header className="flex items-center justify-between px-4 pt-2 pb-2 md:pt-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full text-white/70 hover:bg-white/10"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
      </section>
    </div>
  );
}
