import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Bell, Menu, ChevronDown, User, LifeBuoy, LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-sidebar border-b border-sidebar-border flex items-center gap-3 px-4 md:px-6">
      <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 text-sidebar-foreground/80">
        <Menu className="w-5 h-5" />
      </button>

      <Link to="/" className="flex items-center gap-2 shrink-0">
        <div className="w-9 h-9 rounded-md flex items-center justify-center font-display font-bold text-sm bg-white/15 text-white">
          ZR
        </div>
        <div className="hidden lg:flex lg:flex-col lg:justify-center leading-tight">
          <p className="text-xs font-bold tracking-wide text-white">PLATAFORMA ZR</p>
          <p className="text-[10px] text-sidebar-foreground/70">Inteligência para a Indústria de Alimentos</p>
        </div>
      </Link>

      <div className="flex-1 max-w-md hidden sm:flex items-center relative ml-4">
        <Search className="w-4 h-4 absolute left-3 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar receita, ingrediente, cardápio..."
          className="w-full h-9 pl-9 pr-3 rounded-md border border-transparent bg-white text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto shrink-0">
        <button
          onClick={() => navigate("/receitas?nova=manual")}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-semibold transition-colors hover:opacity-90 bg-white text-sidebar"
        >
          <Plus className="w-4 h-4" /> Nova Receita
        </button>
        <button className="relative p-2 text-white/80 hover:text-white" title="Notificações">
          <Bell className="w-5 h-5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 pl-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "#4E7C63" }}
              >
                {iniciais}
              </div>
              <ChevronDown className="w-4 h-4 text-white/70 hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{user?.full_name || user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="justify-between">
              <span className="flex items-center gap-2"><User className="w-4 h-4" /> Conta</span>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Em breve</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="justify-between">
              <span className="flex items-center gap-2"><LifeBuoy className="w-4 h-4" /> Suporte</span>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Em breve</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => base44.auth.logout()}>
              <LogOut className="w-4 h-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}