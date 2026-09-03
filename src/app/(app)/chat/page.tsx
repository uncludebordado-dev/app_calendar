import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireCompleteProfile } from "@/lib/auth";
import { ChatRoom } from "@/components/chat/ChatRoom";
import type { ChatMessage } from "@/types/database.types";

export const metadata: Metadata = { title: "Chat del clu" };

export default async function ChatPage() {
  const profile = await requireCompleteProfile("/chat");
  const supabase = await createClient();

  const { data } = await supabase.rpc("chat_messages", { p_limit: 80, p_before: null });
  const messages = [...((data ?? []) as ChatMessage[])].reverse();

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold">Sala del clu</h1>
        <p className="mt-1 text-sm text-piedra">
          Un chat para todas. Sé amable — lo lee todo el club.
        </p>
      </div>
      <ChatRoom initialMessages={messages} userId={profile.id} userName={profile.full_name} />
    </div>
  );
}
