import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h1 className="text-7xl font-extrabold text-navy">404</h1>
        <p className="mt-3 text-muted-foreground">Página não encontrada.</p>
        <a href="/" className="inline-block mt-6 px-5 py-2.5 rounded-lg bg-green text-white font-semibold">Voltar para o início</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-bold text-navy">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-5 px-5 py-2.5 rounded-lg bg-green text-white font-semibold">Tentar novamente</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Saúde + Saudável" },
      { name: "description", content: "saúde, academias, clínicas próximas, notícias e assistente de IA preventivo." },
      { property: "og:title", content: "Saúde + Saudável" },
      { name: "twitter:title", content: "Saúde + Saudável" },
      { property: "og:description", content: "saúde, academias, clínicas próximas, notícias e assistente de IA preventivo." },
      { name: "twitter:description", content: "saúde, academias, clínicas próximas, notícias e assistente de IA preventivo." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a85eb78a-da28-4aa1-be1e-41fa624e328a/id-preview-fe39e237--1130d85e-3d28-45fd-bdb8-b14a17aa4157.lovable.app-1780355328330.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a85eb78a-da28-4aa1-be1e-41fa624e328a/id-preview-fe39e237--1130d85e-3d28-45fd-bdb8-b14a17aa4157.lovable.app-1780355328330.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <Navbar />
      <main className="pt-[68px] min-h-screen">
        <Outlet />
      </main>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

function AuthSync() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      qc.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);
  return null;
}
