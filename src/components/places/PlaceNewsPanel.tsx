import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generatePlaceNews } from "@/lib/place_news.functions";

type Props = {
  placeName: string | null;
  placeType: "gym" | "clinic";
  category?: string;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

// Padrões SVG genéricos por categoria — sem direitos autorais
const GENERIC_BG: Record<"gym" | "clinic", string> = {
  gym: "linear-gradient(135deg, oklch(0.25 0.07 250) 0%, oklch(0.45 0.15 250) 50%, oklch(0.72 0.17 162) 100%)",
  clinic: "linear-gradient(135deg, oklch(0.30 0.08 200) 0%, oklch(0.55 0.13 195) 50%, oklch(0.72 0.17 162) 100%)",
};

export function PlaceNewsPanel({ placeName, placeType, category }: Props) {
  const fn = useServerFn(generatePlaceNews);
  const dateSeed = todayStr();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["place-news", placeName, placeType, dateSeed],
    queryFn: () => fn({ data: { placeName: placeName!, placeType, category, dateSeed } }),
    enabled: !!placeName,
    staleTime: 1000 * 60 * 60 * 12, // 12h
    gcTime: 1000 * 60 * 60 * 24,
  });

  if (!placeName) {
    return (
      <div className="rounded-xl bg-white shadow-[var(--shadow-card)] p-5 text-sm text-muted-foreground text-center">
        Selecione um local para ver notícias e dicas geradas por IA.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white shadow-[var(--shadow-card)] overflow-hidden">
      <div
        className="h-28 relative flex items-end p-4"
        style={{ background: GENERIC_BG[placeType] }}
      >
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`p-${placeType}`} width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#p-${placeType})`} />
        </svg>
        <div className="relative z-10">
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-white/80 bg-black/20 backdrop-blur px-2 py-0.5 rounded">
            {placeType === "gym" ? "🏋️ Academia" : "🏥 Saúde"} • IA Diária
          </span>
          <h3 className="text-white font-extrabold text-base mt-1 leading-tight line-clamp-1">{placeName}</h3>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-navy font-bold text-sm">📰 Notícias e dicas de hoje</h4>
          <span className="text-[10px] text-muted-foreground">
            {isFetching ? "Atualizando..." : `Atualizado: ${dateSeed}`}
          </span>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && (
          <ul className="space-y-2.5">
            {(data?.items ?? []).map((it, i) => (
              <li key={i} className="flex gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition">
                <div className="text-2xl shrink-0" aria-hidden>{it.emoji}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-green-dark bg-green-light px-1.5 py-0.5 rounded">
                      {it.category}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-navy mt-0.5 leading-tight">{it.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{it.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
