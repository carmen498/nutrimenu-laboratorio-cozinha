import { Settings } from "lucide-react";
import PreferenciasGeraisSection from "@/components/configuracoes/PreferenciasGeraisSection";
import AtualizacaoPrecosSection from "@/components/configuracoes/AtualizacaoPrecosSection";
import DadosEmpresaSection from "@/components/configuracoes/DadosEmpresaSection";

export default function Configuracoes() {
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6" style={{ color: "#2A4E3D" }} />
        <h1 className="font-display text-xl font-bold" style={{ color: "#2A4E3D" }}>Configurações</h1>
      </div>

      <PreferenciasGeraisSection />
      <AtualizacaoPrecosSection />
      <DadosEmpresaSection />
    </div>
  );
}