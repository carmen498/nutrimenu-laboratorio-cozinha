import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PRAZOS = [
  ["Webhook Mercado Pago", "90 dias"],
  ["E-mail / WhatsApp", "180 dias"],
  ["Logs operacionais", "365 dias"],
  ["Auditorias e correções", "730 dias"],
  ["Pagamento", "preservado; transitórios limpos em 30 dias"],
];

export default function RetencaoLogsAdmin() {
  const [executando, setExecutando] = useState("");
  const [resultado, setResultado] = useState(null);

  const executar = async (modo) => {
    if (modo === "aplicar" && !window.confirm(
      "Aplicar a política de retenção agora? Registros fora do prazo serão excluídos e dados transitórios antigos serão minimizados."
    )) return;

    setExecutando(modo);
    try {
      const res = await base44.functions.invoke("aplicarRetencaoLogs", { modo });
      const dados = res?.data || {};
      setResultado(dados);
      toast.success(modo === "aplicar" ? "Política de retenção aplicada." : "Simulação concluída.");
    } catch (error) {
      toast.error(error?.message || "Erro ao executar política de retenção.");
    } finally {
      setExecutando("");
    }
  };

  const entradas = resultado?.resultados ? Object.entries(resultado.resultados) : [];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Governança de logs e retenção
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Novos logs de comunicação armazenam contato mascarado. A rotina abaixo expurga logs fora do prazo,
              minimiza contatos legados e remove dados transitórios de pagamentos sem apagar o registro financeiro.
            </p>
          </div>
          <Badge variant="outline">P1</Badge>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
          {PRAZOS.map(([nome, prazo]) => (
            <div key={nome} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{nome}</p>
              <p className="text-sm font-semibold mt-1">{prazo}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="outline" onClick={() => executar("simular")} disabled={!!executando}>
            {executando === "simular" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
            Simular retenção
          </Button>
          <Button onClick={() => executar("aplicar")} disabled={!!executando}>
            {executando === "aplicar" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Aplicar retenção
          </Button>
        </div>
      </Card>

      {resultado && (
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span><strong>Modo:</strong> {resultado.modo}</span>
            <span><strong>Política:</strong> {resultado.versao_politica}</span>
            <span><strong>Excluídos:</strong> {resultado.total_excluido || 0}</span>
            <span><strong>Minimizados:</strong> {resultado.total_minimizado || 0}</span>
          </div>
          <div className="mt-4 rounded-lg border overflow-hidden">
            <div className="grid grid-cols-[1.5fr_.7fr_.7fr] gap-2 px-3 py-2 bg-secondary/50 text-xs font-semibold">
              <span>Entidade</span><span>Prazo</span><span>Resultado</span>
            </div>
            {entradas.map(([nome, info]) => (
              <div key={nome} className="grid grid-cols-[1.5fr_.7fr_.7fr] gap-2 px-3 py-2 border-t text-xs">
                <span className="break-all">{nome}</span>
                <span>{info?.dias || "—"} dias</span>
                <span>{resultado.modo === "aplicar" ? (info?.excluidos ?? 0) : (info?.candidatos_exclusao ?? 0)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
