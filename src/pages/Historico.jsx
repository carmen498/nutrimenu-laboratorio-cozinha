import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Search } from "lucide-react";
import { fetchAllPages } from "@/lib/fetchAllPages";
import moment from "moment";

export default function Historico() {
  const [busca, setBusca] = useState("");

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["historico-alteracoes-receita"],
    queryFn: () => fetchAllPages(base44.entities.HistoricoAlteracaoReceita, "-created_date"),
  });

  const registrosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return registros;
    return registros.filter((r) => (r.receita_nome || "").toLowerCase().includes(termo));
  }, [registros, busca]);

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2">
        <History className="w-6 h-6 text-primary" /> Histórico
      </h1>
      <p className="text-sm text-muted-foreground">
        Registro cronológico de alterações em receitas. Nesta etapa, apenas para visualização.
      </p>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome da receita..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : registrosFiltrados.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p>{busca ? "Nenhum registro encontrado para essa busca." : "Nenhuma alteração registrada ainda."}</p>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {registrosFiltrados.map((r) => (
            <Card key={r.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1 space-y-1">
                <Link
                  to={`/receita/${r.receita_id}`}
                  className="font-medium text-primary hover:underline text-sm"
                >
                  {r.receita_nome || "Receita removida"}
                </Link>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(r.campos_alterados || []).map((campo) => (
                    <Badge key={campo} variant="secondary" className="text-xs">{campo}</Badge>
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-right shrink-0">
                <p>{moment(r.created_date).format("DD/MM/YYYY [às] HH:mm")}</p>
                <p>{r.usuario_nome || "—"}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}