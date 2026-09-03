"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import type { ChatMessage } from "@/types/database.types";

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(iso));
}

export function ChatRoom({
  initialMessages,
  userId,
  userName,
}: {
  initialMessages: ChatMessage[];
  userId: string;
  userName: string;
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refetch = useCallback(async () => {
    const { data } = await supabase.rpc("chat_messages", { p_limit: 80, p_before: null });
    if (data) setMessages([...(data as ChatMessage[])].reverse());
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("sala-del-clu")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => refetch(),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refetch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);

    // optimista
    const optimistic: ChatMessage = {
      id: Date.now(),
      user_id: userId,
      body,
      created_at: new Date().toISOString(),
      author_name: userName,
      author_avatar: null,
    };
    setMessages((m) => [...m, optimistic]);
    setText("");

    const { error } = await supabase.from("messages").insert({ user_id: userId, body });
    setSending(false);
    if (error) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setText(body);
    }
  }

  async function remove(id: number) {
    setMessages((m) => m.filter((x) => x.id !== id));
    await supabase.from("messages").delete().eq("id", id);
  }

  return (
    <div className="flex h-[calc(100dvh-13rem)] flex-col">
      <ol className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <li className="rounded-xl border border-dashed border-lino px-4 py-10 text-center text-sm text-piedra">
            Todavía no hay mensajes. ¡Escribí el primero!
          </li>
        )}
        {messages.map((m) => {
          const mine = m.user_id === userId;
          return (
            <li key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              {!mine && <Avatar src={m.author_avatar} name={m.author_name} size={28} />}
              <div className={`max-w-[78%] ${mine ? "items-end text-right" : ""}`}>
                {!mine && (
                  <p className="mb-0.5 text-xs font-medium text-piedra">{m.author_name}</p>
                )}
                <div
                  className={`inline-block rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-ladrillo text-white"
                      : "border border-lino bg-surface text-piedra-deep"
                  }`}
                >
                  <span className="whitespace-pre-wrap break-words">{m.body}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-piedra-soft">
                  {timeLabel(m.created_at)}
                  {mine && (
                    <button
                      onClick={() => remove(m.id)}
                      className="ml-2 underline hover:text-ladrillo-deep"
                    >
                      borrar
                    </button>
                  )}
                </p>
              </div>
            </li>
          );
        })}
        <div ref={bottomRef} />
      </ol>

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Escribí en la sala…"
          aria-label="Mensaje"
          className="field-input flex-1"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="rounded-xl bg-ladrillo px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
