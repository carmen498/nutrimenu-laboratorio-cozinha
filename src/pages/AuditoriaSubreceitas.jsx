import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, GitBranch, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fetchAllPages } from "@/lib/fetchAllPages";

const atualizadoEm = (r) => r?.updated_date || r?.updated_at || r?.created_date || "";
const assinatura = (deps) => [...deps.entries()]
  .sort(([a], [b]) => String(a).localeCompare(String(b)))
  .map(([id, data]) => `${id}@${data || "sem-data"}`)
  .join("|");

const rendimentoOperacional = (receita, itens) => {
  const informado = Number(receita?.peso_pos_preparo_total) > 0
    ? Number(receita.peso_pos_preparo_total)
    : (Number(receita?.rendimento_total) > 0 ? Number(receita.rendimento_total) : 0);
  if (informado > 0) return informado;
  const porcoes = Number(receita?.porcoes_base) > 0 ? Number(receita.porcoes_base) : 1;
  const total = (itens || [])
    .filter((item) => item.tipo !== "grupo" && !item.subreceita_parent_id)
    .reduce((soma, item) => soma + (Number(item.quantidade_por_porcao) || 0) * porcoes, 0);
  return total > 0 ? total : 1;
};

const numeroCache = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(10) : "0.0000000000";
};

const chaveCacheAtomico = (item) => [
  String(item?.subreceita_origem_receita_id || "").trim(),
  String(item?.subreceita_origem_item_id || "").trim(),
  String(item?.ingrediente_id || "").trim(),
  numeroCache(item?.quantidade_por_porcao),
  String(item?.unidade_quantidade || "").trim(),
  String(item?.pre_preparo || "").trim(),
  item?.proporcional === false ? "0" : "1",
  numeroCache(item?.fator_correcao_override),
  String(item?.medida_caseira_id || "").trim(),
  numeroCache(item?.quantidade_medida_caseira),
  String(item?.medida_caseira || "").trim(),
  String(item?.subreceita_linhagem || "").trim(),
].join("~");

const assinaturaConteudoCache = (lista) => (lista || []).map(chaveCacheAtomico).sort().join("||");

const STATUS_LABEL = {
  sincronizada: "Sincronizada",
  desatualizada: "Desatualizada",
  a_validar: "A validar",
  pendente: "Pendente",
  erro_ciclo: "Ciclo",
  origem_ausente: "Origem ausente",
};

export default function AuditoriaSubreceitas() {
  const qc = useQueryClient();
  const [sincronizando, setSincronizando] = useState(null);
  const [sincronizandoTodas, setSincronizandoTodas] = useState(false);

  const { data: receitas = [], isLoading: l1 } = useQuery({
    queryKey: ["auditoria-subreceitas-receitas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "nome"),
  });
  const { data: itens = [], isLoading: l2 } = useQuery({
    queryKey: ["auditoria-subreceitas-itens"],
    queryFn: () => fetchAllPages(base44.entities.IngredienteReceita, "ordem"),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["auditoria-subreceitas-logs"],
    queryFn: () => base44.entities.SincronizacaoSubreceitaLog.list("-executado_em", 20),
    staleTime: 30 * 1000,
  });

  const receitaMap = useMemo(() => Object.fromEntries(receitas.map((r) => [r.id, r])), [receitas]);

  const diagnostico = useMemo(() => {
    const itensPorReceita = new Map();
    const markerMap = new Map();
    const filhosPorMarker = new Map();

    for (const item of itens) {
      if (!itensPorReceita.has(item.receita_id)) itensPorReceita.set(item.receita_id, []);
      itensPorReceita.get(item.receita_id).push(item);
      if (item.tipo === "subreceita") markerMap.set(item.id, item);
      if (item.subreceita_parent_id) {
        if (!filhosPorMarker.has(item.subreceita_parent_id)) filhosPorMarker.set(item.subreceita_parent_id, []);
        filhosPorMarker.get(item.subreceita_parent_id).push(item);
      }
    }

    const calcularEstadoEsperado = (sourceId, parentId, quantidadeSaida) => {
      const deps = new Map();
      const esperados = [];
      let ultimaComposicaoMs = 0;
      let ultimaComposicaoEm = "";

      const visitar = (id, quantidade, pilha) => {
        if (pilha.includes(id)) {
          const nomes = [...pilha, id].map((rid) => receitaMap[rid]?.nome || rid);
          const err = /** @type {Error & {code?: string}} */ (new Error(`Ciclo: ${nomes.join(" → ")}`));
          err.code = "CICLO";
          throw err;
        }
        const receita = receitaMap[id];
        if (!receita) {
          const err = /** @type {Error & {code?: string}} */ (new Error(`Origem não encontrada: ${id}`));
          err.code = "ORIGEM";
          throw err;
        }

        deps.set(id, atualizadoEm(receita));
        const sourceItens = itensPorReceita.get(id) || [];
        const rendimento = rendimentoOperacional(receita, sourceItens);
        const porcoes = Number(receita?.porcoes_base) > 0 ? Number(receita.porcoes_base) : 1;
        const escala = quantidade / rendimento;

        for (const item of sourceItens) {
          if (item.tipo === "grupo" || item.subreceita_parent_id) continue;
          const data = atualizadoEm(item);
          const ms = data ? Date.parse(data) : 0;
          if (Number.isFinite(ms) && ms > ultimaComposicaoMs) {
            ultimaComposicaoMs = ms;
            ultimaComposicaoEm = data;
          }

          const qtdLote = (Number(item.quantidade_por_porcao) || 0) * porcoes;
          const qtdEscalada = qtdLote * escala;
          if (!(qtdEscalada > 0)) continue;

          if (item.tipo === "subreceita") {
            if (!item.subreceita_id) {
              const err = /** @type {Error & {code?: string}} */ (new Error(`Sub-receita sem referência em ${receita.nome || receita.id}`));
              err.code = "ORIGEM";
              throw err;
            }
            visitar(item.subreceita_id, qtdEscalada, [...pilha, id]);
            continue;
          }
          if (!item.ingrediente_id) continue;

          esperados.push({
            ingrediente_id: item.ingrediente_id,
            quantidade_por_porcao: qtdEscalada,
            unidade_quantidade: item.unidade_quantidade || (receita.unidade_base === "ml" ? "ml" : "g"),
            pre_preparo: item.pre_preparo || "",
            proporcional: item.proporcional !== false,
            fator_correcao_override: Number(item.fator_correcao_override) > 0 ? Number(item.fator_correcao_override) : 0,
            medida_caseira_id: item.medida_caseira_id || "",
            quantidade_medida_caseira: item.quantidade_medida_caseira,
            medida_caseira: item.medida_caseira || "",
            subreceita_origem_receita_id: receita.id,
            subreceita_origem_item_id: item.id || "",
            subreceita_linhagem: [...pilha, id].join(">"),
          });
        }
      };

      visitar(sourceId, Number(quantidadeSaida) || 0, parentId ? [parentId] : []);
      return {
        valor: assinatura(deps),
        dependencias: deps,
        ultimaComposicaoMs,
        ultimaComposicaoEm,
        assinaturaConteudoEsperado: assinaturaConteudoCache(esperados),
      };
    };

    const rows = [...markerMap.values()].map((marker) => {
      const parent = receitaMap[marker.receita_id];
      const source = receitaMap[marker.subreceita_id];
      const filhos = filhosPorMarker.get(marker.id) || [];
      const cacheAssinatura = marker.subreceita_dependencias_assinatura
        || filhos.find((f) => f.subreceita_dependencias_assinatura)?.subreceita_dependencias_assinatura
        || "";
      const cacheV2 = filhos.length > 0 && filhos.every((f) => f.subreceita_cache === true && Number(f.subreceita_cache_versao) >= 2 && Number(f.modelo_versao) === 2);
      const markerModeloLegado = Number(marker.modelo_versao) !== 2;
      const markerSemCache = filhos.length === 0;
      const cacheParentReceitaDivergente = filhos.filter((f) => f.receita_id !== marker.receita_id);
      const cacheVersaoLegada = filhos.filter((f) => f.subreceita_cache !== true || Number(f.subreceita_cache_versao) < 2 || Number(f.modelo_versao) !== 2);
      const cacheLinhagemIncompleta = filhos.filter((f) => !f.subreceita_linhagem);
      const cacheOrigemIncompleta = filhos.filter((f) => !f.subreceita_origem_receita_id || !f.subreceita_origem_item_id);
      const cacheAssinaturaIncompleta = filhos.filter((f) => !f.subreceita_dependencias_assinatura);
      const assinaturasFilhos = new Set(filhos.map((f) => f.subreceita_dependencias_assinatura).filter(Boolean));
      const cacheAssinaturaDivergente = assinaturasFilhos.size > 1
        || (!!marker.subreceita_dependencias_assinatura && [...assinaturasFilhos].some((a) => a !== marker.subreceita_dependencias_assinatura));

      let status = "pendente";
      let assinaturaAtual = "";
      let dependencias = 0;
      let erro = "";
      let composicaoMudouDepois = false;
      let ultimaComposicaoEm = "";
      if (!source) {
        status = "origem_ausente";
      } else {
        try {
          const atual = calcularEstadoEsperado(source.id, marker.receita_id, marker.quantidade_por_porcao);
          assinaturaAtual = atual.valor;
          dependencias = atual.dependencias.size;
          ultimaComposicaoEm = atual.ultimaComposicaoEm || "";
          const sincronizadaMs = marker.subreceita_sincronizada_em ? Date.parse(marker.subreceita_sincronizada_em) : 0;
          composicaoMudouDepois = atual.ultimaComposicaoMs > (Number.isFinite(sincronizadaMs) ? sincronizadaMs : 0);
          const cacheConteudoAtual = assinaturaConteudoCache(filhos) === atual.assinaturaConteudoEsperado;
          if (filhos.length === 0) status = "pendente";
          else if (!cacheV2) status = "a_validar";
          else status = cacheConteudoAtual ? "sincronizada" : "desatualizada";
        } catch (e) {
          status = e?.code === "CICLO" ? "erro_ciclo" : "origem_ausente";
          erro = e?.message || "Erro de linhagem";
        }
      }

      const problemasEstruturais = [
        markerModeloLegado && "marcador legado",
        markerSemCache && "sem cache",
        !parent && "receita-pai ausente",
        cacheParentReceitaDivergente.length > 0 && "filho em receita divergente",
        cacheVersaoLegada.length > 0 && "cache legado",
        cacheLinhagemIncompleta.length > 0 && "linhagem incompleta",
        cacheOrigemIncompleta.length > 0 && "origem do filho incompleta",
        cacheAssinaturaIncompleta.length > 0 && "assinatura do filho ausente",
        cacheAssinaturaDivergente && "assinaturas de cache divergentes",
      ].filter(Boolean);

      return {
        marker,
        parent,
        source,
        filhos,
        status,
        cacheAssinatura,
        assinaturaAtual,
        cacheV2,
        dependencias,
        erro,
        composicaoMudouDepois,
        ultimaComposicaoEm,
        markerModeloLegado,
        markerSemCache,
        cacheParentReceitaDivergente,
        cacheVersaoLegada,
        cacheLinhagemIncompleta,
        cacheOrigemIncompleta,
        cacheAssinaturaIncompleta,
        cacheAssinaturaDivergente,
        problemasEstruturais,
      };
    });

    const orfaos = itens.filter((item) => item.subreceita_parent_id && !markerMap.has(item.subreceita_parent_id));
    const filhosCache = itens.filter((item) => item.subreceita_cache === true);
    return {
      rows,
      orfaos,
      total: rows.length,
      filhosCache: filhosCache.length,
      sincronizadas: rows.filter((r) => r.status === "sincronizada").length,
      desatualizadas: rows.filter((r) => r.status === "desatualizada").length,
      composicaoAlterada: rows.filter((r) => r.composicaoMudouDepois).length,
      revisar: rows.filter((r) => ["a_validar", "pendente"].includes(r.status)).length,
      erros: rows.filter((r) => ["erro_ciclo", "origem_ausente"].includes(r.status)).length,
      markersModeloLegado: rows.filter((r) => r.markerModeloLegado).length,
      markersSemCache: rows.filter((r) => r.markerSemCache).length,
      relacoesComProblemaEstrutural: rows.filter((r) => r.problemasEstruturais.length > 0).length,
      cacheVersaoLegada: rows.reduce((n, r) => n + r.cacheVersaoLegada.length, 0),
      cacheLinhagemIncompleta: rows.reduce((n, r) => n + r.cacheLinhagemIncompleta.length, 0),
      cacheOrigemIncompleta: rows.reduce((n, r) => n + r.cacheOrigemIncompleta.length, 0),
      cacheAssinaturaIncompleta: rows.reduce((n, r) => n + r.cacheAssinaturaIncompleta.length, 0),
      cacheParentReceitaDivergente: rows.reduce((n, r) => n + r.cacheParentReceitaDivergente.length, 0),
      cacheAssinaturaDivergente: rows.filter((r) => r.cacheAssinaturaDivergente).length,
    };
  }, [itens, receitaMap]);

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["auditoria-subreceitas-itens"] }),
      qc.invalidateQueries({ queryKey: ["itens-receita"] }),
      qc.invalidateQueries({ queryKey: ["auditoria-subreceitas-logs"] }),
    ]);
  };

  const sincronizarUma = async (markerId) => {
    setSincronizando(markerId);
    try {
      const res = await base44.functions.invoke("sincronizarSubreceita", { marker_id: markerId });
      const dados = res?.data || {};
      await refresh();
      toast.success(`Sub-receita ${STATUS_LABEL[dados.status] || dados.status || "sincronizada"}. Cache: ${dados.filhos_novos ?? "—"} item(ns).`);
    } catch (error) {
      toast.error("Erro ao sincronizar: " + (error?.message || "erro desconhecido"));
    } finally {
      setSincronizando(null);
    }
  };

  const sincronizarTodas = async () => {
    setSincronizandoTodas(true);
    try {
      const res = await base44.functions.invoke("sincronizarSubreceita", { todos_desatualizados: true });
      const dados = res?.data || {};
      await refresh();
      toast.success(`${dados.processados || 0} relação(ões) processada(s); ${dados.sincronizados_ja_atualizados || 0} já estavam atualizadas.`);
    } catch (error) {
      toast.error("Erro na sincronização em lote: " + (error?.message || "erro desconhecido"));
    } finally {
      setSincronizandoTodas(false);
    }
  };

  if (l1 || l2) {
    return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Sub-receitas · Linhagem e Sincronização</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Fase 8: a relação por subreceita_id é a fonte de verdade. Os ingredientes puxados são cache derivado e podem ser reconstruídos quando qualquer receita da linhagem mudar.
          </p>
        </div>
        <Button onClick={sincronizarTodas} disabled={sincronizandoTodas} className="gap-2">
          {sincronizandoTodas ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sincronizar pendentes
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Marcadores</p><p className="text-xl font-bold">{diagnostico.total}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Filhos de cache</p><p className="text-xl font-bold">{diagnostico.filhosCache}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Sincronizadas</p><p className="text-xl font-bold text-primary">{diagnostico.sincronizadas}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Desatualizadas</p><p className="text-xl font-bold text-amber-700">{diagnostico.desatualizadas}</p><p className="text-[10px] text-muted-foreground">composição: {diagnostico.composicaoAlterada}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Marcador legado</p><p className="text-xl font-bold text-amber-600">{diagnostico.markersModeloLegado}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Sem cache</p><p className="text-xl font-bold text-amber-600">{diagnostico.markersSemCache}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Estrutural</p><p className="text-xl font-bold text-destructive">{diagnostico.relacoesComProblemaEstrutural}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Órfãos</p><p className="text-xl font-bold text-destructive">{diagnostico.orfaos.length}</p></Card>
      </div>

      {(diagnostico.cacheVersaoLegada > 0 || diagnostico.cacheLinhagemIncompleta > 0 || diagnostico.cacheOrigemIncompleta > 0 || diagnostico.cacheAssinaturaIncompleta > 0 || diagnostico.cacheParentReceitaDivergente > 0 || diagnostico.cacheAssinaturaDivergente > 0) && (
        <Card className="p-4 border-amber-500/40 bg-amber-500/5">
          <p className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Integridade estrutural do cache</p>
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <Badge variant="outline">versão legada: {diagnostico.cacheVersaoLegada}</Badge>
            <Badge variant="outline">linhagem incompleta: {diagnostico.cacheLinhagemIncompleta}</Badge>
            <Badge variant="outline">origem incompleta: {diagnostico.cacheOrigemIncompleta}</Badge>
            <Badge variant="outline">assinatura ausente: {diagnostico.cacheAssinaturaIncompleta}</Badge>
            <Badge variant="outline">receita divergente: {diagnostico.cacheParentReceitaDivergente}</Badge>
            <Badge variant="outline">assinaturas divergentes: {diagnostico.cacheAssinaturaDivergente}</Badge>
          </div>
        </Card>
      )}

      {diagnostico.orfaos.length > 0 && (
        <Card className="p-4 border-destructive/40 bg-destructive/5">
          <p className="font-semibold text-destructive flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {diagnostico.orfaos.length} filho(s) de sub-receita sem marcador pai</p>
          <p className="text-xs text-muted-foreground mt-1">Esses registros são preservados e devem ser revisados; não são excluídos automaticamente.</p>
        </Card>
      )}

      {diagnostico.rows.length === 0 ? (
        <Card className="p-8 text-center"><CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" /><p>Nenhuma sub-receita referenciada encontrada.</p></Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.2fr_1.2fr_110px_90px_90px_160px] gap-2 px-3 py-2 bg-secondary/50 text-[10px] uppercase font-semibold text-muted-foreground">
            <div>Receita-pai</div><div>Sub-receita</div><div>Status</div><div>Cache</div><div>Depend.</div><div>Ação</div>
          </div>
          {diagnostico.rows.map((row) => (
            <div key={row.marker.id} className="grid md:grid-cols-[1.2fr_1.2fr_110px_90px_90px_160px] gap-2 px-3 py-2.5 border-t items-center text-sm">
              <div className="min-w-0 truncate" title={row.parent?.nome || row.marker.receita_id}>{row.parent?.nome || "Receita não encontrada"}</div>
              <div className="min-w-0">
                <p className="font-medium truncate" title={row.source?.nome || row.marker.subreceita_id}>{row.source?.nome || row.marker.subreceita_nome || "Origem ausente"}</p>
                {row.erro && <p className="text-[10px] text-destructive truncate" title={row.erro}>{row.erro}</p>}
                {row.composicaoMudouDepois && <p className="text-[10px] text-amber-700 truncate" title={row.ultimaComposicaoEm}>Composição alterada após a última sincronização</p>}
                {row.problemasEstruturais.length > 0 && <p className="text-[10px] text-amber-700 truncate" title={row.problemasEstruturais.join(" · ")}>{row.problemasEstruturais.join(" · ")}</p>}
              </div>
              <div><Badge variant={row.status === "sincronizada" ? "outline" : "secondary"} className="text-[10px]">{STATUS_LABEL[row.status] || row.status}</Badge></div>
              <div className="text-xs">{row.filhos.length} item(ns)</div>
              <div className="text-xs">{row.dependencias || "—"}</div>
              <div>
                <Button size="sm" variant="outline" disabled={!!sincronizando} onClick={() => sincronizarUma(row.marker.id)}>
                  {sincronizando === row.marker.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                  Sincronizar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><GitBranch className="w-4 h-4" /> Histórico recente</h3>
          <div className="space-y-1.5 text-xs">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex flex-wrap gap-x-3 gap-y-1 border-t first:border-0 pt-1.5 first:pt-0">
                <span className="font-medium">{log.acao}</span>
                <span>{log.filhos_anteriores ?? 0} → {log.filhos_novos ?? 0} itens</span>
                <span className="text-muted-foreground">{log.executado_em ? new Date(log.executado_em).toLocaleString("pt-BR") : ""}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
