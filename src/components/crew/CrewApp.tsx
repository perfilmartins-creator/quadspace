"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { GameScreen } from "./GameScreen";
import { Home, HomeWithParams } from "./Home";
import { CrewClient } from "./net";

export function CrewApp() {
  const [client] = useState(() => new CrewClient());
  const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);

  useEffect(() => {
    // Recarregou a página no meio da partida? Volta para a mesma sala.
    client.resumeSaved();

    window.addEventListener("online", client.handleOnline);
    const prevent = (event: Event) => event.preventDefault();
    document.addEventListener("gesturestart", prevent);
    document.addEventListener("gesturechange", prevent);
    document.addEventListener("dblclick", prevent);
    return () => {
      client.dispose();
      window.removeEventListener("online", client.handleOnline);
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
      document.removeEventListener("dblclick", prevent);
    };
  }, [client]);

  return (
    <main
      id="conteudo"
      data-crew-game=""
      onContextMenu={(e) => {
        if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
      }}
      className="fixed inset-0 overflow-hidden bg-[#0f1022] font-[family-name:var(--font-crew)] text-paper select-none overscroll-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
    >
      <h1 className="sr-only">AMOUNG QUAD</h1>
      {snapshot.state ? (
        <div className="absolute inset-0 touch-none">
          <GameScreen client={client} snapshot={snapshot} />
        </div>
      ) : (
        <Suspense fallback={<Home client={client} snapshot={snapshot} initialCode={null} />}>
          <HomeWithParams client={client} snapshot={snapshot} />
        </Suspense>
      )}
      {!snapshot.state && snapshot.status === "reconnecting" && (
        <p className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] text-center text-[11px] tracking-[0.3em] text-[#ffd23d]">
          RECONECTANDO…
        </p>
      )}
    </main>
  );
}
