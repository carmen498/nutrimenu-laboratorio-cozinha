import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";
import { computeStatusUsuario, usuarioMatchTipo } from "@/lib/statusAssinaturaUsuario";
import { agruparPagamentosPorUsuario, getUltimoPagamento } from "@/lib/pagamentosUsuario";
import { calcularIntervaloPeriodo, filtrarPagamentosPorPeriodo, PERIODO_PADRAO } from "@/lib/periodoFiltro";
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

export default function UsuariosTab({ usuarios, isLoading, selecionados, setSelecionados, onDispararEmail }) {
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

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["admin-pagamentos"],
    queryFn: () => base44.entities.Pagamento.list("-created_date", 2000),
  });

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

      <AcoesEmMassa
        quantidade={quantidadeSelecionada}
        onDispararEmail={onDispararEmail}
        onDispararWhatsapp={handleDispararWhatsapp}
        onAtivar={handleAtivar}
        onDesativar={handleDesativar}
        onExcluir={() => setConfirmExcluirOpen(true)}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando usuários...</p>
      ) : (
        <UsuariosTable
          usuarios={usuariosFiltrados}
          selecionados={selecionados}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
          pagamentosPorUsuario={pagamentosPorUsuario}
          pagamentosPorUsuarioPeriodo={pagamentosPorUsuarioPeriodo}
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