import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/types/database.types";

/** ¿Hay alguna News publicada después de la última vez que este perfil la vio? */
export async function hasUnreadNews(
  supabase: SupabaseClient<Database>,
  profile: Pick<Profile, "news_last_seen_at">,
): Promise<boolean> {
  const { data } = await supabase
    .from("news_posts")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return false;
  if (!profile.news_last_seen_at) return true;
  return new Date(data.created_at) > new Date(profile.news_last_seen_at);
}
