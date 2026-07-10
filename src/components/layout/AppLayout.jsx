import { Outlet, Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Apple, Menu, X, LogOut, Gauge, CalendarDays, PieChart } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import HelpPanel from "@/components/HelpPanel";

const navItems = [
  { path: "/", label: "Início", icon: Home },
  { path: "/receitas", label: "Receitas", icon: BookOpen },
  { path: "/cardapios", label: "Cardápios", icon: CalendarDays },
  { path: "/ingredientes", label: "Ingredientes", icon: Apple },
  { path: "/percapita", label: "Per Capita", icon: Gauge },
  { path: "/relatorio-categorias", label: "Relatório", icon: PieChart },
];

export default function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-lg font-bold tracking-tight">Laboratório de Cozinha</span>
          </Link>
          <div className="flex items-center gap-2">
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => base44.auth.logout()}
            >
              <LogOut className="w-4 h-4" />
            </Button>
            <button
              className="md:hidden p-2 text-white/80 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-white/10 pb-2 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 text-xs font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <HelpPanel screenName={
        (() => {
          const p = location.pathname;
          if (p === "/") return "Início";
          if (p.startsWith("/receita/")) return "Receita";
          if (p === "/receitas") return "Receitas";
          if (p.startsWith("/cardapio/")) return "Cardápio";
          if (p === "/cardapios") return "Cardápios";
          if (p === "/ingredientes") return "Ingredientes";
          if (p === "/lista-compras") return "Lista de Compras";
          if (p === "/percapita") return "Per Capita";
          if (p === "/relatorio-categorias") return "Relatório de Categorias";
          if (p.startsWith("/exportar/")) return "Exportar Receita";
          return "";
        })()
      } />
    </div>
  );
}