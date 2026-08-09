import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Trash2, ShoppingCart, Download, Plus,
  Star, MoreHorizontal, Package, Scale, Calendar, PartyPopper,
  GlassWater, Sun, Sparkles, MapPin, MessageCircle, FileText
} from "lucide-react";
import RelatoriosDialog from "@/components/relatorios/RelatoriosDialog";
import { sugerirPerCapita, getPerCapitaInfo } from "@/lib/perCapitaData";
import TagBadge from "@/components/tags/TagBadge";
import TagSelector from "@/components/tags/TagSelector";
import AddInsumoBanco from "@/components/cardapio/AddInsumoBanco";
import BarraCoresCardapio from "@/components/planejamento/BarraCoresCardapio";
import CardapioSeletorDia from "@/components/cardapio/CardapioSeletorDia";
import CardapioTabelaReceitas from "@/components/cardapio/CardapioTabelaReceitas";
import { custoEscalado } from "@/lib/custoReceita";
import { calcularCustoCardapio } from "@/lib/custoCardapio";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { toast } from "sonner";

const DIAS = [
  { key: "segunda", label: "Seg" }, { key: "terca", label: "Ter" },
  { key: "quarta", label: "Qua" }, { key: "quinta", label: "Qui" },
  { key: "sexta", label: "Sex" }, { key: "sabado", label: "Sáb" },
  { key: "domingo", label: "Dom" },
];

const FIM_DE_SEMANA = ["sabado", "domingo"];

const TIPOS = {
  diario: { label: "Diário", icon: Sun, emoji: "🏠", cor: "bg-amber-100 text-amber-700 border-amber-200" },
  semanal: { label: "Semanal", icon: Calendar, emoji: "📅", cor: "bg-green-100 text-green-700 border-green-200" },
  fim_de_semana: { label: "Fim de semana", icon: MapPin, emoji: "🌅", cor: "bg-sky-100 text-sky-700 border-sky-200" },
  especial: { label: "Especial", icon: Sparkles, emoji: "⭐", cor: "bg-violet-100 text-violet-700 border-violet-200" },
  comemoracao: { label: "Comemoração", icon: PartyPopper, emoji: "🎉", cor: "bg-pink-100 text-pink-700 border-pink-200" },
  marmitas: { label: "Marmitas", icon: Package, emoji: "📦", cor: "bg-orange-100 text-orange-700 border-orange-200" },
  buffet: { label: "Buffet", icon: Scale, emoji: "⚖️", cor: "bg-blue-100 text-blue-700 border-blue-200" },
  happy_hour: { label: "Happy Hour", icon: GlassWater, emoji: "🍹", cor: "bg-rose-100 text-rose-700 border-rose-200" },
};

const UNIDADE_LABEL = {
  diario: "pessoas", semanal: "pessoas", fim_de_semana: "pessoas",
  especial: "pessoas", comemoracao: "convidados", marmitas: "marmitas",
  buffet: "kg", happy_hour: "pessoas",
};

const TIPOS_COM_DIAS = ["diario", "semanal", "fim_de_semana"];

function fmtRs(v) { return "R$ " + (v || 0).toFixed(2).replace(".", ","); }

const INSUMOS_SUGESTOES = {
  marmitas: [{ nome: "Marmita descartável", unidade: "un", preco_unitario: 0 }],
  happy_hour: [
    { nome: "Copo descartável", unidade: "un", preco_unitario: 0 },
    { nome: "Guardanapo", unidade: "un", preco_unitario: 0 },
  ],
  comemoracao: [
    { nome: "Prato descartável", unidade: "un", preco_unitario: 0 },
    { nome: "Talher descartável", unidade: "un", preco_unitario: 0 },
    { nome: "Guarda-chuva decorativo", unidade: "un", preco_unitario: 0 },
  ],
};

export default function CardapioAberto() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cardapio, setCardapio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardapioTags, setCardapioTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [editandoNome, setEditandoNome] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editandoObs, setEditandoObs] = useState(false);
  const [editObs, setEditObs] = useState("");
  const [favLocal, setFavLocal] = useState(false);

  const [receitas, setReceitas] = useState([]);
  const [showAddReceita, setShowAddReceita] = useState(false);
  const [buscaReceita, setBuscaReceita] = useState("");
  const [todasReceitas, setTodasReceitas] = useState([]);

  const [insumos, setInsumos] = useState([]);
  const [insumosGlobais, setInsumosGlobais] = useState([]);
  const [ingredientesPorReceita, setIngredientesPorReceita] = useState({});

  const [showVenda, setShowVenda] = useState(false);
  const [markup, setMarkup] = useState(30);

  const [showLista, setShowLista] = useState(false);
  const [listaCompras, setListaCompras] = useState([]);
  const [gerandoLista, setGerandoLista] = useState(false);
  const [showRelatorios, setShowRelatorios] = useState(false);

  const [filtroDia, setFiltroDia] = useState("todos");

  const getNum = () => {
    if (!cardapio) return 1;
    return Number(cardapio.num_unidades || cardapio.num_pessoas_ou_unidades) || 1;
  };
  const num = getNum();
  const isBuffet = cardapio?.tipo === "buffet";
  const temDias = TIPOS_COM_DIAS.includes(cardapio?.tipo);
  const diasDisponiveis = cardapio?.tipo === "fim_de_semana" ? FIM_DE_SEMANA : null;

  const receitaMap = useMemo(() => {
    const map = {};
    todasReceitas.forEach(r => { map[r.id] = r; });
    return map;
  }, [todasReceitas]);

  // Custo/preço de venda AO VIVO — via helper compartilhado com o Orçamento, para
  // garantir que ambos exibam exatamente o mesmo valor.
  const calcs = useMemo(
    () => calcularCustoCardapio({ receitas, receitaMap, ingredientesPorReceita, insumos, num, markup }),
    [receitas, receitaMap, ingredientesPorReceita, insumos, num, markup]
  );
  const receitasView = calcs.receitasView;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await base44.entities.Cardapio.get(id);
      setCardapio(c);
      setMarkup(Number(c.markup_percentual) || 30);
      setShowVenda(!!c.markup_percentual);
      setFavLocal(!!c.favorito);

      const [recs, ins, insGlobal, todasRec, tags, cTags] = await Promise.all([
        base44.entities.CardapioReceita.filter({ cardapio_id: id }, "ordem", 200),
        base44.entities.CardapioInsumo.filter({ cardapio_id: id }, "created_date", 200),
        base44.entities.Insumo.list("nome", 200),
        fetchAllPages(base44.entities.Receita, "nome"),
        base44.entities.Tag.list("nome", 200),
        base44.entities.CardapioTag.filter({ cardapio_id: id }, "created_date", 200),
      ]);
      setReceitas(recs || []);
      setInsumos(ins || []);
      setInsumosGlobais(insGlobal || []);
      setTodasReceitas(todasRec || []);
      setAllTags(tags || []);
      setCardapioTags(cTags || []);
      setFiltroDia("todos");

      // Carrega ingredientes de cada receita do cardápio, para calcular custo ao vivo
      const receitaIds = [...new Set((recs || []).map(r => r.receita_id).filter(Boolean))];
      const ingredientesArrays = await Promise.all(
        receitaIds.map(rid => base44.entities.IngredienteReceita.filter({ receita_id: rid }, "ordem", 200))
      );
      const ingredientesMap = {};
      receitaIds.forEach((rid, i) => { ingredientesMap[rid] = ingredientesArrays[i] || []; });
      setIngredientesPorReceita(ingredientesMap);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveCardapio = async (field, value) => {
    if (!cardapio) return;
    setCardapio(prev => ({ ...prev, [field]: value }));
    try { await base44.entities.Cardapio.update(cardapio.id, { [field]: value }); }
    catch (e) { console.error(e); }
  };

  // Favorito
  const toggleFav = async () => {
    const novo = !favLocal;
    setFavLocal(novo);
    try { await base44.entities.Cardapio.update(cardapio.id, { favorito: novo }); }
    catch (e) { setFavLocal(!novo); console.error(e); }
  };

  // Duplicar
  const handleDuplicate = async () => {
    const novo = await base44.entities.Cardapio.create({
      nome: `${cardapio.nome} — cópia`,
      tipo: cardapio.tipo,
      data: null,
      observacoes: cardapio.observacoes,
      num_unidades: getNum(),
      favorito: false,
    });
    for (const r of receitas) {
      await base44.entities.CardapioReceita.create({
        cardapio_id: novo.id, receita_id: r.receita_id, receita_nome: r.receita_nome,
        receita_categoria: r.receita_categoria, per_capita_g: r.per_capita_g,
        quantidade_total_g: r.quantidade_total_g, custo_total: r.custo_total,
        ordem: r.ordem, dia_semana: r.dia_semana, refeicao: r.refeicao,
      });
    }
    for (const i of insumos) {
      await base44.entities.CardapioInsumo.create({
        cardapio_id: novo.id, insumo_id: i.insumo_id, nome: i.nome,
        quantidade: i.quantidade, unidade: i.unidade,
        custo_unitario: i.custo_unitario, custo_total: i.custo_total,
      });
    }
    navigate(`/cardapio/${novo.id}`);
  };

  // === RECEITAS ===
  const addReceita = async (receita) => {
    if (!cardapio) return;
    const perCapitaDefault = isBuffet
      ? +(sugerirPerCapita(receita.nome, receita.categoria) / 1000).toFixed(3)
      : sugerirPerCapita(receita.nome, receita.categoria);
    const nova = {
      cardapio_id: cardapio.id, receita_id: receita.id,
      receita_nome: receita.nome, receita_categoria: receita.categoria || "",
      per_capita_g: perCapitaDefault,
      quantidade_total_g: perCapitaDefault * num,
      custo_total: 0, ordem: receitas.length + 1,
    };
    const criada = await base44.entities.CardapioReceita.create(nova);
    setReceitas(prev => [...prev, criada]);
    setShowAddReceita(false); setBuscaReceita("");
    recalcularCusto(criada, receita.id);
    if (!ingredientesPorReceita[receita.id]) {
      const ingr = await base44.entities.IngredienteReceita.filter({ receita_id: receita.id }, "ordem", 200);
      setIngredientesPorReceita(prev => ({ ...prev, [receita.id]: ingr }));
    }
  };

  const removeReceita = async (recId) => {
    if (!confirm("Remover esta receita do cardápio?")) return;
    await base44.entities.CardapioReceita.delete(recId);
    setReceitas(prev => prev.filter(r => r.id !== recId));
  };

  const updateReceita = async (recId, field, value) => {
    setReceitas(prev => prev.map(r => r.id === recId ? { ...r, [field]: value } : r));
    try { await base44.entities.CardapioReceita.update(recId, { [field]: value }); }
    catch (e) { console.error(e); }
  };

  const moveReceita = async (recId, dir) => {
    const idx = receitas.findIndex(r => r.id === recId);
    if (idx < 0) return;
    const ni = idx + dir;
    if (ni < 0 || ni >= receitas.length) return;
    const upd = [...receitas];
    [upd[idx], upd[ni]] = [upd[ni], upd[idx]];
    setReceitas(upd);
    try {
      await base44.entities.CardapioReceita.update(recId, { ordem: ni + 1 });
      await base44.entities.CardapioReceita.update(upd[idx].id, { ordem: idx + 1 });
    } catch (e) { console.error(e); }
  };

  const recalcularCusto = async (cr, receitaId) => {
    try {
      const rec = await base44.entities.Receita.get(receitaId);
      if (!rec) return;
      const ingredientes = await base44.entities.IngredienteReceita.filter({ receita_id: receitaId }, "ordem", 200);
      const qt = Number(cr.quantidade_total_g) || 0;
      const custoEsc = custoEscalado(rec, ingredientes, qt);
      await base44.entities.CardapioReceita.update(cr.id, { custo_total: custoEsc });
      setReceitas(prev => prev.map(r => r.id === cr.id ? { ...r, custo_total: custoEsc, quantidade_total_g: qt } : r));
    } catch (e) { console.error(e); }
  };

  // Recalc when num changes
  const recalcRef = useRef(false);
  useEffect(() => {
    if (!cardapio || recalcRef.current || receitas.length === 0) return;
    recalcRef.current = true;
    (async () => {
      for (const r of receitas) {
        const nq = (Number(r.per_capita_g) || 0) * num;
        if (Math.abs(nq - (Number(r.quantidade_total_g) || 0)) > 0.001) {
          await base44.entities.CardapioReceita.update(r.id, { quantidade_total_g: nq });
          recalcularCusto({ ...r, quantidade_total_g: nq }, r.receita_id);
        }
      }
      recalcRef.current = false;
    })();
  }, [num]);

  // === INSUMOS ===
  const addInsumo = async (insumo) => {
    if (!cardapio) return;
    const qtd = insumo._sugestao_qtd || 1;
    const novo = {
      cardapio_id: cardapio.id, insumo_id: insumo.id || "",
      nome: insumo.nome || "", quantidade: qtd,
      unidade: insumo.unidade || "un",
      custo_unitario: Number(insumo.preco_unitario) || 0,
      custo_total: qtd * (Number(insumo.preco_unitario) || 0),
    };
    const criado = await base44.entities.CardapioInsumo.create(novo);
    setInsumos(prev => [...prev, criado]);
  };

  const updateInsumo = async (insId, field, value) => {
    const upd = { [field]: value };
    const ins = insumos.find(i => i.id === insId);
    if (field === "quantidade" || field === "custo_unitario") {
      const q = field === "quantidade" ? Number(value) : Number(ins?.quantidade || 0);
      const cu = field === "custo_unitario" ? Number(value) : Number(ins?.custo_unitario || 0);
      upd.custo_total = q * cu;
    }
    setInsumos(prev => prev.map(i => i.id === insId ? { ...i, ...upd } : i));
    try { await base44.entities.CardapioInsumo.update(insId, upd); }
    catch (e) { console.error(e); }
  };

  const removeInsumo = async (insId) => {
    await base44.entities.CardapioInsumo.delete(insId);
    setInsumos(prev => prev.filter(i => i.id !== insId));
  };

  // === VENDA ===
  const saveMarkup = async (val) => {
    setMarkup(val);
    try { await base44.entities.Cardapio.update(cardapio.id, { markup_percentual: val }); }
    catch (e) { console.error(e); }
  };

  // === LISTA DE COMPRAS ===
  const gerarListaCompras = async () => {
    setGerandoLista(true);
    const mapa = {};
    for (const cr of receitas) {
      try {
        const ingrs = await base44.entities.IngredienteReceita.filter({ receita_id: cr.receita_id }, "ordem", 200);
        const rec = await base44.entities.Receita.get(cr.receita_id);
        const fator = rec?.rendimento_total ? (Number(cr.quantidade_total_g) || 0) / Number(rec.rendimento_total) : 1;
        for (const ing of (ingrs || [])) {
          if (ing.tipo === "grupo") continue;
          const nome = ing.ingrediente_nome || ing.subreceita_nome || "";
          if (!nome) continue;
          const key = nome.toLowerCase();
          const qtd = (Number(ing.quantidade_por_porcao) || 0) * fator;
          if (!mapa[key]) mapa[key] = { nome, tipo: ing.tipo, quantidade_g: 0, custo: 0, origens: [], categoria: "" };
          mapa[key].quantidade_g += qtd;
          if (!mapa[key].origens.includes(cr.receita_nome)) mapa[key].origens.push(cr.receita_nome);
          if (ing.tipo === "subreceita") mapa[key].origemSub = cr.receita_nome;
          if (ing.ingrediente_id) {
            try {
              const ingData = await base44.entities.Ingrediente.get(ing.ingrediente_id);
              if (ingData) {
                mapa[key].custo += qtd * (Number(ingData.preco_por_g_rs) || 0);
                mapa[key].categoria = ingData.categoria || "";
              }
            } catch (e) { /* ignore */ }
          }
        }
      } catch (e) { console.error(e); }
    }
    // Agrupar por categoria
    const agrupado = {};
    for (const item of Object.values(mapa)) {
      const cat = item.categoria || "Outros";
      if (!agrupado[cat]) agrupado[cat] = [];
      agrupado[cat].push(item);
    }
    setListaCompras(agrupado);
    setShowLista(true);
    setGerandoLista(false);
  };

  // === Ficha do Cardápio — abre tela de pré-visualização antes do PDF ===
  const abrirFichaCardapio = () => navigate(`/cardapio/${id}/ficha`);

  // === Orçamento — exige markup ativo, senão pede para ativar "Quanto cobrar" ===
  const abrirOrcamento = () => {
    if (!showVenda || !(markup > 0)) {
      toast.error('Ative "Quanto cobrar se eu vender?" antes de gerar o Orçamento.');
      return false;
    }
    navigate(`/cardapio/${id}/orcamento`);
    return false;
  };

  // === WHATSAPP ===
  const compartilharWhatsApp = () => {
    const lbl = UNIDADE_LABEL[cardapio.tipo] || "pessoas";
    const texto = `📋 ${cardapio.nome}\n${num} ${lbl}\nCusto total: R$ ${calcs.total.toFixed(2)}\nCusto por ${lbl === "kg" ? "kg" : "pessoa"}: R$ ${calcs.porUnidade.toFixed(2)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const diasUsados = useMemo(() => {
    const set = new Set(receitas.map(r => r.dia_semana).filter(Boolean));
    const base = diasDisponiveis || DIAS.map(d => d.key);
    return base.filter(k => set.has(k)).map(k => DIAS.find(d => d.key === k)).filter(Boolean);
  }, [receitas, diasDisponiveis]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  if (!cardapio) return <div className="text-center py-12 text-muted-foreground">Cardápio não encontrado.</div>;

  const tipo = TIPOS[cardapio.tipo] || TIPOS.diario;
  const TipoIcon = tipo.icon;
  const unidadeLabel = UNIDADE_LABEL[cardapio.tipo] || "pessoas";

  return (
    <div className="max-w-4xl mx-auto print:max-w-full">
      <div className="no-print flex items-center justify-between mb-4">
        <Link to="/cardapios" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Cardápios
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDuplicate}>📋 Duplicar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* BLOCO 1 — Cabeçalho */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-4 print:shadow-none print:border-0 print:p-0">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={toggleFav} className="p-1 rounded-full hover:bg-secondary transition-colors no-print">
                <Star className={`w-6 h-6 ${favLocal ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
              </button>
              {editandoNome ? (
                <Input
                  className="text-xl font-display font-bold h-10"
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  onBlur={() => { saveCardapio("nome", editNome); setEditandoNome(false); }}
                  onKeyDown={e => { if (e.key === "Enter") { saveCardapio("nome", editNome); setEditandoNome(false); } }}
                  autoFocus
                />
              ) : (
                <h1
                  className="text-xl font-display font-bold cursor-pointer hover:text-primary"
                  onClick={() => { setEditNome(cardapio.nome || ""); setEditandoNome(true); }}
                >
                  {cardapio.nome?.toUpperCase?.() || cardapio.nome}
                </h1>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className={`text-xs ${tipo.cor}`}>
                {tipo.emoji} {tipo.label}
              </Badge>
              {cardapio.data && (
                <span className="text-sm text-muted-foreground">
                  {cardapio.data.split("-").reverse().join("/")}
                </span>
              )}
              <Button variant="ghost" size="sm" className="text-xs h-7 no-print"
                onClick={() => { setEditNome(cardapio.nome || ""); setEditandoNome(true); }}>
                Editar
              </Button>
            </div>
            {editandoObs ? (
              <Textarea
                className="text-sm mt-2"
                rows={2}
                placeholder="Notas sobre o cardápio..."
                value={editObs}
                onChange={e => setEditObs(e.target.value)}
                onBlur={() => { saveCardapio("observacoes", editObs); setEditandoObs(false); }}
                autoFocus
              />
            ) : cardapio.observacoes ? (
              <p
                className="text-sm text-muted-foreground mt-2 cursor-pointer hover:text-foreground"
                onClick={() => { setEditObs(cardapio.observacoes || ""); setEditandoObs(true); }}
              >
                {cardapio.observacoes}
              </p>
            ) : (
              <button
                className="text-sm text-muted-foreground/70 hover:text-primary mt-2 no-print"
                onClick={() => { setEditObs(""); setEditandoObs(true); }}
              >
                + Adicionar observações
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap no-print">
            <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-2">
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => saveCardapio("num_unidades", Math.max(1, num - 1))}>−</Button>
              <span className="text-lg font-bold min-w-[2rem] text-center">{num}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => saveCardapio("num_unidades", num + 1)}>+</Button>
              <span className="text-sm text-muted-foreground ml-1">{unidadeLabel}</span>
            </div>
            {temDias && diasUsados.length > 0 && (
              <CardapioSeletorDia dias={diasUsados} value={filtroDia} onChange={setFiltroDia} />
            )}
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {fmtRs(num > 0 ? calcs.custoReceitas / num : 0)}
              </span> · custo por {isBuffet ? "un" : "pessoa"}
            </span>
          </div>
        </div>
        {isBuffet && (
          <div className="mt-3 text-sm text-muted-foreground">
            Quantidade total: <strong>{num} kg</strong>
          </div>
        )}
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t no-print">
          {cardapioTags.map(ct => {
            const tag = allTags.find(t => t.id === ct.tag_id);
            if (!tag) return null;
            return (
              <TagBadge
                key={ct.id}
                nome={tag.nome}
                cor={tag.cor}
                onClick={async () => {
                  await base44.entities.CardapioTag.delete(ct.id);
                  setCardapioTags(prev => prev.filter(t => t.id !== ct.id));
                }}
              />
            );
          })}
          <TagSelector
            selectedIds={cardapioTags.map(ct => ct.tag_id)}
            onToggle={async (tag) => {
              const exists = cardapioTags.find(ct => ct.tag_id === tag.id);
              if (exists) {
                await base44.entities.CardapioTag.delete(exists.id);
                setCardapioTags(prev => prev.filter(t => t.id !== tag.id));
              } else {
                const novo = await base44.entities.CardapioTag.create({
                  cardapio_id: cardapio.id,
                  tag_id: tag.id,
                  tag_nome: tag.nome,
                  tag_grupo: tag.grupo,
                  tag_cor: tag.cor,
                });
                setCardapioTags(prev => [...prev, novo]);
              }
            }}
          />
        </div>
      </div>

      {/* BLOCO 2 — Receitas (tabela) */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-4 print:shadow-none print:border-0">
        <h2 className="font-display font-semibold text-lg mb-4">Receitas</h2>

        <CardapioTabelaReceitas
          receitas={receitasView}
          receitaMap={receitaMap}
          isBuffet={isBuffet}
          num={num}
          cardapioNome={cardapio.nome}
          cardapioTipo={cardapio.tipo}
          temDias={temDias}
          diasOptions={diasDisponiveis ? diasDisponiveis.map(k => DIAS.find(d => d.key === k)).filter(Boolean) : DIAS}
          custoReceitasTotal={calcs.custoReceitas}
          custoInsumos={calcs.custoInsumos}
          custoProducaoTotal={calcs.total}
          filtroDia={filtroDia}
          onUpdateReceita={updateReceita}
          onRemoveReceita={removeReceita}
          onMoveReceita={moveReceita}
        />

        <Button variant="ghost" size="sm" className="w-full text-xs gap-1 mt-2 no-print"
          onClick={async () => {
            const todas = await fetchAllPages(base44.entities.Receita, "nome");
            setTodasReceitas(todas || []);
            setShowAddReceita(true);
          }}>
          <Plus className="w-3.5 h-3.5" /> Adicionar item
        </Button>

        {/* Barra de cores + alerta de monotonia visual */}
        {receitas.length > 0 && (
          <div className="mt-4">
            <BarraCoresCardapio gruposCalc={[{ itens: receitas }]} receitaMap={receitaMap} />
          </div>
        )}
      </div>

      {/* BLOCO 3 — Insumos */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-4 print:shadow-none print:border-0">
        <div className="flex items-center justify-between mb-4 no-print">
          <h2 className="font-display font-semibold text-lg">Insumos e Embalagens</h2>
          <div className="flex gap-2">
            {INSUMOS_SUGESTOES[cardapio.tipo]?.map(sug => (
              <Button key={sug.nome} variant="outline" size="sm" className="text-xs h-7"
                onClick={() => addInsumo({ ...sug, _sugestao_qtd: cardapio.tipo === "marmitas" && sug.nome.includes("Marmita") ? num : num })}>
                + {sug.nome}
              </Button>
            ))}
            <AddInsumoBanco
              insumosGlobais={insumosGlobais}
              onAdd={addInsumo}
              onUpdateGlobais={() => load()}
            />
          </div>
        </div>
        <h2 className="font-display font-semibold text-lg hidden print:block mb-4">Insumos e Embalagens</h2>
        {insumos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum insumo adicionado.</p>
        ) : (
          <div className="space-y-2">
            {insumos.map(ins => (
              <div key={ins.id} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                <Input className="flex-1 h-7 text-sm" value={ins.nome || ""}
                  onChange={e => updateInsumo(ins.id, "nome", e.target.value)} />
                <Input className="w-16 h-7 text-xs text-center" value={ins.quantidade || ""}
                  onChange={e => updateInsumo(ins.id, "quantidade", Number(e.target.value) || 0)} />
                <span className="text-xs text-muted-foreground">{ins.unidade || "un"}</span>
                <Input className="w-24 h-7 text-xs" value={ins.custo_unitario ? `R$ ${Number(ins.custo_unitario).toFixed(2)}` : ""}
                  onChange={e => {
                    const v = e.target.value.replace(/[^0-9,.]/g, "").replace(",", ".");
                    updateInsumo(ins.id, "custo_unitario", Number(v) || 0);
                  }}
                  placeholder="R$ 0,00" />
                <span className="text-sm font-semibold w-16 text-right">R$ {Number(ins.custo_total || 0).toFixed(2)}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive no-print"
                  onClick={() => removeInsumo(ins.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BLOCO 5 — Venda */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-4 print:shadow-none print:border-0 no-print">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg">Quanto cobrar se eu vender?</h2>
          <Switch checked={showVenda} onCheckedChange={v => {
            setShowVenda(v);
            saveMarkup(v ? (markup || 30) : 0);
          }} />
        </div>
        {showVenda && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Label className="text-sm">Markup</Label>
              <Input className="w-20 h-8 text-center" value={`${markup}%`}
                onChange={e => { const v = parseInt(e.target.value) || 0; saveMarkup(v); }} />
              <span className="text-sm text-muted-foreground">sobre o custo por {unidadeLabel === "kg" ? "kg" : "unidade"}</span>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Custo por {unidadeLabel === "kg" ? "kg" : "unidade"}</span>
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
      <div className="flex flex-wrap gap-3 mb-8 no-print">
        <Button variant="outline" className="gap-2" onClick={abrirFichaCardapio}>
          <Download className="w-4 h-4" /> PDF
        </Button>
        <Button variant="outline" className="gap-2" onClick={compartilharWhatsApp}>
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </Button>
        <Button variant="outline" className="gap-2" onClick={gerarListaCompras} disabled={gerandoLista}>
          <ShoppingCart className="w-4 h-4" /> {gerandoLista ? "Gerando..." : "Lista de Compras"}
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setShowRelatorios(true)}>
          <FileText className="w-4 h-4" /> Relatórios
        </Button>
      </div>

      {/* Dialog Relatórios do Cardápio (casca — geradores entram em prompts separados) */}
      <RelatoriosDialog
        open={showRelatorios}
        onClose={() => setShowRelatorios(false)}
        titulo="Relatórios do Cardápio"
        cabecalho={{
          nome: cardapio.nome,
          data: cardapio.data ? cardapio.data.split("-").reverse().join("/") : null,
          tipoLabel: tipo.label,
          numPessoas: isBuffet ? null : num,
        }}
        handlers={{
          ficha_cardapio: () => { setShowRelatorios(false); abrirFichaCardapio(); return false; },
          orcamento: () => { setShowRelatorios(false); abrirOrcamento(); return false; },
          pre_preparos: () => { setShowRelatorios(false); navigate(`/cardapio/${id}/pre-preparos`); return false; },
        }}
      />

      {/* Dialog Adicionar Receita */}
      <Dialog open={showAddReceita} onOpenChange={setShowAddReceita}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Adicionar Receita</DialogTitle></DialogHeader>
          <Input placeholder="Buscar receita..." className="mb-4" value={buscaReceita}
            onChange={e => setBuscaReceita(e.target.value)} autoFocus />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {todasReceitas
              .filter(r => !buscaReceita.trim() || (r.nome || "").toLowerCase().includes(buscaReceita.toLowerCase()))
              .slice(0, 30)
              .map(r => (
                <button key={r.id}
                  className="w-full text-left px-3 py-2 rounded hover:bg-secondary text-sm flex justify-between items-center"
                  onClick={() => addReceita(r)}>
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
            <DialogTitle>📋 Lista de Compras — {cardapio.nome}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {Object.keys(listaCompras).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum item na lista.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(listaCompras).map(([cat, itens]) => (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</h3>
                    <div className="space-y-1">
                      {itens.map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                          <div>
                            <p className="text-sm font-medium">{item.nome}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.origens?.join(", ")}
                              {item.origemSub && <span className="italic ml-1">(para {item.origemSub})</span>}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{Number(item.quantidade_g || 0).toFixed(0)} g</p>
                            <p className="text-xs text-muted-foreground">R$ {Number(item.custo || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>R$ {Object.values(listaCompras).flat().reduce((s, i) => s + (Number(i.custo) || 0), 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLista(false)}>Fechar</Button>
            <Button onClick={() => window.print()}><Download className="w-4 h-4 mr-1" /> Exportar PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}