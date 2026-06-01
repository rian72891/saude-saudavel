import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const Route = createFileRoute("/noticias")({
  head: () => ({
    meta: [
      { title: "Notícias de Saúde | Saúde + Saudável" },
      { name: "description", content: "Notícias e dicas sobre bem-estar, prevenção, nutrição e saúde mental." },
    ],
  }),
  component: NoticiasPage,
});

type NewsRow = {
  id: string; title: string; summary: string; body: string | null;
  category: string; emoji: string; gradient: string; published_at: string;
};

const PAGE_SIZE = 6;
const CATEGORIES = ["Todos", "Autocuidado", "Prevenção", "Medicamentos", "Nutrição", "Saúde Mental"] as const;

function NoticiasPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Todos");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["news", category],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase.from("news").select("*").order("published_at", { ascending: false }).range(from, to);
      if (category !== "Todos") q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return { items: (data ?? []) as NewsRow[], page: pageParam as number };
    },
    getNextPageParam: (lastPage) =>
      lastPage.items.length < PAGE_SIZE ? undefined : lastPage.page + 1,
  });

  const items = useMemo(
    () => (data?.pages.flatMap((p) => p.items) ?? []).filter((n) =>
      search ? (n.title + n.summary).toLowerCase().includes(search.toLowerCase()) : true
    ),
    [data, search]
  );

  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <section className="px-4 sm:px-8 py-7">
      <SectionHeader title="📰 Notícias de Saúde" subtitle="Fique por dentro das novidades sobre bem-estar e medicina preventiva." />

      <div className="flex gap-2 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar notícias..."
          className="flex-1 px-4 py-2.5 rounded-lg border-2 border-border bg-white outline-none focus:border-green transition text-sm"
        />
        <button type="button" className="px-4 py-2.5 rounded-lg bg-navy text-white">🔍</button>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={[
              "px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition",
              category === c ? "bg-navy text-white border-navy" : "bg-white text-muted-foreground border-border hover:bg-navy hover:text-white hover:border-navy",
            ].join(" ")}
          >{c}</button>
        ))}
      </div>

      {isLoading && <div className="text-muted-foreground text-sm">Carregando notícias...</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((n) => (
          <article key={n.id} className="bg-white rounded-xl shadow-[var(--shadow-soft)] overflow-hidden hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] transition cursor-pointer fade-up">
            <div className={`h-[140px] flex items-center justify-center text-5xl bg-gradient-to-br ${n.gradient}`}>{n.emoji}</div>
            <div className="p-4">
              <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-green-light text-green-dark mb-2">{n.category}</span>
              <h3 className="text-navy font-bold text-sm leading-snug">{n.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{n.summary}</p>
              <p className="text-[11px] text-muted-foreground mt-2.5">{new Date(n.published_at).toLocaleDateString("pt-BR")}</p>
            </div>
          </article>
        ))}
      </div>

      <div ref={sentinelRef} className="h-12 flex items-center justify-center text-xs text-muted-foreground">
        {isFetchingNextPage ? "Carregando mais..." : !hasNextPage && items.length > 0 ? "Você chegou ao fim." : ""}
      </div>
    </section>
  );
}
