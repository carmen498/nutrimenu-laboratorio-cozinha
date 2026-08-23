import { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertTriangle, Check, Pause, Play, Clock, Zap, History, Power } from "lucide-react";
import { toast } from "sonner";
import { invalidarCustosDependentesSeguro } from "@/lib/invalidacaoCusto";

// Categorias com badge ⚡ (oscilam frequentemente)
const CATS_OSCILANTES = ["Carnes e Ovos", "Peixes e Frutos do Mar", "Laticínios", "Verduras e Hortaliças", "Frutas", "Óleos e Gorduras"];

const isOscilante = (cat) => CATS_OSCILANTES.includes(cat);

export default function AtualizarPrecosDialog({
  open,
  onClose,
  ingredientes,
  ultimoLog,
  autoUpdateAtiva,
  togglingAuto,
  onToggleAutoUpdate,
  onVerHistorico,
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState("categories"); // categories | confirm | loading | results
  const [selectAll, setSelectAll] = useState(false);
  const [selectedCats, setSelectedCats] = useState({});
  const [resultados, setResultados] = useState([]);
  const [selectedResults, setSelectedResults] = useState({});
  const [atualizando, setAtualizando] = useState(false);
  const [applyProgress, setApplyProgress] = useState({ atual: 0, total: 0 });
  const [applySummary, setApplySummary] = useState(null);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0, nomeAtual: "" });
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [pausado, setPausado] = useState(false);
  const pausadoRef = useRef(false);
  const timerRef = useRef(null);
  const canceladoRef = useRef(false);
  const emAndamentoRef = useRef(false);

  // Compute categories from real data
  const catsMap = useMemo(() => {
    const map = {};
    ingredientes.forEach((ing) => {
      const cat = ing.categoria || "A Revisar";
      if (!map[cat]) map[cat] = { nome: cat, count: 0, ids: [] };
      map[cat].count++;
      map[cat].ids.push(ing.id);
    });
    return map;
  }, [ingredientes]);

  const catList = useMemo(() => {
    return Object.values(catsMap).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [catsMap]);

  // Mantém a lista de categorias mais recente sem forçar o reset abaixo a rodar a cada refetch
  const catListRef = useRef(catList);
  useEffect(() => {
    catListRef.current = catList;
  }, [catList]);

  // Reset state apenas quando o modal é ABERTO — nunca por causa de um refetch de ingredientes
  // enquanto já está em uso (ex.: a invalidação de queries disparada pela própria gravação de preços).
  useEffect(() => {
    if (open) {
      setStep("categories");
      setResultados([]);
      setSelectedResults({});
      setSelectAll(false);
      setApplySummary(null);
      setApplyProgress({ atual: 0, total: 0 });
      // Pré-selecionar categorias oscilantes
      const init = {};
      catListRef.current.forEach((c) => {
        if (isOscilante(c.nome)) init[c.nome] = true;
      });
      setSelectedCats(init);
      pausadoRef.current = false;
      setPausado(false);
      canceladoRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cleanup timer
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Derived: selected ingredient IDs
  const selectedIngIds = useMemo(() => {
    if (selectAll) {
      const all = [];
      catList.forEach((c) => all.push(...c.ids));
      return all;
    }
    const ids = [];
    catList.forEach((c) => {
      if (selectedCats[c.nome]) ids.push(...c.ids);
    });
    return ids;
  }, [selectAll, selectedCats, catList]);

  const selectedCount = selectedIngIds.length;
  const totalCount = ingredientes.length;

  // Time estimate: 3s per ingredient
  const estimativaMinutos = Math.ceil((selectedCount * 3) / 60);

  const toggleCat = (catNome) => {
    setSelectedCats((prev) => ({ ...prev, [catNome]: !prev[catNome] }));
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectAll(false);
      setSelectedCats({});
    } else {
      setSelectAll(true);
      setSelectedCats({});
    }
  };

  // Buscar preços
  const handleBuscarIA = async () => {
    if (emAndamentoRef.current) {
      toast.warning("Uma busca já está em andamento.");
      return;
    }
    emAndamentoRef.current = true;
    canceladoRef.current = false;
    setStep("loading");
    pausadoRef.current = false;
    const inicio = Date.now();

    timerRef.current = setInterval(() => {
      setTempoDecorrido(Math.floor((Date.now() - inicio) / 1000));
    }, 1000);

    try {
      const idsSet = new Set(selectedIngIds);
      const relevant = ingredientes.filter((i) => idsSet.has(i.id));
      const dados = relevant.map((i) => ({
        id: i.id,
        nome: i.nome,
        preco_por_g_rs: i.preco_por_g_rs,
      }));

      const CHUNK = 10;
      const todosResultados = [];

      for (let i = 0; i < dados.length; i += CHUNK) {
        if (canceladoRef.current) {
          clearInterval(timerRef.current);
          return;
        }
        // Check pause
        if (pausadoRef.current) {
          await waitForResume();
        }
        if (canceladoRef.current) {
          clearInterval(timerRef.current);
          return;
        }

        const lote = dados.slice(i, i + CHUNK);
        setProgresso({ atual: i, total: dados.length, nomeAtual: lote[0]?.nome || "..." });

        try {
          const response = await base44.functions.invoke("buscarPrecosIA", { ingredientes: lote });
          const res = response.data?.resultados || [];
          todosResultados.push(...res);
        } catch (e) {
          lote.forEach((ing) =>
            todosResultados.push({
              id: ing.id,
              nome: ing.nome,
              preco_atual: ing.preco_por_g_rs ? parseFloat((ing.preco_por_g_rs * 1000).toFixed(3)) : 0,
              preco_sugerido_por_kg: null,
              preco_sugerido_por_g: null,
              encontrado: false,
              observacao: "Erro na busca (timeout)",
            })
          );
        }

        // Delay between chunks
        if (i + CHUNK < dados.length) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      if (canceladoRef.current) {
        clearInterval(timerRef.current);
        return;
      }

      clearInterval(timerRef.current);
      setProgresso({ atual: dados.length, total: dados.length, nomeAtual: "" });
      setTempoDecorrido(Math.floor((Date.now() - inicio) / 1000));

      // Pre-select all found results
      const initSel = {};
      todosResultados.forEach((r) => {
        if (r.encontrado) initSel[r.id] = true;
      });

      setResultados(todosResultados);
      setSelectedResults(initSel);
      setStep("results");
    } catch (err) {
      clearInterval(timerRef.current);
      if (!canceladoRef.current) {
        toast.error("Erro ao buscar preços: " + err.message);
        setStep("categories");
      }
    } finally {
      emAndamentoRef.current = false;
    }
  };

  const waitForResume = () => {
    return new Promise((resolve) => {
      const check = () => {
        if (!pausadoRef.current || canceladoRef.current) resolve();
        else setTimeout(check, 200);
      };
      check();
    });
  };

  // Fecha o modal; se houver busca em andamento, cancela-a corretamente
  const handleRequestClose = () => {
    if (step === "loading") {
      canceladoRef.current = true;
      pausadoRef.current = false;
    }
    onClose();
  };

  const handlePause = () => {
    const novoEstado = !pausadoRef.current;
    pausadoRef.current = novoEstado;
    setPausado(novoEstado);
    if (timerRef.current) clearInterval(timerRef.current);
    if (!novoEstado) {
      const inicio = Date.now() - tempoDecorrido * 1000;
      timerRef.current = setInterval(() => {
        setTempoDecorrido(Math.floor((Date.now() - inicio) / 1000));
      }, 1000);
    }
  };

  // Helper: never let a single request hang the whole process forever
  const withTimeout = (promise, ms, label) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tempo esgotado ao salvar ${label}`)), ms)
      ),
    ]);
  };

  // Apply selected results
  const handleAplicar = async (aplicarTodos) => {
    setAtualizando(true);
    setStep("applying");
    try {
      await aplicarPrecos(aplicarTodos);
    } finally {
      setAtualizando(false);
    }
  };

  const aplicarPrecos = async (aplicarTodos) => {
    const now = new Date().toISOString();
    const idsToUpdate = aplicarTodos
      ? resultados.filter((r) => r.encontrado).map((r) => r.id)
      : resultados.filter((r) => r.encontrado && selectedResults[r.id]).map((r) => r.id);

    const toUpdate = resultados.filter(
      (r) => idsToUpdate.includes(r.id) && r.encontrado && r.preco_sugerido_por_g
    );

    let atualizados = 0;
    const idsAtualizados = [];
    const falhas = [];
    setApplyProgress({ atual: 0, total: toUpdate.length });

    // Cada ingrediente é salvo de forma independente: a falha em um NUNCA impede os demais.
    for (let idx = 0; idx < toUpdate.length; idx++) {
      const res = toUpdate[idx];
      try {
        const variacao =
          res.preco_atual > 0
            ? parseFloat(
                (((res.preco_sugerido_por_kg - res.preco_atual) / res.preco_atual) * 100).toFixed(1)
              )
            : 0;

        const ing = ingredientes.find((ing) => ing.id === res.id);
        const preco_embalagem_rs = parseFloat(
          (res.preco_sugerido_por_g * (ing?.peso_embalagem_g || 1000)).toFixed(2)
        );

        const historico = [...(ing?.historico_precos || [])];
        historico.unshift({
          data: now,
          preco_por_kg: parseFloat(res.preco_sugerido_por_kg.toFixed(2)),
          variacao_percentual: variacao,
          fonte: "IA web manual",
          fornecedor: ing?.fornecedor || "",
        });

        await withTimeout(
          base44.entities.Ingrediente.update(res.id, {
            preco_embalagem_rs,
            preco_por_g_rs: res.preco_sugerido_por_g,
            preco_atualizado_em: now,
            fonte_preco: "IA web",
            preco_medio_nacional: res.preco_sugerido_por_kg,
            variacao_percentual: variacao,
            historico_precos: historico,
          }),
          15000,
          res.nome
        );
        atualizados++;
        idsAtualizados.push(res.id);
      } catch (err) {
        falhas.push({ nome: res.nome, motivo: err?.message || "erro ao salvar" });
      }
      setApplyProgress({ atual: idx + 1, total: toUpdate.length });
    }

    // Fase 10.3 — preço mestre alterado invalida todas as receitas que usam os
    // ingredientes e toda a cadeia reversa de sub-receitas. Não recalcular aqui:
    // o recálculo deve passar exclusivamente pelo Motor de Custos Canônico.
    let receitasInvalidadas = 0;
    if (atualizados > 0) {
      const invalidacao = await invalidarCustosDependentesSeguro({
        ingredienteIds: idsAtualizados,
        motivo: "atualizacao_preco_mestre_em_lote",
        origem: "atualizar_precos",
      });
      receitasInvalidadas = Number(invalidacao?.receitas_invalidadas) || 0;
    }

    qc.invalidateQueries({ queryKey: ["ingredientes"] });
    setApplySummary({
      total: toUpdate.length,
      atualizados,
      falhas,
      receitasInvalidadas,
    });
    setStep("summary");
  };

  const formatPrice = (v) => (v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "—");
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Variation formatting for results
  const getVariation = (res) => {
    if (!res.preco_atual || res.preco_atual === 0 || !res.preco_sugerido_por_kg) return null;
    return ((res.preco_sugerido_por_kg - res.preco_atual) / res.preco_atual) * 100;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleRequestClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {step === "categories" && "Atualizar preços"}
            {step === "loading" && "Buscando preços..."}
            {step === "results" && "Revisão de preços encontrados"}
            {step === "applying" && "Salvando preços..."}
            {step === "summary" && "Resumo da atualização"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step: Category Selection ── */}
        {step === "categories" && (
          <div className="space-y-5">
            {/* Status da atualização automática */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b">
              <button
                onClick={onVerHistorico}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <History className="w-3 h-3" />
                {ultimoLog ? (
                  <>
                    Última execução:{" "}
                    {new Date(ultimoLog.data_execucao).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                    {" "}às{" "}
                    {new Date(ultimoLog.data_execucao).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}{ultimoLog.total_atualizado} ingredientes atualizados
                  </>
                ) : (
                  "Atualização automática: toda segunda às 3h · Ainda não executada"
                )}
                <span className="underline ml-0.5">Ver histórico</span>
              </button>
              <button
                onClick={onToggleAutoUpdate}
                disabled={togglingAuto}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  autoUpdateAtiva
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {autoUpdateAtiva ? "ATIVA" : "PAUSADA"}
              </button>
            </div>

            {/* Painel superior — todos */}
            <button
              onClick={handleSelectAll}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${
                selectAll
                  ? "border-primary bg-primary/5"
                  : "border-muted bg-card hover:border-primary/30"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base">🔄 Atualizar todos os ingredientes</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {totalCount} ingredientes · estimativa: ~{Math.ceil((totalCount * 3) / 60)} min
                </p>
              </div>
              <Checkbox checked={selectAll} className="mt-1.5" />
            </button>

            {/* Painel inferior — por categoria */}
            <div>
              <p className="text-sm font-medium mb-3">Ou selecione as categorias que deseja atualizar:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {catList.map((cat) => {
                  const checked = selectAll || !!selectedCats[cat.nome];
                  const osc = isOscilante(cat.nome);
                  const tempoCat = Math.ceil((cat.count * 3) / 60);
                  return (
                    <label
                      key={cat.nome}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? "border-primary/40 bg-primary/5"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleCat(cat.nome)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{cat.nome}</span>
                          {osc && (
                            <Badge className="text-[10px] h-4 px-1 bg-amber-100 text-amber-700 border-amber-200">
                              <Zap className="w-2.5 h-2.5 mr-0.5" /> Oscila
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {cat.count} ingredientes · ~{tempoCat} min
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Tempo estimado dinâmico */}
            {selectedCount > 0 && !selectAll && (
              <p className="text-sm text-muted-foreground text-center">
                {selectedCount} ingredientes selecionados · estimativa: ~{estimativaMinutos} min
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleRequestClose}>
                Cancelar
              </Button>
              <Button onClick={() => setStep("confirm")} disabled={selectedCount === 0}>
                <Sparkles className="w-4 h-4 mr-1" /> Buscar preços selecionados
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Confirmação de consumo de créditos ── */}
        {step === "confirm" && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Isso vai consultar preços via IA web para os ingredientes {selectAll ? "todos" : "selecionados"} e consumir créditos. Deseja continuar?
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedCount} ingredientes selecionados · estimativa: ~{estimativaMinutos} min
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("categories")}>
                Cancelar
              </Button>
              <Button onClick={handleBuscarIA}>
                <Sparkles className="w-4 h-4 mr-1" /> Confirmar e buscar
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Loading / Progress ── */}
        {step === "loading" && (
          <div className="space-y-5 py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <div>
                <p className="font-medium">
                  {progresso.nomeAtual || "Processando..."}
                </p>
                <p className="text-sm text-muted-foreground">
                  {progresso.atual} de {progresso.total} ingredientes
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{
                  width: progresso.total > 0 ? `${(progresso.atual / progresso.total) * 100}%` : "0%",
                }}
              />
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {progresso.total > 0
                  ? `${Math.round((progresso.atual / progresso.total) * 100)}% concluído`
                  : ""}
              </span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {formatTime(tempoDecorrido)}
                </span>
                {progresso.total > 0 && progresso.atual > 0 && progresso.atual < progresso.total && (
                  <span className="flex items-center gap-1">
                    restante ~{formatTime(Math.round(((tempoDecorrido / progresso.atual) * (progresso.total - progresso.atual)) || 0))}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={handlePause}>
                {pausado ? (
                  <>
                    <Play className="w-4 h-4 mr-1" /> Retomar
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-1" /> Pausar
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Processando em lotes de 10 ingredientes — a pausa entra em vigor após o lote atual.
            </p>
          </div>
        )}

        {/* ── Step: Applying (saving prices) ── */}
        {step === "applying" && (
          <div className="space-y-5 py-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <div>
                <p className="font-medium">Salvando preços...</p>
                <p className="text-sm text-muted-foreground">
                  {applyProgress.atual} de {applyProgress.total} ingredientes salvos
                </p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{
                  width: applyProgress.total > 0 ? `${(applyProgress.atual / applyProgress.total) * 100}%` : "0%",
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Cada ingrediente é salvo individualmente — você pode fechar esta janela; o processo continua e o resumo ficará disponível no histórico.
            </p>
          </div>
        )}

        {/* ── Step: Apply Summary ── */}
        {step === "summary" && applySummary && (
          <div className="space-y-4 py-2">
            <div
              className={`p-3 rounded-lg border flex items-start gap-2 ${
                applySummary.falhas.length > 0
                  ? "bg-amber-50 border-amber-200"
                  : "bg-green-50 border-green-200"
              }`}
            >
              {applySummary.falhas.length > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${applySummary.falhas.length > 0 ? "text-amber-800" : "text-green-800"}`}>
                {applySummary.atualizados} de {applySummary.total} preços atualizados com sucesso
                {applySummary.receitasInvalidadas > 0 && ` · ${applySummary.receitasInvalidadas} caches invalidados`}
                .
              </p>
            </div>

            {applySummary.falhas.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <p className="text-xs font-medium px-3 py-2 bg-muted">
                  {applySummary.falhas.length} item(ns) não foram salvos:
                </p>
                <ul className="divide-y max-h-48 overflow-y-auto">
                  {applySummary.falhas.map((f, idx) => (
                    <li key={idx} className="px-3 py-2 text-sm flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                      <span>
                        <span className="font-medium">{f.nome}</span>: {f.motivo} — tente novamente
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleRequestClose}>Fechar</Button>
            </div>
          </div>
        )}

        {/* ── Step: Results Review ── */}
        {step === "results" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {resultados.filter((r) => r.encontrado).length} preços encontrados de{" "}
              {resultados.length} ingredientes
            </p>

            {resultados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum resultado encontrado.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2">Ingrediente</th>
                        <th className="py-2 px-2 text-right">Preço atual/kg</th>
                        <th className="py-2 px-2 text-right">Preço sugerido/kg</th>
                        <th className="py-2 px-2 text-center">Variação</th>
                        <th className="py-2 px-2">Fonte</th>
                        <th className="py-2 pl-2 text-center">Aceitar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((res) => {
                        const variacao = getVariation(res);
                        const alta = variacao !== null && Math.abs(variacao) > 15;
                        return (
                          <tr
                            key={res.id}
                            className={`border-b hover:bg-muted/30 ${
                              alta ? "bg-red-50/50" : ""
                            }`}
                          >
                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-1.5">
                                {alta && (
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                )}
                                <p className="font-medium truncate max-w-[160px]">{res.nome}</p>
                              </div>
                              {res.observacao && (
                                <p className="text-xs text-muted-foreground">{res.observacao}</p>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right whitespace-nowrap">
                              {formatPrice(res.preco_atual)}
                            </td>
                            <td
                              className={`py-2 px-2 text-right whitespace-nowrap ${
                                alta ? "font-bold" : ""
                              }`}
                            >
                              {res.encontrado ? (
                                <span className={alta ? "text-red-700" : ""}>
                                  {formatPrice(res.preco_sugerido_por_kg)}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-600">
                                  <AlertTriangle className="w-3 h-3" /> Não localizado
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              {variacao !== null ? (
                                <span
                                  className={`font-medium ${
                                    alta
                                      ? "text-red-700 bg-red-100 px-1.5 py-0.5 rounded"
                                      : variacao > 0
                                      ? "text-red-600"
                                      : variacao < 0
                                      ? "text-green-600"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {variacao > 0 ? "+" : ""}
                                  {variacao.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="py-2 px-2 whitespace-nowrap">
                              <Badge variant="secondary" className="text-[10px]">
                                IA web
                              </Badge>
                            </td>
                            <td className="py-2 pl-2 text-center">
                              <Checkbox
                                checked={!!selectedResults[res.id]}
                                onCheckedChange={(v) =>
                                  setSelectedResults((s) => ({ ...s, [res.id]: !!v }))
                                }
                                disabled={!res.encontrado}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={handleRequestClose}>
                    Cancelar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAplicar(true)}
                    disabled={atualizando || resultados.every((r) => !r.encontrado)}
                  >
                    {atualizando ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-1" />
                    )}
                    Aceitar todos
                  </Button>
                  <Button
                    onClick={() => handleAplicar(false)}
                    disabled={
                      atualizando || !resultados.some((r) => r.encontrado && selectedResults[r.id])
                    }
                  >
                    {atualizando ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-1" />
                    )}
                    Aceitar selecionados
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}