"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT_MAX, colorHex } from "@/lib/crew/constants";
import type { ChatChannel } from "@/lib/crew/protocol";
import { unlockAudio } from "./feedback";
import type { CrewClient, Snapshot } from "./net";
import { btnGhost, panel } from "./ui";

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
        {messages.length === 0 && <p className="text-xs text-white/40">Nenhuma mensagem ainda.</p>}
        {messages.map((m) => (
          <p key={m.id} className="break-words leading-snug">
            <span className="mr-1.5 font-semibold" style={{ color: colorHex(m.color) }}>
              {m.name}
            </span>
            <span className={m.channel === "ghost" ? "text-white/55 italic" : "text-white/90"}>{m.text}</span>
          </p>
        ))}
      </div>
      {disabledText ? (
        <p className="border-t-2 border-[#16172a] px-3 py-3 text-xs text-white/50">{disabledText}</p>
      ) : (
        <form
          className="flex border-t-2 border-[#16172a]"
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
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-white outline-none placeholder:text-white/35 select-text"
          />
          <button type="submit" className="m-1.5 rounded-xl border-[3px] border-[#16172a] bg-[#4fb6ff] px-3 text-sm font-semibold text-[#16172a]">
            Enviar
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
    <div className="absolute top-[calc(env(safe-area-inset-top)+4.2rem)] right-3 flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${btnGhost} px-3 py-2 text-sm`}
      >
        {open ? "Fechar" : "👻 Chat"}
      </button>
      {open && (
        <ChatBox
          client={client}
          snapshot={snapshot}
          channel="ghost"
          placeholder="Só fantasmas leem"
          className={`${panel} mt-2 h-64 w-[min(20rem,80vw)] overflow-hidden`}
        />
      )}
    </div>
  );
}
