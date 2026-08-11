import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import AtualizarPrecosDialog from "@/components/ingrediente/AtualizarPrecosDialog";
import HistoricoAtualizacoesDialog from "@/components/ingrediente/HistoricoAtualizacoesDialog";

const CORES = { verdeEscuro: "#2A4E3D" };

function getProximaSegunda3h() {
  const now = new Date();
  const diasAteSegunda = (8 - now.getDay()) % 7 || 7;
  const proxima = new Date(now);
  proxima.setDate(now.getDate() + diasAteSegunda);
  proxima.setHours(3, 0, 0, 0);
  if (proxima <= now) proxima.setDate(proxima.getDate() + 7);
  return proxima;
}

function formatarProximaAtualizacao() {
  const data = getProximaSegunda3h();
  const hoje = new Date();
  const diffDias = Math.round((data - hoje) / (1000 * 60 * 60 * 24));
  if (diffDias === 0) return "Hoje às 3h";
  if (diffDias === 1) return "Amanhã às 3h";
  const dias = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  return `${dias[data.getDay()]} às 3h`;
}

export default function AtualizacaoPrecosSection() {
  const [showAtualizarPrecos, setShowAtualizarPrecos] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [autoUpdateAtiva, setAutoUpdateAtiva] = useState(false);
  const [togglingAuto, setTogglingAuto] = useState(false);

  const { data: ultimoLog } = useQuery({
    queryKey: ["ultimo-log-precos"],
    queryFn: async () => {
      const logs = await base44.entities.LogAtualizacaoPrecos.filter({ tipo: "automático" }, "-data_execucao", 1);
      return logs[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: autoUpdateStatus } = useQuery({
    queryKey: ["auto-update-status"],
    queryFn: async () => {
      const res = await base44.functions.invoke("gerenciarAtualizacaoAutomatica", { acao: "status" });
      return res.data;
    },
  });

  useEffect(() => {
    if (autoUpdateStatus) setAutoUpdateAtiva(autoUpdateStatus.ativa || false);
  }, [autoUpdateStatus]);

  const { data: ingredientesParaDialogo = [] } = useQuery({
    queryKey: ["ingredientes-para-dialogo-precos"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
    enabled: showAtualizarPrecos,
  });

  const { data: historicoLogs = [] } = useQuery({
    queryKey: ["historico-log-precos"],
    queryFn: () => base44.entities.LogAtualizacaoPrecos.filter({ tipo: "automático" }, "-data_execucao", 10),
    enabled: showHistorico,
  });

  const handleToggleAutoUpdate = async () => {
    setTogglingAuto(true);
    try {
      const res = await base44.functions.invoke("gerenciarAtualizacaoAutomatica", { acao: "toggle" });
      setAutoUpdateAtiva(res.data?.ativa || false);
      toast.success(res.data?.ativa ? "Atualização automática ATIVADA" : "Atualização automática PAUSADA");
    } catch (err) {
      toast.error("Erro ao alterar: " + (err.message || ""));
    } finally {
      setTogglingAuto(false);
    }
  };

  const formatarUltimaExecucao = () => {
    if (!ultimoLog?.data_execucao) return null;
    return new Date(ultimoLog.data_execucao).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <Card className="p-5 space-y-3">
      <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <RefreshCw className="w-3.5 h-3.5" /> Atualização de preços
      </h2>
      <button
        onClick={() => setShowAtualizarPrecos(true)}
        className="w-full flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
      >
        <Clock className="w-5 h-5" style={{ color: CORES.verdeEscuro }} />
        <div>
          {autoUpdateAtiva ? (
            <>
              <p className="text-sm font-medium" style={{ color: CORES.verdeEscuro }}>
                {formatarProximaAtualizacao()}
              </p>
              <p className="text-xs text-muted-foreground">Automática · IA web</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium" style={{ color: CORES.verdeEscuro }}>
                Pausada{formatarUltimaExecucao() ? ` · última execução ${formatarUltimaExecucao()}` : " · nunca executada"}
              </p>
              <p className="text-xs text-muted-foreground">Toque para atualizar preços manualmente</p>
            </>
          )}
        </div>
      </button>

      <AtualizarPrecosDialog
        open={showAtualizarPrecos}
        onClose={() => setShowAtualizarPrecos(false)}
        ingredientes={ingredientesParaDialogo}
        ultimoLog={ultimoLog}
        autoUpdateAtiva={autoUpdateAtiva}
        togglingAuto={togglingAuto}
        onToggleAutoUpdate={handleToggleAutoUpdate}
        onVerHistorico={() => setShowHistorico(true)}
      />

      <HistoricoAtualizacoesDialog
        open={showHistorico}
        onClose={() => setShowHistorico(false)}
        logs={historicoLogs}
      />
    </Card>
  );
}