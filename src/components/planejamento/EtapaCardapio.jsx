import { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft, ArrowRight, Plus, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { sugerirPerCapita } from "@/lib/perCapitaData";
import { secaoSugeridaReceita } from "@/lib/secaoReceita";
import BuscaReceitaDialog from "@/components/receita/BuscaReceitaDialog";
import BarraCoresCardapio from "@/components/planejamento/BarraCoresCardapio";
import EtapaCardapioTabela from "@/components/planejamento/EtapaCardapioTabela";
import CardapioSeletorDia from "@/components/cardapio/CardapioSeletorDia";
import { custoPorKgPronto } from "@/lib/custoReceita";
import { carregarIngredientesEfetivosCusto } from "@/lib/custoContexto";
import { useAuth } from "@/lib/AuthContext";

const DIAS = [
  { key: "segunda", label: "Seg" }, { key: "terca", label: "Ter" },
  { key: "quarta", label: "Qua" }, { key: "quinta", label: "Qui" },
  { key: "sexta", label: "Sex" }, { key: "sabado", label: "Sáb" },
  { key: "domingo", label: "Dom" },
];

function fmtRs(v) { return "R$ " + (v || 0).toFixed(2).replace(".", ","); }
function fmtNomePrato(nome) {
  if (!nome) return "";
  return nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
}

function pcSugeridoReceita(receita) {
  if (receita?.per_capita_g) return receita.per_capita_g;
  const cat = (receita?.categorias || [])[0] || "";
  return sugerirPerCapita(receita?.nome || "", cat);
}

export default function EtapaCardapio({
  totalPessoas, grupos, onGruposUpdate, margemEvento, onMargemEventoChange,
  onSalvar, onGerarListaCompras, onVoltar, salvando,
  docesBebidas, onGruposChange, onAvancar, onAjustarPessoas
}) {
  const setGrupos = onGruposUpdate;
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [secaoPendente, setSecaoPendente] = useState(null);
  const [filtroDia, setFiltroDia] = useState("todos");
  const [avisoExpandido, setAvisoExpandido] = useState(false);

  const margem = margemEvento || 0;
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => base44.entities.Receita.list("-nome", 500),
  });

  const receitaMap = useMemo(() => {
    const map = {};
    receitas.forEach(r => { map[r.id] = r; });
    return map;
  }, [receitas]);

  const receitaIdsEvento = useMemo(() => Array.from(new Set(
    grupos.flatMap((grupo) => grupo.itens.map((item) => item.receita_id).filter(Boolean))
  )).sort(), [grupos]);

  // Consulta apenas a composição das receitas presentes no evento. A listagem
  // global limitada a 2.000 vínculos deixava receitas antigas sem custo aqui.
  const { data: todosIngredientesReceita = [] } = useQuery({
    queryKey: ["ingredientesReceitaEvento", receitaIdsEvento.join(",")],
    queryFn: async () => (await Promise.all(
      receitaIdsEvento.map((receitaId) => base44.entities.IngredienteReceita.filter({ receita_id: receitaId }))
    )).flat(),
    enabled: receitaIdsEvento.length > 0,
  });

  const { data: todosInsumosReceita = [] } = useQuery({
    queryKey: ["insumosReceitaEvento", receitaIdsEvento.join(",")],
    queryFn: async () => (await Promise.all(
      receitaIdsEvento.map((receitaId) => base44.entities.InsumoReceita.filter({ receita_id: receitaId }))
    )).flat(),
    enabled: receitaIdsEvento.length > 0,
  });

  const { data: todosEsquecidosReceita = [] } = useQuery({
    queryKey: ["esquecidosReceitaEvento", receitaIdsEvento.join(",")],
    queryFn: async () => (await Promise.all(
      receitaIdsEvento.map((receitaId) => base44.entities.IngredienteEsquecidoReceita.filter({ receita_id: receitaId }))
    )).flat(),
    enabled: receitaIdsEvento.length > 0,
  });

  const { data: ingredientesEfetivos = [] } = useQuery({
    queryKey: ["ingredientes", "custo-efetivo", user?.id, isAdmin],
    queryFn: () => carregarIngredientesEfetivosCusto({ userId: user?.id, isAdmin }),
    enabled: isAdmin || !!user?.id,
  });

  const agruparPorReceita = (itens) => itens.reduce((map, item) => {
    if (!map[item.receita_id]) map[item.receita_id] = [];
    map[item.receita_id].push(item);
    return map;
  }, {});
  const ingredientesPorReceita = useMemo(() => agruparPorReceita(todosIngredientesReceita), [todosIngredientesReceita]);
  const insumosPorReceita = useMemo(() => agruparPorReceita(todosInsumosReceita), [todosInsumosReceita]);
  const esquecidosPorReceita = useMemo(() => agruparPorReceita(todosEsquecidosReceita), [todosEsquecidosReceita]);
  const ingredienteMap = useMemo(() => Object.fromEntries(ingredientesEfetivos.map((item) => [item.id, item])), [ingredientesEfetivos]);

  // Cálculo de produção: kg do prato = pessoas × PC × (1 + margem%), soma direta (sem distribuição por seção)
  const gruposCalc = useMemo(() => {
    return grupos.map(g => {
      const itens = g.itens.map(item => {
        const rec = receitaMap[item.receita_id];
        const pc_g = item.pc_g || pcSugeridoReceita(rec) || 200;
        const autoKg = (totalPessoas * pc_g * (1 + margem / 100)) / 1000;
        const qtd_kg = item.qtd_kg_manual != null ? item.qtd_kg_manual : autoKg;
        const porcoes = pc_g > 0 ? Math.round((qtd_kg * 1000) / pc_g) : 0;
        const custoKg = custoPorKgPronto(rec, ingredientesPorReceita[item.receita_id], {
          ingredienteMap,
          insumosReceita: insumosPorReceita[item.receita_id] || [],
          esquecidos: esquecidosPorReceita[item.receita_id] || [],
        });
        const custo = custoKg * qtd_kg;
        return { ...item, qtd_kg, pc_g, porcoes, custo, custo_kg: custoKg, sem_custo: custoKg === 0 };
      });
      const actualKg = itens.reduce((s, i) => s + i.qtd_kg, 0);
      return { ...g, actualKg, itens };
    });
  }, [grupos, totalPessoas, margem, receitaMap, ingredientesPorReceita, ingredienteMap, insumosPorReceita, esquecidosPorReceita]);

  // Push grupos config para o parent (necessário para salvar na Etapa 4, e também
  // como snapshot do rascunho quando o Salvar Evento é usado a partir das Etapas 1/2)
  const gruposConfigMemo = useMemo(() => gruposCalc.map(g => ({
    nome: g.nome,
    itens: g.itens.map(i => ({
      receita_id: i.receita_id,
      receita_nome: i.receita_nome,
      pc_g: i.pc_g,
      qtd_kg: parseFloat(i.qtd_kg.toFixed(3)),
      qtd_kg_manual: i.qtd_kg_manual,
      porcoes: i.porcoes,
    })),
  })), [gruposCalc]);
  useEffect(() => {
    if (onGruposChange) onGruposChange(gruposConfigMemo);
  }, [gruposConfigMemo, onGruposChange]);

  // Dias usados nos itens do cardápio (apenas se algum item tiver dia_semana definido)
  const diasUsados = useMemo(() => {
    const set = new Set();
    grupos.forEach(g => g.itens.forEach(i => { if (i.dia_semana) set.add(i.dia_semana); }));
    return DIAS.filter(d => set.has(d.key));
  }, [grupos]);

  const custoTotal = gruposCalc.reduce((s, g) => s + g.itens.reduce((s2, i) => s2 + i.custo, 0), 0);
  const custoPorPessoa = totalPessoas > 0 ? custoTotal / totalPessoas : 0;
  const pratosSemCusto = gruposCalc.flatMap(g => g.itens).filter(i => i.sem_custo && i.receita_id);
  const nomesSemCusto = pratosSemCusto.slice(0, 3).map(i => fmtNomePrato(i.receita_nome));
  const textoSemCusto = pratosSemCusto.length > 3
    ? `${nomesSemCusto.join(", ")} e mais ${pratosSemCusto.length - 3}`
    : nomesSemCusto.join(", ");

  // Gerar config para salvar
  const buildConfig = () => ({
    grupos: gruposConfigMemo,
    doces_bebidas: docesBebidas,
  });

  // Handlers
  const addItem = (receita) => {
    const pc = pcSugeridoReceita(receita);
    const secaoAlvo = secaoPendente || secaoSugeridaReceita(receita);
    setGrupos(prev => {
      let idx = prev.findIndex(g => g.nome === secaoAlvo);
      let next = prev;
      if (idx === -1) {
        next = [...prev, { nome: secaoAlvo, itens: [] }];
        idx = next.length - 1;
      }
      return next.map((g, i) => i === idx
        ? { ...g, itens: [...g.itens, { receita_id: receita.id, receita_nome: receita.nome, pc_g: pc, qtd_kg_manual: null }] }
        : g);
    });
    setSecaoPendente(null);
    setBuscaAberta(false);
  };

  const updateItem = (grupoIdx, itemIdx, patch) => {
    setGrupos(prev => prev.map((g, gi) => gi === grupoIdx
      ? { ...g, itens: g.itens.map((it, ii) => ii === itemIdx ? { ...it, ...patch } : it) }
      : g));
  };

  const removeItem = (grupoIdx, itemIdx) => {
    setGrupos(prev => prev.map((g, gi) => gi === grupoIdx
      ? { ...g, itens: g.itens.filter((_, ii) => ii !== itemIdx) }
      : g));
  };

  const moveItem = (grupoIdx, itemIdx, dir) => {
    setGrupos(prev => prev.map((g, gi) => {
      if (gi !== grupoIdx) return g;
      const ni = itemIdx + dir;
      if (ni < 0 || ni >= g.itens.length) return g;
      const itens = [...g.itens];
      [itens[itemIdx], itens[ni]] = [itens[ni], itens[itemIdx]];
      return { ...g, itens };
    }));
  };

  const handleSalvar = () => onSalvar(buildConfig());
  const handleGerarLista = () => onGerarListaCompras(buildConfig());

  return (
    <div className="space-y-4">
      {/* Pílulas: pessoas + margem de segurança + seletor de dia (digitáveis diretamente) */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-2">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onAjustarPessoas?.(-1)} disabled={totalPessoas <= 0}>−</Button>
          <input
            type="text" inputMode="numeric"
            className="text-lg font-bold w-12 text-center bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-ring rounded"
            value={totalPessoas}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              const val = digits === "" ? 0 : parseInt(digits, 10);
              onAjustarPessoas?.(val - totalPessoas);
            }}
            onFocus={(e) => e.target.select()}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onAjustarPessoas?.(1)}>+</Button>
          <span className="text-sm text-muted-foreground ml-1">pessoas</span>
        </div>
        <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-2">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onMargemEventoChange?.(Math.max(0, margem - 5))} disabled={margem <= 0}>−</Button>
          <div className="flex items-center">
            <input
              type="text" inputMode="numeric"
              className="text-lg font-bold w-10 text-center bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-ring rounded"
              value={margem}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                onMargemEventoChange?.(digits === "" ? 0 : Math.max(0, parseInt(digits, 10)));
              }}
              onFocus={(e) => e.target.select()}
            />
            <span className="text-lg font-bold">%</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onMargemEventoChange?.(margem + 5)}>+</Button>
          <span className="text-sm text-muted-foreground ml-1">margem de segurança</span>
        </div>
        {diasUsados.length > 0 && (
          <CardapioSeletorDia dias={diasUsados} value={filtroDia} onChange={setFiltroDia} />
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{fmtRs(custoPorPessoa)}</span> · custo por pessoa
        </span>
      </div>

      {/* Tabela de pratos (sem faixas de seção) */}
      <EtapaCardapioTabela
        gruposCalc={gruposCalc}
        custoTotal={custoTotal}
        filtroDia={filtroDia}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        onMoveItem={moveItem}
      />

      {/* Botão único: Adicionar prato — abre direto o seletor de receitas (busca + categorias) */}
      <Button variant="outline" size="sm" className="w-full gap-1 border-dashed" onClick={() => setBuscaAberta(true)}>
        <Plus className="w-4 h-4" /> Adicionar prato
      </Button>

      {/* Barra de cores do cardápio: depois do botão de adicionar prato */}
      <BarraCoresCardapio gruposCalc={gruposCalc} receitaMap={receitaMap} />

      {/* Aviso consolidado de custo */}
      {pratosSemCusto.length > 0 && (
        <div>
          <button
            onClick={() => setAvisoExpandido(v => !v)}
            className="w-full flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-left"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1">
              ⚠ {pratosSemCusto.length} {pratosSemCusto.length === 1 ? "prato" : "pratos"} sem custo completo: {textoSemCusto}
            </span>
            {avisoExpandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {avisoExpandido && (
            <div className="px-3 py-2 text-xs text-amber-800 bg-amber-50/60 border-x border-b border-amber-200 rounded-b-lg space-y-0.5">
              {pratosSemCusto.map((i, idx) => (
                <div key={idx}>{i.receita_nome}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botões */}
      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={handleGerarLista} disabled={salvando} className="gap-2">
          <ShoppingCart className="w-4 h-4" />
          {salvando ? "Salvando..." : "Salvar e Gerar Lista de Compras"}
        </Button>
        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={onVoltar} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleSalvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar Evento"}
            </Button>
            {onAvancar && (
              <Button onClick={onAvancar} disabled={salvando} className="gap-1">
                Doces & Bebidas <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de busca de receitas — abre direto, sem menu prévio de seção.
          A seção é atribuída automaticamente pela categoria da receita; o
          usuário pode opcionalmente criar uma nova seção dentro do próprio seletor. */}
      <BuscaReceitaDialog
        open={buscaAberta}
        onClose={() => { setBuscaAberta(false); setSecaoPendente(null); }}
        onSelect={addItem}
        receitas={receitas}
        title="Adicionar prato"
        onCreateSection={(nomeSecao) => setSecaoPendente(nomeSecao)}
      />
    </div>
  );
}