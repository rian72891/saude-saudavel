import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/useAuth";

type NavLink = { to: string; label: string; sub: string | null; isAi?: boolean };
const links: NavLink[] = [
  { to: "/", label: "Home", sub: null },
  { to: "/noticias", label: "Notícias", sub: null },
  { to: "/academias", label: "Academias", sub: "Perto" },
  { to: "/clinicas", label: "Clínicas", sub: "Perto" },
  { to: "/ia", label: "IA Saúde", sub: "Plus", isAi: true },
];

export function Navbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-[68px] bg-navy shadow-[0_2px_20px_rgba(0,0,0,0.25)] flex items-center px-4 sm:px-8 overflow-x-auto">
      <Link to="/" className="flex items-center gap-2.5 mr-6 sm:mr-10 shrink-0">
        <div className="w-[42px] h-12">
          <svg viewBox="0 0 42 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 2L4 10V26C4 36 12 44 21 46C30 44 38 36 38 26V10L21 2Z" fill="oklch(0.72 0.17 162)" />
            <path d="M21 2L4 10V26C4 36 12 44 21 46C30 44 38 36 38 26V10L21 2Z" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
            <text x="21" y="30" textAnchor="middle" fill="white" fontSize="18" fontWeight="900" fontFamily="Plus Jakarta Sans,sans-serif">S+</text>
          </svg>
        </div>
        <div className="text-white font-extrabold text-[17px] leading-tight tracking-wide">
          Saúde +<br />
          <span className="text-green">Saudável</span>
        </div>
      </Link>

      <div className="flex items-center gap-1 flex-1">
        {links.map((l) => {
          const active = pathname === l.to;
          return (
            <Link
              key={l.to}
              to={l.to as "/"}
              className={[
                "relative whitespace-nowrap uppercase tracking-wider text-[12.5px] sm:text-[13.5px] font-semibold px-3 sm:px-[18px] py-2 rounded-lg transition-colors",
                l.isAi
                  ? active
                    ? "text-white bg-green/25"
                    : "text-green hover:text-white hover:bg-green/20"
                  : active
                    ? "text-white bg-green/20"
                    : "text-white/70 hover:text-white hover:bg-white/10",
              ].join(" ")}
            >
              {l.label}
              {l.sub && (
                <span className="block text-[10px] font-normal opacity-70 uppercase tracking-wider">
                  {l.sub}
                </span>
              )}
              {active && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-7 h-[3px] rounded-full bg-green" />
              )}
            </Link>
          );
        })}
      </div>

      <Link
        to={user ? "/dashboard" : "/auth"}
        className="ml-2 shrink-0 px-3 sm:px-4 py-2 rounded-lg bg-green hover:bg-green-dark text-white text-[12.5px] font-bold uppercase tracking-wider"
      >
        {user ? "Dashboard" : "Entrar"}
      </Link>
    </nav>
  );
}
