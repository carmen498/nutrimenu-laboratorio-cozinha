import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { History, Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import HistoricoItem from "@/components/historico/HistoricoItem";

export default function Historico() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["historico-alteracao-receita"],
    queryFn: () => base44.entities.HistoricoAlteracaoReceita.list("-created_date", 300),
  });

  const registrosFiltrados = registros.filter((r) =>
    (r.receita_nome || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <History className="w-5 h-5" style={{ color: "#2A4E3D" }} />
        <h1 className="font-display text-xl font-bold" style={{ color: "#2A4E3D" }}>Histórico</h1>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome da receita..."
          className="pl-9 bg-white"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Carregando...</p>
        ) : registrosFiltrados.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {busca ? "Nenhum registro encontrado para essa busca." : "Nenhuma alteração registrada ainda."}
          </p>
        ) : (
          registrosFiltrados.map((registro) => (
            <HistoricoItem key={registro.id} registro={registro} />
          ))
        )}
      </div>
    </div>
  );
}