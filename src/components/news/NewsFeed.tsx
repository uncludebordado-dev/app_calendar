"use client";

import { startTransition, useActionState, useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { createNewsAction, deleteNewsAction, type NewsActionResult } from "@/app/(app)/news/actions";
import type { NewsEmoji, NewsPost } from "@/types/database.types";

const EMOJIS: { key: NewsEmoji; char: string; label: string }[] = [
  { key: "like", char: "❤️", label: "Me encanta" },
  { key: "feliz", char: "😊", label: "Feliz" },
  { key: "risa", char: "😂", label: "Me río" },
  { key: "triste", char: "😢", label: "Triste" },
];

function whenLabel(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(iso));
}

export function NewsFeed({
  initialPosts,
  isAdmin,
  userId,
}: {
  initialPosts: NewsPost[];
  isAdmin: boolean;
  userId: string;
}) {
  const supabase = createClient();
  const [posts, setPosts] = useState<NewsPost[]>(initialPosts);

  const refetch = useCallback(async () => {
    const { data } = await supabase.rpc("news_feed", { p_limit: 50 });
    if (data) setPosts(data as NewsPost[]);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("news")
      .on("postgres_changes", { event: "*", schema: "public", table: "news_posts" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "news_reactions" }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refetch]);

  async function react(post: NewsPost, emoji: NewsEmoji) {
    const removing = post.my_reaction === emoji;

    // optimista
    setPosts((list) =>
      list.map((p) => {
        if (p.id !== post.id) return p;
        const counts = { ...p.reactions };
        if (p.my_reaction) counts[p.my_reaction] = Math.max(0, counts[p.my_reaction] - 1);
        if (!removing) counts[emoji] = counts[emoji] + 1;
        return { ...p, reactions: counts, my_reaction: removing ? null : emoji };
      }),
    );

    if (removing) {
      await supabase.from("news_reactions").delete().eq("post_id", post.id).eq("user_id", userId);
    } else {
      await supabase
        .from("news_reactions")
        .upsert({ post_id: post.id, user_id: userId, emoji }, { onConflict: "post_id,user_id" });
    }
    refetch();
  }

  return (
    <div className="space-y-4">
      {isAdmin && <Composer onDone={refetch} />}

      {posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-12 text-center text-sm text-piedra">
          Todavía no hay noticias.
          {isAdmin ? " Publicá la primera 👆" : ""}
        </p>
      ) : (
        <ul className="space-y-4">
          {posts.map((p) => (
            <li key={p.id} className="card p-4">
              <div className="flex items-start gap-3">
                <Avatar src={p.author_avatar} name={p.author_name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-piedra-deep">{p.author_name}</p>
                  <p className="text-[11px] text-piedra-soft">{whenLabel(p.created_at)}</p>
                </div>
                {isAdmin && (
                  <form action={deleteNewsAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      className="text-[11px] text-piedra underline hover:text-ladrillo-deep"
                    >
                      borrar
                    </button>
                  </form>
                )}
              </div>

              <h2 className="mt-3 text-base font-semibold text-piedra-deep">{p.title}</h2>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-piedra-deep/90">
                {p.body}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-lino pt-3">
                {EMOJIS.map((e) => {
                  const count = p.reactions[e.key];
                  const mine = p.my_reaction === e.key;
                  return (
                    <button
                      key={e.key}
                      type="button"
                      onClick={() => react(p, e.key)}
                      aria-pressed={mine}
                      aria-label={e.label}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition-colors ${
                        mine
                          ? "border-ladrillo bg-ladrillo/10 text-ladrillo-deep"
                          : "border-lino text-piedra hover:bg-lino-soft"
                      }`}
                    >
                      <span>{e.char}</span>
                      {count > 0 && <span className="text-xs font-semibold">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Composer({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState<NewsActionResult, FormData>(createNewsAction, {
    ok: false,
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (state.ok) {
      setTitle("");
      setBody("");
      onDone();
    }
  }, [state, onDone]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        startTransition(() => formAction(new FormData(form)));
      }}
      className="card space-y-2 p-4"
    >
      <p className="text-sm font-semibold text-piedra-deep">Nueva noticia</p>
      <input
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={160}
        placeholder="Título"
        className="field-input w-full"
      />
      <textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={4000}
        rows={4}
        placeholder="Contá la novedad, el evento, la fecha…"
        className="field-input w-full"
      />
      {state.error && <p className="text-xs text-ladrillo-deep">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || !title.trim() || !body.trim()}
        className="rounded-xl bg-ladrillo px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Publicando…" : "Publicar"}
      </button>
    </form>
  );
}
