import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Bell, Menu, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function TopBar({ onMenuClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const iniciais = (user?.full_name || user?.email || "U")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-border flex items-center gap-3 px-4 md:px-6">
      <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 text-muted-foreground">
        <Menu className="w-5 h-5" />
      </button>

      <Link to="/" className="flex items-center gap-2 shrink-0">
        <div
          className="w-9 h-9 rounded-md flex items-center justify-center font-display font-bold text-white text-sm"
          style={{ background: "#1B4332" }}
        >
          ZR
        </div>
        <div className="hidden lg:block leading-tight">
          <p className="text-xs font-bold tracking-wide" style={{ color: "#1B4332" }}>PLATAFORMA ZR</p>
          <p className="text-[10px] text-muted-foreground">Inteligência para a Indústria de Alimentos</p>
        </div>
      </Link>

      <div className="flex-1 max-w-md hidden sm:flex items-center relative ml-4">
        <Search className="w-4 h-4 absolute left-3 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar receita, ingrediente, cardápio..."
          className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-muted/40 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto shrink-0">
        <button
          onClick={() => navigate("/receitas?nova=manual")}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ background: "#1B4332" }}
        >
          <Plus className="w-4 h-4" /> Nova Receita
        </button>
        <button className="relative p-2 text-muted-foreground hover:text-foreground" title="Notificações">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1 pl-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "#4E7C63" }}
          >
            {iniciais}
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
        </div>
      </div>
    </header>
  );
}