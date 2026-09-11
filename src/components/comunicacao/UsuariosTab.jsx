import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";
import { computeStatusUsuario, usuarioMatchTipo } from "@/lib/statusAssinaturaUsuario";
import { agruparPagamentosPorUsuario, getUltimoPagamento } from "@/lib/pagamentosUsuario";
import { calcularIntervaloPeriodo, filtrarPagamentosPorPeriodo, PERIODO_PADRAO } from "@/lib/periodoFiltro";
import { fetchAllPages, withTimeout } from "@/lib/fetchAllPages";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import UsuariosFiltros from "@/components/admin/UsuariosFiltros";
import PeriodoFiltro from "@/components/admin/PeriodoFiltro";
import UsuariosTable from "@/components/admin/UsuariosTable";
import ResumoPagamentosCards from "@/components/admin/ResumoPagamentosCards";
import AcoesEmMassa from "@/components/admin/AcoesEmMassa";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export default function UsuariosTab({ usuarios, isLoading, isError, error, selecionados, setSelecionados, onDispararEmail }) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [planoFiltro, setPlanoFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [segmentoFiltro, setSegmentoFiltro] = useState("todos");
  const [origemFiltro, setOrigemFiltro] = useState("todos");
  const [tipoUsuarioFiltro, setTipoUsuarioFiltro] = useState("todos");
  const [situacaoPagamentoFiltro, setSituacaoPagamentoFiltro] = useState("todos");
  const [periodoFiltro, setPeriodoFiltro] = useState(PERIODO_PADRAO);
  const [dataInicioCustom, setDataInicioCustom] = useState("");
  const [dataFimCustom, setDataFimCustom] = useState("");
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [sincronizandoPagamentos, setSincronizandoPagamentos] = useState(false);

  const { data: pagamentos = [], isLoading: carregandoPagamentos, isError: erroPagamentos, error: detalheErroPagamentos } = useQuery({
    queryKey: ["admin-pagamentos"],
    queryFn: () => withTimeout(
      fetchAllPages(base44.entities.Pagamento, "-created_date", 500),
      30000,
      "Não foi possível carregar todo o histórico de pagamentos. Tente novamente."
    ),
    retry: false,
  });

  const { data: acessosCustos = [], isLoading: carregandoAcessosCustos } = useQuery({
    queryKey: ["admin-acessos-laboratorio-custos"],
    queryFn: () => fetchAllPages(base44.entities.AcessoLaboratorioCustosUsuario, "-updated_date", 500),
    retry: false,
  });

  // A contagem de movimentação é agregada no servidor: baixar todas as receitas,
  // refeições, cardápios e eventos no navegador era a maior fonte de lentidão.
  const { data: movimentacoes = {}, isLoading: carregandoMovimentacoes, isError: erroMovimentacoes, error: detalheErroMovimentacoes } = useQuery({
    queryKey: ["admin-movimentacao-laboratorio"],
    queryFn: async () => {
      const response = await base44.functions.invoke("movimentacaoAdminUsuarios", {});
      return response.data?.movimentacao || {};
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const movimentacaoPorUsuario = useMemo(
    () => new Map(Object.entries(movimentacoes)),
    [movimentacoes]
  );

  const acessoCustosPorUsuario = useMemo(() => {
    const map = new Map();
    for (const acesso of acessosCustos) if (acesso?.user_id && !map.has(acesso.user_id)) map.set(acesso.user_id, acesso);
    return map;
  }, [acessosCustos]);

  const pagamentosPorUsuario = useMemo(() => agruparPagamentosPorUsuario(pagamentos), [pagamentos]);

  const intervaloPeriodo = useMemo(
    () => calcularIntervaloPeriodo(periodoFiltro, dataInicioCustom, dataFimCustom),
    [periodoFiltro, dataInicioCustom, dataFimCustom]
  );
  const pagamentosPeriodo = useMemo(
    () => filtrarPagamentosPorPeriodo(pagamentos, intervaloPeriodo),
    [pagamentos, intervaloPeriodo]
  );
  const pagamentosPorUsuarioPeriodo = useMemo(() => agruparPagamentosPorUsuario(pagamentosPeriodo), [pagamentosPeriodo]);

  const usuariosFiltrados = useMemo(() => {
    const buscaNorm = busca.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (u.role === "admin") return false;
      if (buscaNorm) {
        const alvo = `${u.nome_completo || u.full_name || ""} ${u.email || ""} ${u.telefone_whatsapp || ""}`.toLowerCase();
        if (!alvo.includes(buscaNorm)) return false;
      }
      if (planoFiltro !== "todos" && u.plano_atual !== planoFiltro) return false;
      if (statusFiltro !== "todos" && computeStatusUsuario(u).label !== statusFiltro) return false;
      if (segmentoFiltro !== "todos" && u.segmento !== segmentoFiltro) return false;
      if (origemFiltro !== "todos" && u.origem !== origemFiltro) return false;
      if (tipoUsuarioFiltro !== "todos" && !usuarioMatchTipo(u, tipoUsuarioFiltro)) return false;
      if (situacaoPagamentoFiltro !== "todos") {
        const ultimo = getUltimoPagamento(pagamentosPorUsuario, u.id);
        if (!ultimo || ultimo.status !== situacaoPagamentoFiltro) return false;
      }
      return true;
    });
  }, [usuarios, busca, planoFiltro, statusFiltro, segmentoFiltro, origemFiltro, tipoUsuarioFiltro, situacaoPagamentoFiltro, pagamentosPorUsuario]);

  const pagamentosParaCards = useMemo(() => {
    const ids = new Set(usuariosFiltrados.map((u) => u.id));
    return pagamentosPeriodo.filter((p) => ids.has(p.usuario_id));
  }, [pagamentosPeriodo, usuariosFiltrados]);

  const handleToggle = (id) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleAll = (checked) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      usuariosFiltrados.forEach((u) => (checked ? next.add(u.id) : next.delete(u.id)));
      return next;
    });
  };

  const quantidadeSelecionada = usuarios.filter((u) => selecionados.has(u.id)).length;

  const handleDispararWhatsapp = () => {
    toast({ title: "Em breve", description: "O disparo de WhatsApp em massa ainda está em desenvolvimento." });
  };

  const aplicarStatus = async (novoStatus, labelSucesso) => {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => base44.entities.User.update(id, { status_assinatura: novoStatus })));
      await qc.invalidateQueries({ queryKey: ["admin-usuarios"] });
      setSelecionados(new Set());
      toast({ title: labelSucesso });
    } catch (err) {
      toast({ title: "Erro ao atualizar usuários", description: err.message, variant: "destructive" });
    }
  };

  const handleAtivar = () => aplicarStatus("ativo", "Usuários ativados");
  const handleDesativar = () => aplicarStatus("inativo", "Usuários desativados");

  const sincronizarPagamentos = async () => {
    setSincronizandoPagamentos(true);
    try {
      const response = await base44.functions.invoke("reprocessarPagamentoPix", { limite: 50 });
      const resumo = response.data?.resumo || {};
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-pagamentos"] }),
        qc.invalidateQueries({ queryKey: ["admin-usuarios"] }),
        qc.invalidateQueries({ queryKey: ["admin-acessos-laboratorio-custos"] }),
      ]);
      toast({
        title: "Pagamentos sincronizados",
        description: `${resumo.consultados || 0} consultados · ${resumo.atualizados || 0} atualizados · ${resumo.reparados || 0} acessos reparados`,
      });
    } catch (err) {
      toast({ title: "Erro ao sincronizar pagamentos", description: err.message, variant: "destructive" });
    } finally {
      setSincronizandoPagamentos(false);
    }
  };

  const confirmarExclusao = async () => {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    setExcluindo(true);
    try {
      for (const id of ids) {
        await base44.entities.User.delete(id);
      }
      await qc.invalidateQueries({ queryKey: ["admin-usuarios"] });
      setSelecionados(new Set());
      setConfirmExcluirOpen(false);
      toast({ title: "Usuário(s) excluído(s) permanentemente" });
    } catch (err) {
      toast({ title: "Erro ao excluir usuários", description: err.message, variant: "destructive" });
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="space-y-4">
      <ResumoPagamentosCards pagamentos={pagamentosParaCards} />

      <PeriodoFiltro
        periodoFiltro={periodoFiltro} setPeriodoFiltro={setPeriodoFiltro}
        dataInicioCustom={dataInicioCustom} setDataInicioCustom={setDataInicioCustom}
        dataFimCustom={dataFimCustom} setDataFimCustom={setDataFimCustom}
      />

      <UsuariosFiltros
        busca={busca} setBusca={setBusca}
        planoFiltro={planoFiltro} setPlanoFiltro={setPlanoFiltro}
        statusFiltro={statusFiltro} setStatusFiltro={setStatusFiltro}
        segmentoFiltro={segmentoFiltro} setSegmentoFiltro={setSegmentoFiltro}
        origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro}
        tipoUsuarioFiltro={tipoUsuarioFiltro} setTipoUsuarioFiltro={setTipoUsuarioFiltro}
        situacaoPagamentoFiltro={situacaoPagamentoFiltro} setSituacaoPagamentoFiltro={setSituacaoPagamentoFiltro}
      />

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={sincronizarPagamentos} disabled={sincronizandoPagamentos}>
          <RefreshCw className={`w-4 h-4 ${sincronizandoPagamentos ? "animate-spin" : ""}`} />
          {sincronizandoPagamentos ? "Sincronizando..." : "Sincronizar pagamentos"}
        </Button>
      </div>

      <AcoesEmMassa
        quantidade={quantidadeSelecionada}
        onDispararEmail={onDispararEmail}
        onDispararWhatsapp={handleDispararWhatsapp}
        onAtivar={handleAtivar}
        onDesativar={handleDesativar}
        onExcluir={() => setConfirmExcluirOpen(true)}
      />

      {isLoading || carregandoPagamentos || carregandoAcessosCustos || carregandoMovimentacoes ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando usuários e pagamentos...</p>
      ) : isError || erroPagamentos || erroMovimentacoes ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error?.message || detalheErroPagamentos?.message || detalheErroMovimentacoes?.message || "Não foi possível carregar os dados administrativos."}
        </div>
      ) : (
        <UsuariosTable
          usuarios={usuariosFiltrados}
          selecionados={selecionados}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
          pagamentosPorUsuario={pagamentosPorUsuario}
          pagamentosPorUsuarioPeriodo={pagamentosPorUsuarioPeriodo}
          acessoCustosPorUsuario={acessoCustosPorUsuario}
          movimentacaoPorUsuario={movimentacaoPorUsuario}
        />
      )}

      <AlertDialog open={confirmExcluirOpen} onOpenChange={setConfirmExcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cadastro de {quantidadeSelecionada} usuário(s) será removido
              permanentemente da plataforma, incluindo dados de conta e histórico de acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              disabled={excluindo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluindo ? "Excluindo..." : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}