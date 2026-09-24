import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireCompleteProfile } from "@/lib/auth";
import { NewsFeed } from "@/components/news/NewsFeed";
import type { NewsPost } from "@/types/database.types";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "News del clu" };

export default async function NewsPage() {
  const profile = await requireCompleteProfile("/news");
  const { t } = await getT(profile.role === "admin" ? "es" : undefined);
  const supabase = await createClient();

  const { data } = await supabase.rpc("news_feed", { p_limit: 50 });
  const posts = (data ?? []) as NewsPost[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("News del clu")}</h1>
        <p className="mt-1 text-sm text-piedra">
          {profile.role === "admin"
            ? "Publicá novedades y eventos. Las alumnas reaccionan con un emoji."
            : t("Novedades y eventos del clu. Reaccioná con un emoji 💛")}
        </p>
      </div>

      <NewsFeed
        initialPosts={posts}
        isAdmin={profile.role === "admin"}
        userId={profile.id}
      />
    </div>
  );
}
