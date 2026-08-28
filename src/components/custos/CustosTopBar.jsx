import { Link, useNavigate } from "react-router-dom";
import { ChefHat, ChevronDown, HelpCircle, LogOut, Menu, Sparkles, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function CustosTopBar({ onMenuClick, onHelpClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const iniciais = (user?.full_name || user?.nome_completo || user?.email || "U").trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10 flex items-center gap-3 px-4 md:px-6 text-white" style={{ background: "#17382D" }}>
      <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 text-white/80"><Menu className="w-5 h-5" /></button>
      <Link to="/custos" className="flex items-center gap-3 shrink-0 md:w-64 md:pr-4">
        <div className="w-10 h-10 rounded-md flex items-center justify-center font-display font-bold bg-white/15">ZR</div>
        <div className="hidden sm:block leading-tight"><p className="text-xs font-bold tracking-wide">LABORATÓRIO DE CUSTOS</p><p className="text-[10px] text-white/60">Plataforma ZR</p></div>
      </Link>
      <div className="hidden md:flex flex-1 items-center"><span className="text-xs text-white/55">Custo de produção · Formação do preço · Margem</span></div>
      <div className="flex items-center gap-2 ml-auto">
        <button onClick={onHelpClick} className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white/75 hover:text-white"><HelpCircle className="w-4 h-4" /> Ajuda</button>
        <button onClick={() => navigate("/app")} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-md bg-white text-[#17382D] text-xs font-semibold"><ChefHat className="w-4 h-4" /> Laboratório de Cozinha</button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button className="flex items-center gap-1"><div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold">{iniciais}</div><ChevronDown className="w-4 h-4 text-white/60 hidden md:block" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{user?.full_name || user?.nome_completo || user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/conta")}><User className="w-4 h-4" /> Conta</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/custos/planos")}><Sparkles className="w-4 h-4" /> Planos</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/app")}><ChefHat className="w-4 h-4" /> Laboratório de Cozinha</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/suporte")}><HelpCircle className="w-4 h-4" /> Suporte</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout('/')}><LogOut className="w-4 h-4" /> Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
