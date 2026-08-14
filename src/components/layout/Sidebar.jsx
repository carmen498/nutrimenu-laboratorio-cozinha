import { Link, useLocation } from "react-router-dom";
import {
  Home, BookOpen, Apple, CalendarDays, Gauge, Utensils, Package,
  ShoppingCart, History, ClipboardCheck, Settings, HelpCircle, LogOut, X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getScreenName } from "@/lib/getScreenName";
import { resolveHelpContent } from "@/lib/resolveHelpContent";
import { ajudaWidgetContent } from "@/lib/ajudaWidgetContent";

const laboratorioItems = [
  { path: "/receitas", label: "Receitas", icon: BookOpen },
  { path: "/ingredientes", label: "Ingredientes", icon: Apple },
  { path: "/cardapios", label: "Cardápios", icon: CalendarDays },
  { path: "/percapita", label: "Per Capita", icon: Gauge },
  { path: "/medidas-caseiras", label: "Medidas", icon: Utensils },
  { path: "/insumos-embalagens", label: "Insumos", icon: Package },
];

function NavLink({ to, icon: Icon, label, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" /> {label}
    </Link>
  );
}

function SidebarContent({ onNavigate, onHelpClick, onHelpFaqsClick }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const screenName = getScreenName(location.pathname, location.search);
  const resolvedHelp = resolveHelpContent(screenName);
  const widget = (resolvedHelp && ajudaWidgetContent[resolvedHelp.key]) || {
    titulo: "Precisa de ajuda?",
    descricao: "Acesse nossos guias e artigos de suporte.",
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        <NavLink to="/" icon={Home} label="Início" active={isActive("/")} onClick={onNavigate} />

        <p className="px-3 pt-3 pb-1 text-[11px] font-bold tracking-wider uppercase" style={{ color: "#C9A24B" }}>
          Laboratório de Cozinha
        </p>
        {laboratorioItems.map((item) => (
          <NavLink key={item.path} to={item.path} icon={item.icon} label={item.label} active={isActive(item.path)} onClick={onNavigate} />
        ))}

        <div className="pt-3 mt-3 border-t border-sidebar-border space-y-0.5">
          <NavLink to="/lista-compras" icon={ShoppingCart} label="Carrinho" active={isActive("/lista-compras")} onClick={onNavigate} />
          <NavLink to="/historico" icon={History} label="Histórico" active={isActive("/historico")} onClick={onNavigate} />
          <NavLink to="/auditorias" icon={ClipboardCheck} label="Auditorias" active={isActive("/auditorias")} onClick={onNavigate} />
          <NavLink to="/configuracoes" icon={Settings} label="Configurações" active={isActive("/configuracoes")} onClick={onNavigate} />
        </div>
      </nav>

      <div className="p-3 space-y-2 shrink-0">
        <div className="rounded-lg p-2.5 bg-sidebar-accent/60">
          <p className="text-xs font-semibold mb-1">{widget.titulo}</p>
          <p className="text-[11px] text-sidebar-foreground/70 mb-2">{widget.descricao}</p>
          <button
            onClick={() => { onHelpFaqsClick?.(); onNavigate?.(); }}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Central de Ajuda
          </button>
          <button
            onClick={() => { onHelpClick?.(); onNavigate?.(); }}
            className="w-full text-center text-[10px] text-sidebar-foreground/60 hover:text-sidebar-foreground/90 underline mt-1.5 transition-colors"
          >
            Central de ajuda completa
          </button>
        </div>
        <button
          onClick={() => base44.auth.logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
        <p className="text-center text-[10px] text-sidebar-foreground/60 italic px-2">
          Mais alimentos bons, negócios mais fortes.
        </p>
        <p className="text-center text-[10px] text-sidebar-foreground/50 pt-1">Plataforma ZR</p>
      </div>
    </div>
  );
}

export default function Sidebar({ mobileOpen, onMobileClose, onHelpClick, onHelpFaqsClick }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block fixed top-16 left-0 bottom-0 w-64 z-40 border-r border-sidebar-border">
        <SidebarContent onHelpClick={onHelpClick} onHelpFaqsClick={onHelpFaqsClick} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[80vw] flex flex-col bg-sidebar">
            <div className="flex items-center justify-end p-2 shrink-0">
              <button onClick={onMobileClose} className="text-sidebar-foreground/80 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <SidebarContent onNavigate={onMobileClose} onHelpClick={onHelpClick} onHelpFaqsClick={onHelpFaqsClick} />
            </div>
          </div>
          <div className="flex-1 bg-black/50" onClick={onMobileClose} />
        </div>
      )}
    </>
  );
}