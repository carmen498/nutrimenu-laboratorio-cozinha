import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, ShoppingCart, Download, Users, Package, Scale, Calendar } from "lucide-react";
import { sugerirPerCapita } from "@/lib/perCapitaData";

const DIAS = [
  { key: "segunda", label: "Seg" },
  { key: "terca", label: "Ter" },
  { key: "quarta", label: "Qua" },
  { key: "quinta", label: "Qui" },
  { key: "sexta", label: "Sex" },
  { key: "sabado", label: "Sáb" },
  { key: "domingo", label: "Dom" },
];

const REFEICOES = [
  { key: "cafe_da_manha", label: "Café da manhã" },
  { key: "almoco", label: "Almoço" },
  { key: "lanche", label: "Lanche" },
  { key: "jantar", label: "Jantar" },
];

const tipoConfig = {
  evento: { label: "Evento", icon: Users },
  marmitas: { label: "Marmitas", icon: Package },
  buffet: { label: "Buffet", icon: Scale },
  semanal: { label: "Semanal", icon: Calendar },
};

export default function CardapioAberto() {
  const { id } = useParams();

  // Cardapio state
  const [cardapio, setCardapio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);

  // Receitas
  const [receitas, setReceitas] = useState([]);
  const [showAddReceita, setShowAddReceita] = useState(false);
  const [buscaReceita, setBuscaReceita] = useState("");
  const [todasReceitas, setTodasReceitas] = useState([]);

  // Insumos
  const [insumos, setInsumos] = useState([]);
  const [insumosGlobais, setInsumosGlobais] = useState([]);

  // Venda
  const [showVenda, setShowVenda] = useState(false);
  const [markup, setMarkup] = useState(30);

  // Lista de compras
  const [showLista, setShowLista] = useState(false);
  const [listaCompras, setListaCompras] = useState([]);

  // Cálculos
  const calcs = useMemo(() => {
    const custoReceitas = receitas.reduce((s, r) => s + (Number(r.custo_total) || 0), 0);
    const custoInsumos = insumos.reduce((s, i) => s + (Number(i.custo_total) || 0), 0);
    const total = custoReceitas + custoInsumos;
    const num = Number(cardapio?.num_pessoas_ou_unidades) || 1;
    const porUnidade = num > 0 ? total / num : 0;
    const precoVenda = markup > 0 ? porUnidade * (1 + markup / 100) : 0;
    const lucro = precoVenda - porUnidade;
    return { custoReceitas, custoInsumos, total, porUnidade, precoVenda, lucro, num };
  }, [receitas, insumos, cardapio?.num_pessoas_ou_unidades, markup]);

  // ============ LOAD ============
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await base44.entities.Cardapio.get(id);
      setCardapio(c);
      setMarkup(Number(c.markup_percentual) || 30);
      setShowVenda(!!c.markup_percentual);

      const [recs, ins, ingrGlobal, todasRec] = await Promise.all([
        base44.entities.CardapioReceita.filter({ cardapio_id: id }, "ordem", 100),
        base44.entities.CardapioInsumo.filter({ cardapio_id: id }, "created_date", 100),
        base44.entities.Insumo.list("nome", 200),
        base44.entities.Receita.list("nome", 200),
      ]);
      setReceitas(recs || []);
      setInsumos(ins || []);
      setInsumosGlobais(ingrGlobal || []);
      setTodasReceitas(todasRec || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ============ SALVAR CARDAPIO ============
  const saveCardapio = async (field, value) => {
    if (!cardapio) return;
    const updated = { ...cardapio, [field]: value };
    setCardapio(updated);
    try {
      await base44.entities.Cardapio.update(cardapio.id, { [field]: value });
    } catch (e) { console.error(e); }
  };

  // ============ RECEITAS ============
  const addReceita = async (receita) => {
    if (!cardapio) return;
    const perCapitaDefault = sugerirPerCapita(receita.nome, receita.categoria);
    const nova = {
      cardapio_id: cardapio.id,
      receita_id: receita.id,
      receita_nome: receita.nome,
      receita_categoria: receita.categoria || "",
      per_capita_g: perCapitaDefault,
      quantidade_total_g: perCapitaDefault * (Number(cardapio.num_pessoas_ou_unidades) || 1),
      custo_total: 0,
      ordem: receitas.length + 1,
    };
    const criada = await base44.entities.CardapioReceita.create(nova);
    setReceitas(prev => [...prev, criada]);
    setShowAddReceita(false);
    setBuscaReceita("");
    // Recalcular custos
    recalcularCustosReceita(criada, receita.id);
  };

  const removeReceita = async (recId) => {
    if (!confirm("Remover esta receita do cardápio?")) return;
    await base44.entities.CardapioReceita.delete(recId);
    setReceitas(prev => prev.filter(r => r.id !== recId));
  };

  const updateReceita = async (recId, field, value) => {
    setReceitas(prev => prev.map(r => r.id === recId ? { ...r, [field]: value } : r));
    try {
      await base44.entities.CardapioReceita.update(recId, { [field]: value });
    } catch (e) { console.error(e); }
  };

  const moveReceita = async (recId, direction) => {
    const idx = receitas.findIndex(r => r.id === recId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= receitas.length) return;
    const updated = [...receitas];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setReceitas(updated);
    try {
      await base44.entities.CardapioReceita.update(recId, { ordem: newIdx + 1 });
      await base44.entities.CardapioReceita.update(updated[idx].id, { ordem: idx + 1 });
    } catch (e) { console.error(e); }
  };

  const recalcularCustosReceita = async (cardapioRec, receitaId) => {
    try {
      const receita = await base44.entities.Receita.get(receitaId);
      if (!receita) return;
      // Escalar custo da receita
      const fator = (Number(cardapioRec.quantidade_total_g) || 0) / (Number(receita.rendimento_total) || 1);
      const custoEscalado = (Number(receita.custo_total) || 0) * fator;
      await base44.entities.CardapioReceita.update(cardapioRec.id, { custo_total: custoEscalado });
      setReceitas(prev => prev.map(r => r.id === cardapioRec.id ? { ...r, custo_total: custoEscalado } : r));
    } catch (e) { console.error(e); }
  };

  // Atualiza quantidades quando num_pessoas muda
  const recalcRef = useRef(false);
  useEffect(() => {
    if (!cardapio || recalcRef.current) return;
    recalcRef.current = true;
    const num = Number(cardapio.num_pessoas_ou_unidades) || 1;
    const atualizar = async () => {
      for (const r of receitas) {
        const novaQt = (Number(r.per_capita_g) || 0) * num;
        if (Math.abs(novaQt - (Number(r.quantidade_total_g) || 0)) > 0.01) {
          await base44.entities.CardapioReceita.update(r.id, { quantidade_total_g: novaQt });
          recalcularCustosReceita({ ...r, quantidade_total_g: novaQt }, r.receita_id);
        }
      }
      recalcRef.current = false;
    };
    atualizar();
  }, [cardapio?.num_pessoas_ou_unidades]);

  // ============ INSUMOS ============
  const addInsumo = async (insumo) => {
    if (!cardapio) return;
    const qtd = cardapio.tipo === "marmitas" && insumo.nome?.toLowerCase().includes("marmita")
      ? Number(cardapio.num_pessoas_ou_unidades) || 1 : 1;
    const novo = {
      cardapio_id: cardapio.id,
      insumo_id: insumo.id || "",
      nome: insumo.nome || insumo.insumo_nome || "",
      quantidade: qtd,
      unidade: insumo.unidade || "un",
      custo_unitario: Number(insumo.preco_unitario) || 0,
      custo_total: qtd * (Number(insumo.preco_unitario) || 0),
    };
    const criado = await base44.entities.CardapioInsumo.create(novo);
    setInsumos(prev => [...prev, criado]);
  };

  const updateInsumo = async (insId, field, value) => {
    setInsumos(prev => prev.map(i => i.id === insId ? { ...i, [field]: value } : i));
    try {
      const updated = { [field]: value };
      if (field === "quantidade" || field === "custo_unitario") {
        const ins = insumos.find(i => i.id === insId);
        const qtd = field === "quantidade" ? Number(value) : Number(ins?.quantidade || 0);
        const cu = field === "custo_unitario" ? Number(value) : Number(ins?.custo_unitario || 0);
        updated.custo_total = qtd * cu;
      }
      await base44.entities.CardapioInsumo.update(insId, updated);
      if (updated.custo_total !== undefined) {
        setInsumos(prev => prev.map(i => i.id === insId ? { ...i, custo_total: updated.custo_total } : i));
      }
    } catch (e) { console.error(e); }
  };

  const removeInsumo = async (insId) => {
    await base44.entities.CardapioInsumo.delete(insId);
    setInsumos(prev => prev.filter(i => i.id !== insId));
  };

  // ============ SALVAR MARKUP ============
  const saveMarkup = async (val) => {
    setMarkup(val);
    try {
      await base44.entities.Cardapio.update(cardapio.id, { markup_percentual: val });
    } catch (e) { console.error(e); }
  };

  // ============ LISTA DE COMPRAS ============
  const gerarListaCompras = async () => {
    // Coletar todos os ingredientes de todas as receitas do cardápio
    const mapa = {};
    for (const cr of receitas) {
      try {
        const ingrs = await base44.entities.IngredienteReceita.filter({ receita_id: cr.receita_id }, "ordem", 200);
        const fator = cr.receita_id ? ((Number(cr.quantidade_total_g) || 0) / (Number((await base44.entities.Receita.get(cr.receita_id))?.rendimento_total) || 1)) : 1;
        for (const ing of (ingrs || [])) {
          if (ing.tipo === "grupo") continue;
          const nome = ing.ingrediente_nome || ing.subreceita_nome || "";
          const key = nome.toLowerCase();
          const qtd = (Number(ing.quantidade_por_porcao) || 0) * fator;
          if (!mapa[key]) {
            mapa[key] = { nome, quantidade_g: 0, custo: 0, origem: [] };
          }
          mapa[key].quantidade_g += qtd;
          mapa[key].origem.push(cr.receita_nome);
          // Buscar custo do ingrediente
          if (ing.ingrediente_id) {
            try {
              const ingData = await base44.entities.Ingrediente.get(ing.ingrediente_id);
              mapa[key].custo += qtd * (Number(ingData?.preco_por_g_rs) || 0);
            } catch (e) { /* ignore */ }
          }
        }
      } catch (e) { console.error(e); }
    }
    setListaCompras(Object.values(mapa));
    setShowLista(true);
  };

  // ============ EXPORTAR PDF ============
  const exportarPDF = () => {
    window.print();
  };

  // ============ RENDER ============
  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }
  if (!cardapio) {
    return <div className="text-center py-12 text-muted-foreground">Cardápio não encontrado.</div>;
  }

  const tipo = tipoConfig[cardapio.tipo] || tipoConfig.evento;
  const TipoIcon = tipo.icon;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Voltar */}
      <Link to="/cardapios" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="w-4 h-4" /> Cardápios
      </Link>

      {/* BLOCO 1 — Cabeçalho */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-4">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="flex-1 min-w-0">
            {editando ? (
              <Input
                className="text-xl font-display font-bold mb-2"
                value={cardapio.nome || ""}
                onChange={e => setCardapio({ ...cardapio, nome: e.target.value })}
                onBlur={() => { saveCardapio("nome", cardapio.nome); setEditando(false); }}
                autoFocus
              />
            ) : (
              <h1
                className="text-xl font-display font-bold cursor-pointer hover:text-primary"
                onClick={() => setEditando(true)}
              >
                {cardapio.nome?.toUpperCase?.() || cardapio.nome}
              </h1>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                <TipoIcon className="w-3 h-3 mr-1" /> {tipo.label}
              </Badge>
              {cardapio.data && <span className="text-sm text-muted-foreground">{cardapio.data.split("-").reverse().join("/")}</span>}
            </div>
            {cardapio.observacoes && (
              <p className="text-sm text-muted-foreground mt-2">{cardapio.observacoes}</p>
            )}
          </div>

          {/* Nº pessoas/unidades */}
          <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => saveCardapio("num_pessoas_ou_unidades", Math.max(1, (Number(cardapio.num_pessoas_ou_unidades) || 1) - 1))}
            >
              −
            </Button>
            <span className="text-lg font-bold min-w-[2rem] text-center">
              {cardapio.num_pessoas_ou_unidades || 1}
            </span>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => saveCardapio("num_pessoas_ou_unidades", (Number(cardapio.num_pessoas_ou_unidades) || 1) + 1)}
            >
              +
            </Button>
            <span className="text-sm text-muted-foreground ml-1">
              {cardapio.tipo === "evento" ? "pessoas" :
               cardapio.tipo === "marmitas" ? "marmitas" :
               cardapio.tipo === "buffet" ? "kg" : "unidades"}
            </span>
          </div>
        </div>

        {cardapio.tipo === "buffet" && (
          <div className="mt-3 text-sm text-muted-foreground">
            Quantidade total: <strong>{calcs.num} kg</strong>
          </div>
        )}
      </div>

      {/* BLOCO 2 — Receitas */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg">Receitas</h2>
          <Button variant="outline" size="sm" className="gap-1" onClick={async () => {
            const todas = await base44.entities.Receita.list("nome", 200);
            setTodasReceitas(todas || []);
            setShowAddReceita(true);
          }}>
            <Plus className="w-4 h-4" /> Adicionar receita
          </Button>
        </div>

        {receitas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma receita adicionada ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {receitas.map((rec, idx) => (
              <div key={rec.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <div className="flex flex-col gap-0.5">
                  <button className="p-0.5 hover:text-primary" onClick={() => moveReceita(rec.id, -1)} disabled={idx === 0}>
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button className="p-0.5 hover:text-primary" onClick={() => moveReceita(rec.id, 1)} disabled={idx === receitas.length - 1}>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/receita/${rec.receita_id}`} className="font-medium text-sm hover:text-primary truncate block">
                    {rec.receita_nome?.toUpperCase?.() || rec.receita_nome}
                  </Link>
                  {rec.receita_categoria && (
                    <span className="text-xs text-muted-foreground">{rec.receita_categoria}</span>
                  )}
                  {cardapio.tipo === "semanal" && (
                    <div className="flex gap-2 mt-1">
                      <Select value={rec.dia_semana || ""} onValueChange={v => updateReceita(rec.id, "dia_semana", v)}>
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue placeholder="Dia" />
                        </SelectTrigger>
                        <SelectContent>
                          {DIAS.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={rec.refeicao || ""} onValueChange={v => updateReceita(rec.id, "refeicao", v)}>
                        <SelectTrigger className="h-7 text-xs w-28">
                          <SelectValue placeholder="Refeição" />
                        </SelectTrigger>
                        <SelectContent>
                          {REFEICOES.map(rf => <SelectItem key={rf.key} value={rf.key}>{rf.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <Input
                      className="w-20 h-7 text-xs text-center"
                      value={rec.per_capita_g || ""}
                      onChange={e => {
                        const val = Number(e.target.value) || 0;
                        updateReceita(rec.id, "per_capita_g", val);
                        const qt = val * calcs.num;
                        updateReceita(rec.id, "quantidade_total_g", qt);
                      }}
                      placeholder="g/pessoa"
                    />
                    <span className="text-[10px] text-muted-foreground">g/{cardapio.tipo === "marmitas" ? "marmita" : "pessoa"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {Number(rec.quantidade_total_g || 0).toFixed(0)} g
                  </span>
                  <span className="text-sm font-semibold w-20 text-right">
                    R$ {Number(rec.custo_total || 0).toFixed(2)}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeReceita(rec.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BLOCO 3 — Insumos e Embalagens */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg">Insumos e Embalagens</h2>
          <Select onValueChange={async (v) => {
            if (v === "_sugestao" && cardapio.tipo === "marmitas") {
              addInsumo({ nome: "Marmita descartável", unidade: "un", preco_unitario: 0 });
            } else if (v !== "_sugestao") {
              const ins = insumosGlobais.find(i => i.id === v);
              if (ins) addInsumo(ins);
            }
          }}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="+ Adicionar insumo" />
            </SelectTrigger>
            <SelectContent>
              {cardapio.tipo === "marmitas" && (
                <SelectItem value="_sugestao">📦 Marmita descartável</SelectItem>
              )}
              {insumosGlobais.map(i => (
                <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {insumos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum insumo adicionado.</p>
        ) : (
          <div className="space-y-2">
            {insumos.map(ins => (
              <div key={ins.id} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                <Input
                  className="flex-1 h-7 text-sm"
                  value={ins.nome || ""}
                  onChange={e => updateInsumo(ins.id, "nome", e.target.value)}
                />
                <Input
                  className="w-16 h-7 text-xs text-center"
                  value={ins.quantidade || ""}
                  onChange={e => updateInsumo(ins.id, "quantidade", Number(e.target.value) || 0)}
                />
                <span className="text-xs text-muted-foreground">{ins.unidade || "un"}</span>
                <Input
                  className="w-20 h-7 text-xs"
                  value={ins.custo_unitario ? `R$ ${Number(ins.custo_unitario).toFixed(2)}` : ""}
                  onChange={e => {
                    const v = e.target.value.replace(/[^0-9,.]/g, "").replace(",", ".");
                    updateInsumo(ins.id, "custo_unitario", Number(v) || 0);
                  }}
                  placeholder="R$ 0,00"
                />
                <span className="text-sm font-semibold w-16 text-right">
                  R$ {Number(ins.custo_total || 0).toFixed(2)}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeInsumo(ins.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BLOCO 4 — Resumo de custos */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-4">
        <h2 className="font-display font-semibold text-lg mb-4">Resumo de Custos</h2>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground font-medium mb-2">Receitas:</p>
          {receitas.map(rec => (
            <div key={rec.id} className="flex justify-between text-muted-foreground ml-2">
              <span className="truncate mr-4">{rec.receita_nome}</span>
              <span className="font-medium">R$ {Number(rec.custo_total || 0).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-muted-foreground">
            <span>Insumos e embalagens</span>
            <span className="font-medium">R$ {calcs.custoInsumos.toFixed(2)}</span>
          </div>
          <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold text-base">
            <span>Custo total de produção</span>
            <span>R$ {calcs.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Custo por {cardapio.tipo === "marmitas" ? "marmita" : cardapio.tipo === "buffet" ? "kg" : "pessoa"}</span>
            <span className="font-medium">R$ {calcs.porUnidade.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* BLOCO 5 — Venda */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg">Quanto cobrar se eu vender?</h2>
          <Switch checked={showVenda} onCheckedChange={v => { setShowVenda(v); if (!v) saveMarkup(0); else saveMarkup(markup || 30); }} />
        </div>
        {showVenda && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Label className="text-sm">Markup</Label>
              <Input
                className="w-20 h-8 text-center"
                value={`${markup}%`}
                onChange={e => {
                  const v = parseInt(e.target.value) || 0;
                  saveMarkup(v);
                }}
              />
              <span className="text-sm text-muted-foreground">sobre o custo por unidade</span>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Custo por unidade</span>
                <span>R$ {calcs.porUnidade.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Markup ({markup}%)</span>
                <span>R$ {calcs.lucro.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t border-border pt-1 mt-1">
                <span>Preço sugerido de venda</span>
                <span>R$ {calcs.precoVenda.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button variant="outline" className="gap-2" onClick={gerarListaCompras}>
          <ShoppingCart className="w-4 h-4" /> Lista de Compras
        </Button>
        <Button variant="outline" className="gap-2" onClick={exportarPDF}>
          <Download className="w-4 h-4" /> Exportar PDF
        </Button>
      </div>

      {/* Dialog Adicionar Receita */}
      <Dialog open={showAddReceita} onOpenChange={setShowAddReceita}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Receita</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Buscar receita..."
            className="mb-4"
            value={buscaReceita}
            onChange={e => setBuscaReceita(e.target.value)}
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {todasReceitas
              .filter(r => !buscaReceita.trim() || (r.nome || "").toLowerCase().includes(buscaReceita.toLowerCase()))
              .slice(0, 30)
              .map(r => (
                <button
                  key={r.id}
                  className="w-full text-left px-3 py-2 rounded hover:bg-secondary text-sm flex justify-between items-center"
                  onClick={() => addReceita(r)}
                >
                  <span>{r.nome?.toUpperCase?.() || r.nome}</span>
                  <span className="text-xs text-muted-foreground">{r.categoria || ""}</span>
                </button>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddReceita(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Lista de Compras */}
      <Dialog open={showLista} onOpenChange={setShowLista}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Lista de Compras — {cardapio.nome}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {listaCompras.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum item na lista.</p>
            ) : (
              <div className="space-y-2">
                {listaCompras.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                    <div>
                      <p className="text-sm font-medium">{item.nome}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.origem?.filter((v, idx, a) => a.indexOf(v) === idx).join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{Number(item.quantidade_g || 0).toFixed(0)} g</p>
                      <p className="text-xs text-muted-foreground">R$ {Number(item.custo || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>R$ {listaCompras.reduce((s, i) => s + (Number(i.custo) || 0), 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLista(false)}>Fechar</Button>
            <Button onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-1" /> Exportar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}