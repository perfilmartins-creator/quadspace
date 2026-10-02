"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT_MAX, colorHex } from "@/lib/crew/constants";
import type { ChatChannel } from "@/lib/crew/protocol";
import { unlockAudio } from "./feedback";
import type { CrewClient, Snapshot } from "./net";

type Props = {
  client: CrewClient;
  snapshot: Snapshot;
  channel: ChatChannel;
  /** Canais exibidos na lista (ex.: reunião mostra só "meeting"). */
  show?: ChatChannel[];
  disabledText?: string | null;
  placeholder?: string;
  className?: string;
};

/** Lista de mensagens + campo de texto. Mensagens são sempre renderizadas como texto. */
export function ChatBox({ client, snapshot, channel, show = [channel], disabledText = null, placeholder = "Mensagem", className = "" }: Props) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const messages = snapshot.chat.filter((m) => show.includes(m.channel));
  const count = messages.length;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div ref={listRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3 py-2 text-sm select-text">
        {messages.length === 0 && <p className="text-xs text-paper/35">Nenhuma mensagem ainda.</p>}
        {messages.map((m) => (
          <p key={m.id} className="break-words leading-snug">
            <span className="mr-1.5 font-normal" style={{ color: colorHex(m.color) }}>
              {m.name}
            </span>
            <span className={m.channel === "ghost" ? "text-paper/55 italic" : "text-paper/90"}>{m.text}</span>
          </p>
        ))}
      </div>
      {disabledText ? (
        <p className="border-t border-paper/10 px-3 py-3 text-xs text-paper/40">{disabledText}</p>
      ) : (
        <form
          className="flex border-t border-paper/10"
          onSubmit={(e) => {
            e.preventDefault();
            unlockAudio();
            const value = text.trim();
            if (!value) return;
            client.send({ type: "chat", channel, text: value });
            setText("");
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={CHAT_MAX}
            placeholder={placeholder}
            enterKeyHint="send"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-paper outline-none placeholder:text-paper/30 select-text"
          />
          <button type="submit" className="px-4 text-[11px] tracking-[0.2em] text-paper/70">
            ENVIAR
          </button>
        </form>
      )}
    </div>
  );
}

/** Chat entre fantasmas (só eliminados recebem). */
export function GhostChat({ client, snapshot }: { client: CrewClient; snapshot: Snapshot }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute top-[calc(env(safe-area-inset-top)+6.5rem)] right-3 flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="border border-paper/20 bg-ink/70 px-3 py-2 text-[11px] tracking-[0.2em] text-paper/70 backdrop-blur"
      >
        {open ? "FECHAR" : "CHAT FANTASMA"}
      </button>
      {open && (
        <ChatBox
          client={client}
          snapshot={snapshot}
          channel="ghost"
          placeholder="Só fantasmas leem"
          className="mt-2 h-64 w-[min(20rem,80vw)] border border-paper/15 bg-ink/85 backdrop-blur"
        />
      )}
    </div>
  );
}
