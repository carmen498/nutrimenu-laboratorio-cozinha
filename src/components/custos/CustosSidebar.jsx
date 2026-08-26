import { Link, useLocation } from "react-router-dom";
import { Calculator, ChefHat, History, Home, LogOut, Settings2, WalletCards, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const items = [
  { to: "/custos", label: "Início", icon: Home, exact: true },
  { to: "/custos/despesas", label: "Minhas Despesas", icon: WalletCards },
  { to: "/custos/calcular", label: "Calcular Custo", icon: Calculator },
  { to: "/custos/historico", label: "Histórico", icon: History },
  { to: "/custos/configuracoes", label: "Configurações", icon: Settings2 },
];

function NavItem({ item, pathname, onNavigate }) {
  const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
  const Icon = item.icon;
  return (
    <Link to={item.to} onClick={onNavigate} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
      <Icon className="w-4 h-4 shrink-0" /> {item.label}
    </Link>
  );
}

function Content({ onNavigate }) {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  return (
    <div className="h-full flex flex-col text-white" style={{ background: "#214739" }}>
      <div className="p-4 border-b border-white/10">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/55">Plataforma ZR</p>
        <p className="font-display font-bold mt-1">Laboratório de Custos</p>
        <p className="text-[11px] text-white/60 mt-1">Custo, preço e margem</p>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => <NavItem key={item.to} item={item} pathname={pathname} onNavigate={onNavigate} />)}
        <div className="pt-3 mt-3 border-t border-white/10">
          <Link to="/app" onClick={onNavigate} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white"><ChefHat className="w-4 h-4" /> Laboratório de Cozinha</Link>
        </div>
      </nav>
      <div className="p-3 border-t border-white/10">
        <button onClick={() => logout('/')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white"><LogOut className="w-4 h-4" /> Sair</button>
        <p className="text-[10px] text-center text-white/45 mt-3">Complemento do Laboratório de Cozinha</p>
      </div>
    </div>
  );
}

export default function CustosSidebar({ mobileOpen, onMobileClose }) {
  return <>
    <aside className="hidden md:block fixed top-16 left-0 bottom-0 w-64 z-40 border-r border-black/10"><Content /></aside>
    {mobileOpen && <div className="md:hidden fixed inset-0 z-50 flex"><div className="w-72 max-w-[82vw] flex flex-col" style={{ background: "#214739" }}><div className="flex justify-end p-2 border-b border-white/10"><button onClick={onMobileClose} className="p-2 text-white/80"><X className="w-5 h-5" /></button></div><div className="flex-1 min-h-0"><Content onNavigate={onMobileClose} /></div></div><div className="flex-1 bg-black/50" onClick={onMobileClose} /></div>}
  </>;
}
