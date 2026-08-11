import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import Sidebar from "@/components/layout/Sidebar";
import HelpPanel from "@/components/HelpPanel";

export default function AppLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const screenName = (() => {
    const p = location.pathname;
    if (p === "/") return "Início";
    if (p.startsWith("/receita/")) return "Receitas";
    if (p === "/receitas") return "Receitas";
    if (p.startsWith("/cardapio/")) return "Cardápio";
    if (p === "/cardapios") return "Cardápios";
    if (p === "/ingredientes") return "Ingredientes";
    if (p === "/lista-compras") return "Lista de Compras";
    if (p === "/percapita") return "Per Capita";
    if (p === "/medidas-caseiras") return "Medidas Caseiras";
    if (p === "/insumos-embalagens") return "Insumos e Embalagens";
    if (p === "/relatorio-categorias") return "Relatório de Categorias";
    if (p === "/auditoria-receitas") return "Auditoria de Receitas";
    if (p === "/auditorias") return "Auditorias";
    if (p.startsWith("/exportar/")) return "Exportar Receita";
    return "";
  })();

  return (
    <div className="min-h-screen bg-background">
      <TopBar onMenuClick={() => setMobileNavOpen(true)} />
      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        onHelpClick={() => setHelpOpen(true)}
      />

      <main className="pt-16 md:pl-64">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>

      <HelpPanel screenName={screenName} open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}