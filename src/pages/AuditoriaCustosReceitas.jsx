import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, DollarSign, Eye, Loader2, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { CUSTO_RECEITA_MODELO_VERSAO } from "@/lib/custoReceita";
import CuradoriaCustosPendentes from "@/components/auditoria/CuradoriaCustosPendentes";

const STATUS_LABEL = {
  atual: "Atual",
  a_recalcular: "A recalcular",
  incompleto: "Incompleto",
  legado: "Legado",
};

const MOTIVO_LABEL = {
  sem_preco: "ingrediente sem preço",
  ingrediente_sem_id: "item sem ingrediente_id",
  ingrediente_nao_encontrado: "ingrediente não encontrado",
  ingrediente_nome_id_divergente: "ID e nome apontam para ingredientes diferentes",
  esquecido_nome_id_divergente: "ingrediente esquecido com ID/nome divergentes",
  esquecido_sem_preco: "ingrediente esquecido sem preço",
  esquecido_preco_legado: "ingrediente esquecido depende de cache legado",
  insumo_sem_preco: "insumo sem preço",
  subreceita_sem_cache: "sub-receita sem cache",
  receita_sem_composicao_custeavel: "receita sem composição custeável",
};

export default function AuditoriaCustosReceitas() {
  const qc = useQueryClient();
  const [processando, setProcessando] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saneamentoPreview, setSaneamentoPreview] = useState(null);

  const { data: receitas = [], isLoading } = useQuery({
    queryKey: ["auditoria-custos-receitas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "nome"),
    staleTime: 0,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["auditoria-custos-receitas-logs"],
    queryFn: () => base44.entities.NormalizacaoCustoReceitaLog.list("-executado_em", 20),
    staleTime: 30 * 1000,
  });

  const { data: logsSaneamento = [] } = useQuery({
    queryKey: ["auditoria-custos-pendencias-logs"],
    queryFn: () => base44.entities.SaneamentoCustoPendenciaLog.list("-executado_em", 20),
    staleTime: 30 * 1000,
  });

  const diagnostico = useMemo(() => {
    const rows = receitas.map((receita) => {
      const versao = Number(receita.custo_modelo_versao) || 0;
      const statusPersistido = receita.custo_cache_status || (versao >= CUSTO_RECEITA_MODELO_VERSAO ? "a_recalcular" : "legado");
      const problemas = [];
      if (versao < CUSTO_RECEITA_MODELO_VERSAO) problemas.push("modelo_legado");
      if (statusPersistido === "incompleto") problemas.push("cache_incompleto");
      if (statusPersistido === "a_recalcular") problemas.push("cache_a_recalcular");
      if (receita.custo_cache_invalido === true) problemas.push("cache_invalidado");
      if (!receita.custo_cache_atualizado_em && versao >= CUSTO_RECEITA_MODELO_VERSAO) problemas.push("sem_data_normalizacao");
      if (Number(receita.custo_cache_itens_sem_preco) > 0) problemas.push("itens_sem_preco");
      return { receita, versao, status: statusPersistido, problemas };
    });

    return {
      rows,
      total: rows.length,
      atuais: rows.filter((r) => r.versao >= CUSTO_RECEITA_MODELO_VERSAO && r.status === "atual").length,
      incompletas: rows.filter((r) => r.status === "incompleto").length,
      legado: rows.filter((r) => r.versao < CUSTO_RECEITA_MODELO_VERSAO).length,
      aRecalcular: rows.filter((r) => r.status === "a_recalcular").length,
      invalidadas: rows.filter((r) => r.receita.custo_cache_invalido === true).length,
      semPreco: rows.reduce((s, r) => s + (Number(r.receita.custo_cache_itens_sem_preco) || 0), 0),
      pendentes: rows.filter((r) => r.receita.custo_cache_invalido === true || !(r.versao >= CUSTO_RECEITA_MODELO_VERSAO && r.status === "atual")),
    };
  }, [receitas]);

  const analisarMigracao = async () => {
    setProcessando(true);
    try {
      const res = await base44.functions.invoke("normalizarCustosReceitas", { dry_run: true });
      const dados = res?.data || {};
      setPreview(dados);
      toast.success(`Análise concluída: ${dados.migraveis || 0} migrável(is), ${dados.incompletas || 0} incompleta(s).`);
    } catch (error) {
      toast.error("Erro ao analisar custos: " + (error?.response?.data?.error || error?.message || "erro desconhecido"));
    } finally {
      setProcessando(false);
    }
  };

  const analisarPendencias = async () => {
    setProcessando(true);
    try {
      const [res, preparacoes] = await Promise.all([
        base44.functions.invoke("sanearCustosPendentes", { dry_run: true }),
        base44.functions.invoke("sincronizarSubreceita", { migrar_preparacoes_exatas: true, dry_run: true }),
      ]);
      const dados = res?.data || {};
      const preparacoesDados = preparacoes?.data || {};
      setSaneamentoPreview({ ...dados, preparacoes_exatas: preparacoesDados });
      toast.success(
        `Pendências analisadas: ${dados.receitas_potencialmente_resolvidas || 0} receita(s) por preço/referência + ` +
        `${preparacoesDados.candidatos || 0} preparação(ões) migrável(is) para sub-receita.`
      );
    } catch (error) {
      toast.error("Erro ao analisar pendências: " + (error?.response?.data?.error || error?.message || "erro desconhecido"));
    } finally {
      setProcessando(false);
    }
  };

  const aplicarSaneamento = async () => {
    if (!saneamentoPreview) {
      toast.error("Execute a análise das pendências antes de aplicar correções.");
      return;
    }
    const ok = window.confirm(
      `Aplicar somente as correções determinísticas encontradas? ` +
      `${saneamentoPreview.receitas_potencialmente_resolvidas || 0} receita(s) podem ficar completas; casos ambíguos permanecerão para revisão manual.`
    );
    if (!ok) return;

    setProcessando(true);
    try {
      const preparacoes = await base44.functions.invoke("sincronizarSubreceita", { migrar_preparacoes_exatas: true, dry_run: false });
      const saneamento = await base44.functions.invoke("sanearCustosPendentes", { dry_run: false });
      const recalculo = await base44.functions.invoke("normalizarCustosReceitas", { dry_run: false, somente_incompletas: true });
      const preparacoesDados = preparacoes?.data || {};
      const saneamentoDados = saneamento?.data || {};
      const recalculoDados = recalculo?.data || {};
      setSaneamentoPreview(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["auditoria-custos-receitas"] }),
        qc.invalidateQueries({ queryKey: ["auditoria-custos-receitas-logs"] }),
        qc.invalidateQueries({ queryKey: ["auditoria-custos-pendencias-logs"] }),
        qc.invalidateQueries({ queryKey: ["receitas"] }),
        qc.invalidateQueries({ queryKey: ["ingredientes"] }),
      ]);
      toast.success(
        `${recalculoDados.migraveis || 0} receita(s) saneada(s); ${recalculoDados.incompletas || 0} continuam em revisão manual. ` +
        `${preparacoesDados.migrados || 0} preparação(ões) migrada(s) para sub-receita e ` +
        `${(saneamentoDados.correcoes?.referencias_reapontaveis || 0)} referência(s) reapontada(s).`
      );
    } catch (error) {
      toast.error("Erro ao aplicar saneamento: " + (error?.response?.data?.error || error?.message || "erro desconhecido"));
    } finally {
      setProcessando(false);
    }
  };

  const recalcularInvalidadas = async () => {
    if (diagnostico.invalidadas <= 0) return;
    setProcessando(true);
    try {
      const res = await base44.functions.invoke("normalizarCustosReceitas", {
        dry_run: false,
        somente_invalidadas: true,
      });
      const dados = res?.data || {};
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["auditoria-custos-receitas"] }),
        qc.invalidateQueries({ queryKey: ["auditoria-custos-receitas-logs"] }),
        qc.invalidateQueries({ queryKey: ["receitas"] }),
      ]);
      toast.success(`${dados.normalizadas || 0} cache(s) invalidado(s) recalculado(s); ${dados.incompletas || 0} continuam incompletos.`);
    } catch (error) {
      toast.error("Erro ao recalcular caches invalidados: " + (error?.response?.data?.error || error?.message || "erro desconhecido"));
    } finally {
      setProcessando(false);
    }
  };

  const aplicarMigracao = async () => {
    if (!preview) {
      toast.error("Execute a análise antes de aplicar a migração.");
      return;
    }
    const ok = window.confirm(
      `Aplicar a migração em ${preview.migraveis || 0} receita(s) completas? ` +
      `${preview.incompletas || 0} receita(s) incompletas terão apenas o diagnóstico atualizado e manterão seus valores monetários atuais.`
    );
    if (!ok) return;

    setProcessando(true);
    try {
      const res = await base44.functions.invoke("normalizarCustosReceitas", { dry_run: false });
      const dados = res?.data || {};
      setPreview(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["auditoria-custos-receitas"] }),
        qc.invalidateQueries({ queryKey: ["auditoria-custos-receitas-logs"] }),
        qc.invalidateQueries({ queryKey: ["receitas"] }),
      ]);
      toast.success(`${dados.normalizadas || 0} receita(s) processada(s); ${dados.incompletas || 0} incompleta(s) preservada(s).`);
    } catch (error) {
      toast.error("Erro ao migrar custos: " + (error?.response?.data?.error || error?.message || "erro desconhecido"));
    } finally {
      setProcessando(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Receitas · Custos</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Fases 10.1–10.2: custos canônicos, saneamento por causa-raiz e correções determinísticas. Registros ambíguos ou sem fonte confiável permanecem bloqueados para revisão manual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={analisarPendencias} disabled={processando || diagnostico.incompletas === 0} className="gap-2">
            {processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
            Analisar pendências
          </Button>
          <Button onClick={aplicarSaneamento} disabled={processando || !saneamentoPreview} className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            Aplicar saneamento seguro
          </Button>
          <Button variant="outline" onClick={recalcularInvalidadas} disabled={processando || diagnostico.invalidadas === 0} className="gap-2">
            {processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            Recalcular invalidadas
          </Button>
          <Button variant="outline" onClick={analisarMigracao} disabled={processando} className="gap-2">
            {processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Analisar migração
          </Button>
          <Button onClick={aplicarMigracao} disabled={processando || !preview} className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            Aplicar caches seguros
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Receitas</p><p className="text-xl font-bold">{diagnostico.total}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Atuais</p><p className="text-xl font-bold text-primary">{diagnostico.atuais}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Invalidadas</p><p className="text-xl font-bold text-amber-700">{diagnostico.invalidadas}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Legado</p><p className="text-xl font-bold text-amber-600">{diagnostico.legado}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Incompletas</p><p className="text-xl font-bold text-destructive">{diagnostico.incompletas}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Itens problemáticos</p><p className="text-xl font-bold">{diagnostico.semPreco}</p></Card>
      </div>

      {diagnostico.incompletas > 0 && <CuradoriaCustosPendentes />}

      {saneamentoPreview && (
        <Card className="p-4 border-amber-400/40">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-5 h-5 text-amber-700" />
            <div>
              <h3 className="font-semibold">Fase 10.2 — análise das pendências por causa-raiz</h3>
              <p className="text-xs text-muted-foreground">Somente vínculo exato/único e preço matematicamente derivável são classificados como automáticos.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <div><p className="text-xs text-muted-foreground">Incompletas</p><p className="text-lg font-bold">{saneamentoPreview.receitas_incompletas || 0}</p></div>
            <div><p className="text-xs text-muted-foreground">Resolvíveis</p><p className="text-lg font-bold text-primary">{saneamentoPreview.receitas_potencialmente_resolvidas || 0}</p></div>
            <div><p className="text-xs text-muted-foreground">Preparações → sub-receita</p><p className="text-lg font-bold text-primary">{saneamentoPreview.preparacoes_exatas?.candidatos || 0}</p></div>
            <div><p className="text-xs text-muted-foreground">Revisão manual</p><p className="text-lg font-bold text-destructive">{saneamentoPreview.receitas_com_revisao_manual || 0}</p></div>
            <div><p className="text-xs text-muted-foreground">Preços deriváveis</p><p className="text-lg font-bold">{(saneamentoPreview.correcoes?.precos_derivados_mestre || 0) + (saneamentoPreview.correcoes?.precos_derivados_usuario || 0)}</p></div>
            <div><p className="text-xs text-muted-foreground">Referências</p><p className="text-lg font-bold">{saneamentoPreview.correcoes?.referencias_reapontaveis || 0}</p></div>
            <div><p className="text-xs text-muted-foreground">Insumos</p><p className="text-lg font-bold">{saneamentoPreview.correcoes?.insumos_recalculaveis || 0}</p></div>
          </div>

          {(saneamentoPreview.grupos?.precos || []).length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Principais ingredientes sem preço</p>
              <div className="flex flex-wrap gap-1.5">
                {saneamentoPreview.grupos.precos.slice(0, 12).map((g, idx) => (
                  <Badge key={`${g.ingrediente_id || g.ingrediente_nome}-${idx}`} variant={g.automatico ? "secondary" : "outline"} className="text-[10px]">
                    {g.ingrediente_nome || "Sem nome"} · {g.ocorrencias} ocorrência(s) · {g.automatico ? "automático" : "manual"}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(saneamentoPreview.grupos?.referencias || []).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Referências quebradas</p>
              <div className="flex flex-wrap gap-1.5">
                {saneamentoPreview.grupos.referencias.slice(0, 12).map((g, idx) => (
                  <Badge key={`${g.ingrediente_id_antigo || g.ingrediente_nome_cache}-${idx}`} variant={g.automatico ? "secondary" : "outline"} className="text-[10px]">
                    {g.ingrediente_nome_cache || g.tipo} · {g.ocorrencias} · {g.automatico ? "reapontável" : "manual"}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {preview && (
        <Card className="p-4 border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold">Prévia da migração — nenhuma gravação feita nesta análise</h3>
              <p className="text-xs text-muted-foreground">A prévia usa o mesmo motor server-side que será aplicado na migração.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><p className="text-xs text-muted-foreground">Analisadas</p><p className="text-lg font-bold">{preview.total_receitas || 0}</p></div>
            <div><p className="text-xs text-muted-foreground">Migráveis</p><p className="text-lg font-bold text-primary">{preview.migraveis || 0}</p></div>
            <div><p className="text-xs text-muted-foreground">Incompletas</p><p className="text-lg font-bold text-destructive">{preview.incompletas || 0}</p></div>
            <div><p className="text-xs text-muted-foreground">Sem preço</p><p className="text-lg font-bold">{preview.itens_sem_preco || 0}</p></div>
            <div><p className="text-xs text-muted-foreground">Referências ausentes</p><p className="text-lg font-bold">{preview.referencias_ausentes || 0}</p></div>
          </div>
          {(preview.esquecidos_legado || 0) > 0 && (
            <p className="mt-3 text-xs text-amber-800">{preview.esquecidos_legado} ingrediente(s) esquecido(s) ainda dependem de preço/cache legado e bloqueiam a migração da respectiva receita.</p>
          )}
        </Card>
      )}

      {preview?.revisar?.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b bg-amber-50/50">
            <h3 className="font-semibold text-amber-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Pendências encontradas no dry-run</h3>
            <p className="text-xs text-muted-foreground">Estas receitas não terão custo monetário sobrescrito enquanto a pendência existir.</p>
          </div>
          <div className="max-h-[420px] overflow-auto">
            {preview.revisar.slice(0, 300).map((row) => (
              <div key={row.id} className="grid md:grid-cols-[1.5fr_110px_100px_100px_2fr] gap-2 px-4 py-2.5 border-t text-sm items-start">
                <div className="font-medium">{row.nome}</div>
                <div><Badge variant="outline" className="text-[10px]">{row.contexto}</Badge></div>
                <div className="text-xs">Sem preço: {row.itens_sem_preco || 0}</div>
                <div className="text-xs">Ref.: {row.referencias_ausentes || 0}</div>
                <div className="flex flex-wrap gap-1">
                  {[...new Set((row.problemas || []).map((p) => p.tipo))].map((tipo) => (
                    <Badge key={tipo} variant="secondary" className="text-[10px]">{MOTIVO_LABEL[tipo] || tipo}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {diagnostico.pendentes.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
          <p>Todos os caches de custo estão no modelo canônico.</p>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.5fr_110px_100px_120px_1fr] gap-2 px-3 py-2 bg-secondary/50 text-[10px] uppercase font-semibold text-muted-foreground">
            <div>Receita</div><div>Contexto</div><div>Status</div><div>Cache</div><div>Diagnóstico</div>
          </div>
          {diagnostico.pendentes.slice(0, 300).map(({ receita, versao, status, problemas }) => (
            <div key={receita.id} className="grid md:grid-cols-[1.5fr_110px_100px_120px_1fr] gap-2 px-3 py-2.5 border-t items-center text-sm">
              <div className="min-w-0"><p className="font-medium truncate" title={receita.nome}>{receita.nome}</p></div>
              <div><Badge variant="outline" className="text-[10px]">{receita.custo_cache_contexto || (receita.is_base === false ? "proprietário" : "global")}</Badge></div>
              <div><Badge variant={status === "incompleto" ? "destructive" : "secondary"} className="text-[10px]">{STATUS_LABEL[status] || status}</Badge></div>
              <div className="text-xs">v{versao || 0} · R$ {Number(receita.custo_total || 0).toFixed(2)}</div>
              <div className="flex flex-wrap gap-1">
                {problemas.map((p) => <Badge key={p} variant="secondary" className="text-[10px]">{p.replaceAll("_", " ")}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {logsSaneamento.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Wrench className="w-4 h-4" /> Histórico de saneamento 10.2</h3>
          <div className="space-y-1.5 text-xs">
            {logsSaneamento.slice(0, 10).map((log) => (
              <div key={log.id} className="flex flex-wrap gap-x-3 gap-y-1 border-t first:border-0 pt-1.5 first:pt-0">
                <span className="font-medium">{log.receitas_incompletas_antes || 0} incompleta(s) analisada(s)</span>
                <span>{log.precos_derivados_mestre || 0} preço(s) mestre derivado(s)</span>
                <span>{log.referencias_reapontadas || 0} referência(s) reapontada(s)</span>
                <span>{log.insumos_recalculados || 0} insumo(s) corrigido(s)</span>
                <span>{log.pendencias_manuais == null ? "—" : log.pendencias_manuais} receita(s) manual(is)</span>
                <span className="text-muted-foreground">{log.executado_em ? new Date(log.executado_em).toLocaleString("pt-BR") : ""}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {logs.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><DollarSign className="w-4 h-4" /> Histórico recente</h3>
          <div className="space-y-1.5 text-xs">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex flex-wrap gap-x-3 gap-y-1 border-t first:border-0 pt-1.5 first:pt-0">
                <span className="font-medium">{log.normalizadas || 0} processada(s)</span>
                <span>{log.incompletas || 0} incompleta(s)</span>
                <span>{log.itens_sem_preco || 0} sem preço</span>
                <span>{log.referencias_ausentes || 0} referência(s) ausente(s)</span>
                <span className="text-muted-foreground">{log.executado_em ? new Date(log.executado_em).toLocaleString("pt-BR") : ""}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(diagnostico.incompletas > 0 || preview?.incompletas > 0) && (
        <Card className="p-4 border-amber-400/50 bg-amber-50/50">
          <p className="font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Caches incompletos não substituem valores antigos.</p>
          <p className="text-xs text-muted-foreground mt-1">A migração grava apenas o diagnóstico até que preço/referência seja corrigido, evitando transformar cálculo parcial em custo oficial.</p>
        </Card>
      )}
    </div>
  );
}