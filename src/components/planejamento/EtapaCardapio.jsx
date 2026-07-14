import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ShoppingCart, ArrowLeft, ArrowRight } from "lucide-react";
import { sugerirPerCapita } from "@/lib/perCapitaData";
import BuscaReceitaDialog from "@/components/receita/BuscaReceitaDialog";
import BarraCoresCardapio from "@/components/planejamento/BarraCoresCardapio";
import EtapaCardapioTabela from "@/components/planejamento/EtapaCardapioTabela";
import CardapioSeletorDia from "@/components/cardapio/CardapioSeletorDia";

const DIAS = [
  { key: "segunda", label: "Seg" }, { key: "terca", label: "Ter" },
  { key: "quarta", label: "Qua" }, { key: "quinta", label: "Qui" },
  { key: "sexta", label: "Sex" }, { key: "sabado", label: "Sáb" },
  { key: "domingo", label: "Dom" },
];

const NOMES_SECAO_PADRAO = ["Entrada", "Prato Principal", "Guarnição", "Arroz/Massas", "Saladas", "Sobremesa"];

function initGrupos(config) {
  if (config?.grupos?.length) {
    return config.grupos.map(g => ({
      nome: g.nome,
      itens: (g.itens || []).map(i => ({
        receita_id: i.receita_id,
        receita_nome: i.receita_nome,
        pc_g: i.pc_g,
        qtd_kg_manual: i.qtd_kg_manual ?? null,
      })),
    }));
  }
  return NOMES_SECAO_PADRAO.map(nome => ({ nome, itens: [] }));
}

function custoPorKgPronto(receita) {
  if (!receita) return 0;
  if (receita.rendimento_total > 0 && receita.custo_total > 0) {
    return receita.custo_total / (receita.rendimento_total / 1000);
  }
  if (receita.custo_por_porcao > 0 && receita.porcoes_base > 0 && receita.rendimento_total > 0) {
    return (receita.custo_por_porcao * receita.porcoes_base) / (receita.rendimento_total / 1000);
  }
  return 0;
}

function pcSugeridoReceita(receita) {
  if (receita?.per_capita_g) return receita.per_capita_g;
  const cat = (receita?.categorias || [])[0] || "";
  return sugerirPerCapita(receita?.nome || "", cat);
}

export default function EtapaCardapio({
  totalPessoas, cardapioConfig, margemEvento, onMargemEventoChange,
  onSalvar, onGerarListaCompras, onVoltar, salvando,
  docesBebidas, onGruposChange, onAvancar, onAjustarPessoas
}) {
  const [grupos, setGrupos] = useState(() => initGrupos(cardapioConfig));
  const [buscaGrupoIdx, setBuscaGrupoIdx] = useState(null);
  const [showNovoGrupo, setShowNovoGrupo] = useState(false);
  const [novoGrupoNome, setNovoGrupoNome] = useState("");
  const [filtroDia, setFiltroDia] = useState("todos");

  const margem = margemEvento || 0;

  // Re-init quando cardapioConfig mudar (ex: ao abrir edição)
  useEffect(() => {
    if (cardapioConfig) {
      setGrupos(initGrupos(cardapioConfig));
    }
  }, [cardapioConfig]);

  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => base44.entities.Receita.list("-nome", 500),
  });

  const receitaMap = useMemo(() => {
    const map = {};
    receitas.forEach(r => { map[r.id] = r; });
    return map;
  }, [receitas]);

  // Cálculo de produção: kg do prato = pessoas × PC × (1 + margem%), soma direta (sem distribuição por seção)
  const gruposCalc = useMemo(() => {
    return grupos.map(g => {
      const itens = g.itens.map(item => {
        const rec = receitaMap[item.receita_id];
        const pc_g = item.pc_g || pcSugeridoReceita(rec) || 200;
        const autoKg = (totalPessoas * pc_g * (1 + margem / 100)) / 1000;
        const qtd_kg = item.qtd_kg_manual != null ? item.qtd_kg_manual : autoKg;
        const porcoes = pc_g > 0 ? Math.round((qtd_kg * 1000) / pc_g) : 0;
        const custoKg = custoPorKgPronto(rec);
        const custo = custoKg * qtd_kg;
        return { ...item, qtd_kg, pc_g, porcoes, custo, custo_kg: custoKg, sem_custo: custoKg === 0 };
      });
      const actualKg = itens.reduce((s, i) => s + i.qtd_kg, 0);
      return { ...g, actualKg, itens };
    });
  }, [grupos, totalPessoas, margem, receitaMap]);

  // Push grupos config para o parent (necessário para salvar na Etapa 4)
  useEffect(() => {
    if (onGruposChange) {
      onGruposChange(gruposCalc.map(g => ({
        nome: g.nome,
        itens: g.itens.map(i => ({
          receita_id: i.receita_id,
          receita_nome: i.receita_nome,
          pc_g: i.pc_g,
          qtd_kg: parseFloat(i.qtd_kg.toFixed(3)),
          qtd_kg_manual: i.qtd_kg_manual,
          porcoes: i.porcoes,
        })),
      })));
    }
  }, [gruposCalc, onGruposChange]);

  // Dias usados nos itens do cardápio (apenas se algum item tiver dia_semana definido)
  const diasUsados = useMemo(() => {
    const set = new Set();
    grupos.forEach(g => g.itens.forEach(i => { if (i.dia_semana) set.add(i.dia_semana); }));
    return DIAS.filter(d => set.has(d.key));
  }, [grupos]);

  const custoTotal = gruposCalc.reduce((s, g) => s + g.itens.reduce((s2, i) => s2 + i.custo, 0), 0);

  // Gerar config para salvar
  const buildConfig = () => ({
    grupos: gruposCalc.map(g => ({
      nome: g.nome,
      itens: g.itens.map(i => ({
        receita_id: i.receita_id,
        receita_nome: i.receita_nome,
        pc_g: i.pc_g,
        qtd_kg: parseFloat(i.qtd_kg.toFixed(3)),
        qtd_kg_manual: i.qtd_kg_manual,
        porcoes: i.porcoes,
      })),
    })),
    doces_bebidas: docesBebidas,
  });

  // Handlers
  const addItem = (grupoIdx, receita) => {
    const pc = pcSugeridoReceita(receita);
    setGrupos(prev => prev.map((g, i) => i === grupoIdx
      ? { ...g, itens: [...g.itens, { receita_id: receita.id, receita_nome: receita.nome, pc_g: pc, qtd_kg_manual: null }] }
      : g));
    setBuscaGrupoIdx(null);
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

  const addGrupoCustom = () => {
    if (!novoGrupoNome.trim()) return;
    setGrupos(prev => [...prev, { nome: novoGrupoNome.trim(), itens: [] }]);
    setNovoGrupoNome("");
    setShowNovoGrupo(false);
  };

  const handleSalvar = () => onSalvar(buildConfig());
  const handleGerarLista = () => onGerarListaCompras(buildConfig());

  return (
    <div className="space-y-4">
      {/* Pílulas: pessoas + margem de segurança + seletor de dia */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-2">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onAjustarPessoas?.(-1)} disabled={totalPessoas <= 0}>−</Button>
          <span className="text-lg font-bold min-w-[2rem] text-center">{totalPessoas}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onAjustarPessoas?.(1)}>+</Button>
          <span className="text-sm text-muted-foreground ml-1">pessoas</span>
        </div>
        <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-2">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onMargemEventoChange?.(Math.max(0, margem - 5))} disabled={margem <= 0}>−</Button>
          <span className="text-lg font-bold min-w-[2.5rem] text-center">{margem}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onMargemEventoChange?.(margem + 5)}>+</Button>
          <span className="text-sm text-muted-foreground ml-1">margem de segurança</span>
        </div>
        {diasUsados.length > 0 && (
          <CardapioSeletorDia dias={diasUsados} value={filtroDia} onChange={setFiltroDia} />
        )}
      </div>

      {/* Barra de cores do cardápio */}
      <BarraCoresCardapio gruposCalc={gruposCalc} receitaMap={receitaMap} />

      {/* Tabela de pratos (sem faixas de seção) */}
      <EtapaCardapioTabela
        gruposCalc={gruposCalc}
        totalPessoas={totalPessoas}
        custoTotal={custoTotal}
        margemEvento={margem}
        filtroDia={filtroDia}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        onMoveItem={moveItem}
        onAddPrato={(gi) => setBuscaGrupoIdx(gi)}
      />

      {/* Adicionar tipo de refeição */}
      {showNovoGrupo ? (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed">
          <Input placeholder="Nome do grupo" value={novoGrupoNome}
            onChange={e => setNovoGrupoNome(e.target.value)} autoFocus
            onKeyDown={e => e.key === "Enter" && addGrupoCustom()} />
          <Button size="sm" onClick={addGrupoCustom}>OK</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNovoGrupo(false)}>Cancelar</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full gap-1 border-dashed"
          onClick={() => setShowNovoGrupo(true)}>
          <Plus className="w-4 h-4" /> Adicionar tipo de refeição
        </Button>
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

      {/* Dialog de busca de receitas */}
      <BuscaReceitaDialog
        open={buscaGrupoIdx !== null}
        onClose={() => setBuscaGrupoIdx(null)}
        onSelect={(r) => addItem(buscaGrupoIdx, r)}
        receitas={receitas}
        title="Adicionar prato"
      />
    </div>
  );
}