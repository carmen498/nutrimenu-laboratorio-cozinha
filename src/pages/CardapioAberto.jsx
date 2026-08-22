import { criarCardapioInsumo, criarCardapioReceita, criarCardapioTag } from '@/lib/secureChildEntities';
import { criarCardapioSeguro } from '@/lib/secureRootEntities';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ShoppingCart, Download, Plus,
  Star, MoreHorizontal, Package, Scale, Calendar, PartyPopper,
  GlassWater, Sun, Sparkles, MapPin, FileText, Pencil, HelpCircle
} from "lucide-react";
import RelatoriosDialog from "@/components/relatorios/RelatoriosDialog";
import { sugerirPerCapita } from "@/lib/perCapitaData";
import TagBadge from "@/components/tags/TagBadge";
import TagSelector from "@/components/tags/TagSelector";
import CardapioInsumosSection from "@/components/cardapio/CardapioInsumosSection";
import BarraCoresCardapio from "@/components/planejamento/BarraCoresCardapio";
import CardapioSeletorDia from "@/components/cardapio/CardapioSeletorDia";
import CardapioTabelaReceitas from "@/components/cardapio/CardapioTabelaReceitas";
import { custoEscalado } from "@/lib/custoReceita";
import { calcularCustoCardapio } from "@/lib/custoCardapio";
import { carregarIngredientesEfetivosCusto, mapearIngredientesPorId } from "@/lib/custoContexto";
import { calcularItemIngredienteReceita } from "@/lib/ingredienteReceitaCalc";
import { consoleErrorSeguro } from "@/lib/securityHardening";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { garantirCardapioEditavel } from "@/lib/forkCardapio";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
function normalizarBusca(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function CardapioAberto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [cardapio, setCardapio] = useState(null);
  const [existingCopyWarning, setExistingCopyWarning] = useState(null);
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
  const [ingredientesEfetivosCusto, setIngredientesEfetivosCusto] = useState([]);
  const [insumosPorReceita, setInsumosPorReceita] = useState({});
  const [esquecidosPorReceita, setEsquecidosPorReceita] = useState({});

  const [showVenda, setShowVenda] = useState(false);
  const [markup, setMarkup] = useState(30);

  const [showLista, setShowLista] = useState(false);
  const [listaCompras, setListaCompras] = useState([]);
  const [gerandoLista, setGerandoLista] = useState(false);
  const [showRelatorios, setShowRelatorios] = useState(false);
  const [showEditar, setShowEditar] = useState(false);
  const [editForm, setEditForm] = useState({ nome: "", tipo: "", data: "" });
  const [salvandoEditar, setSalvandoEditar] = useState(false);

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

  const ingredienteMap = useMemo(
    () => mapearIngredientesPorId(ingredientesEfetivosCusto),
    [ingredientesEfetivosCusto]
  );

  // Custo/preço de venda AO VIVO — via helper compartilhado com o Orçamento, para
  // garantir que ambos exibam exatamente o mesmo valor.
  const calcs = useMemo(
    () => calcularCustoCardapio({
      receitas,
      receitaMap,
      ingredientesPorReceita,
      insumos,
      num,
      markup,
      ingredienteMap,
      insumosPorReceita,
      esquecidosPorReceita,
    }),
    [receitas, receitaMap, ingredientesPorReceita, insumos, num, markup, ingredienteMap, insumosPorReceita, esquecidosPorReceita]
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

      // Fase 10 — carrega composição + contexto comercial efetivo do usuário.
      const receitaIds = [...new Set((recs || []).map(r => r.receita_id).filter(Boolean))];
      const [ingredientesArrays, insumosArrays, esquecidosArrays, ingredientesEfetivos] = await Promise.all([
        Promise.all(receitaIds.map(rid => base44.entities.IngredienteReceita.filter({ receita_id: rid }, "ordem", 500))),
        Promise.all(receitaIds.map(rid => base44.entities.InsumoReceita.filter({ receita_id: rid }, "created_date", 500))),
        Promise.all(receitaIds.map(rid => base44.entities.IngredienteEsquecidoReceita.filter({ receita_id: rid }, "created_date", 500))),
        carregarIngredientesEfetivosCusto({ userId: user?.id, isAdmin }),
      ]);
      const ingredientesMap = {};
      const insumosReceitaMap = {};
      const esquecidosReceitaMap = {};
      receitaIds.forEach((rid, i) => {
        ingredientesMap[rid] = ingredientesArrays[i] || [];
        insumosReceitaMap[rid] = insumosArrays[i] || [];
        esquecidosReceitaMap[rid] = esquecidosArrays[i] || [];
      });
      setIngredientesPorReceita(ingredientesMap);
      setInsumosPorReceita(insumosReceitaMap);
      setEsquecidosPorReceita(esquecidosReceitaMap);
      setIngredientesEfetivosCusto(ingredientesEfetivos || []);
    } catch (e) { consoleErrorSeguro("Erro em cardápio aberto", e); }
    setLoading(false);
  }, [id, user?.id, isAdmin]);

  useEffect(() => { load(); }, [load]);

  // Garante que o usuário pode editar este cardápio diretamente — se for um
  // cardápio do catálogo compartilhado (is_base=true) e o usuário não for admin,
  // cria (ou reaproveita) uma cópia pessoal em "Meus Cardápios" antes de aplicar a edição.
  const ensureEditavel = async () => {
    if (!cardapio) {
      return { cardapioId: null, receitasAtual: receitas, insumosAtual: insumos, cardapioTagsAtual: cardapioTags, mapReceitaItemId: (x) => x, mapInsumoId: (x) => x, mapTagId: (x) => x, forked: false };
    }
    const result = await garantirCardapioEditavel({ cardapio, receitas, insumos, cardapioTags, isAdmin, userId: user?.id });
    if (result.blocked) {
      setExistingCopyWarning({ existingCopyId: result.existingCopyId });
      throw new Error("EXISTING_COPY_BLOCKED");
    }
    if (result.forked) {
      setCardapio(result.novoCardapio);
      setReceitas(result.novasReceitas);
      setInsumos(result.novosInsumos);
      setCardapioTags(result.novasTags);
      toast.success("Uma cópia editável deste cardápio foi criada para você.");
      navigate(`/cardapio/${result.cardapioId}`, { replace: true });
      return {
        cardapioId: result.cardapioId, receitasAtual: result.novasReceitas, insumosAtual: result.novosInsumos,
        cardapioTagsAtual: result.novasTags, mapReceitaItemId: result.mapReceitaItemId,
        mapInsumoId: result.mapInsumoId, mapTagId: result.mapTagId, forked: true,
      };
    }
    return {
      cardapioId: result.cardapioId, receitasAtual: receitas, insumosAtual: insumos, cardapioTagsAtual: cardapioTags,
      mapReceitaItemId: result.mapReceitaItemId, mapInsumoId: result.mapInsumoId, mapTagId: result.mapTagId, forked: false,
    };
  };

  const saveCardapio = async (field, value) => {
    if (!cardapio) return;
    const { cardapioId } = await ensureEditavel();
    setCardapio(prev => ({ ...prev, [field]: value }));
    try { await base44.entities.Cardapio.update(cardapioId, { [field]: value }); }
    catch (e) { consoleErrorSeguro("Erro em cardápio aberto", e); }
  };

  // Favorito
  const toggleFav = async () => {
    const novo = !favLocal;
    setFavLocal(novo);
    try {
      const { cardapioId } = await ensureEditavel();
      await base44.entities.Cardapio.update(cardapioId, { favorito: novo });
    } catch (e) { setFavLocal(!novo); consoleErrorSeguro("Erro em cardápio aberto", e); }
  };

  // Duplicar
  const handleDuplicate = async () => {
    const novo = await criarCardapioSeguro({
      nome: `${cardapio.nome} — cópia`,
      tipo: cardapio.tipo,
      data: null,
      observacoes: cardapio.observacoes,
      num_unidades: getNum(),
      favorito: false,
    });
    for (const r of receitas) {
      await criarCardapioReceita({
        cardapio_id: novo.id, receita_id: r.receita_id, receita_nome: r.receita_nome,
        receita_categoria: r.receita_categoria, per_capita_g: r.per_capita_g,
        quantidade_total_g: r.quantidade_total_g, custo_total: r.custo_total,
        ordem: r.ordem, dia_semana: r.dia_semana, refeicao: r.refeicao,
      });
    }
    for (const i of insumos) {
      await criarCardapioInsumo({
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
    const { cardapioId } = await ensureEditavel();
    const perCapitaDefault = isBuffet
      ? +(sugerirPerCapita(receita.nome, receita.categoria) / 1000).toFixed(3)
      : sugerirPerCapita(receita.nome, receita.categoria);
    const nova = {
      cardapio_id: cardapioId, receita_id: receita.id,
      receita_nome: receita.nome, receita_categoria: receita.categoria || "",
      per_capita_g: perCapitaDefault,
      quantidade_total_g: perCapitaDefault * num,
      custo_total: 0, ordem: receitas.length + 1,
    };
    const criada = await criarCardapioReceita(nova);
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
    const { mapReceitaItemId } = await ensureEditavel();
    const newId = mapReceitaItemId(recId);
    await base44.entities.CardapioReceita.delete(newId);
    setReceitas(prev => prev.filter(r => r.id !== newId));
  };

  // Aceita um único campo ({field, value}) ou múltiplos campos de uma vez (objeto),
  // sempre como UMA operação atômica — evita corrida entre escritas relacionadas
  // (ex: per_capita_g e quantidade_total_g ao editar o PC).
  const updateReceita = async (recId, fieldOrUpdates, value) => {
    const updates = typeof fieldOrUpdates === "string" ? { [fieldOrUpdates]: value } : fieldOrUpdates;
    const { mapReceitaItemId } = await ensureEditavel();
    const newId = mapReceitaItemId(recId);
    setReceitas(prev => prev.map(r => r.id === newId ? { ...r, ...updates } : r));
    try { await base44.entities.CardapioReceita.update(newId, updates); }
    catch (e) { consoleErrorSeguro("Erro em cardápio aberto", e); }
  };

  const moveReceita = async (recId, dir) => {
    const { receitasAtual, mapReceitaItemId } = await ensureEditavel();
    const idx = receitasAtual.findIndex(r => r.id === mapReceitaItemId(recId));
    if (idx < 0) return;
    const ni = idx + dir;
    if (ni < 0 || ni >= receitasAtual.length) return;
    const upd = [...receitasAtual];
    [upd[idx], upd[ni]] = [upd[ni], upd[idx]];
    setReceitas(upd);
    try {
      await base44.entities.CardapioReceita.update(upd[ni].id, { ordem: ni + 1 });
      await base44.entities.CardapioReceita.update(upd[idx].id, { ordem: idx + 1 });
    } catch (e) { consoleErrorSeguro("Erro em cardápio aberto", e); }
  };

  const recalcularCusto = async (cr, receitaId) => {
    try {
      const rec = await base44.entities.Receita.get(receitaId);
      if (!rec) return;
      const [ingredientes, insumosReceitaAtual, esquecidosAtual] = await Promise.all([
        base44.entities.IngredienteReceita.filter({ receita_id: receitaId }, "ordem", 500),
        base44.entities.InsumoReceita.filter({ receita_id: receitaId }, "created_date", 500),
        base44.entities.IngredienteEsquecidoReceita.filter({ receita_id: receitaId }, "created_date", 500),
      ]);
      setIngredientesPorReceita(prev => ({ ...prev, [receitaId]: ingredientes || [] }));
      setInsumosPorReceita(prev => ({ ...prev, [receitaId]: insumosReceitaAtual || [] }));
      setEsquecidosPorReceita(prev => ({ ...prev, [receitaId]: esquecidosAtual || [] }));
      const qt = Number(cr.quantidade_total_g) || 0;
      const custoEsc = custoEscalado(rec, ingredientes, qt, {
        ingredienteMap,
        insumosReceita: insumosReceitaAtual || [],
        esquecidos: esquecidosAtual || [],
      });
      await base44.entities.CardapioReceita.update(cr.id, { custo_total: custoEsc });
      setReceitas(prev => prev.map(r => r.id === cr.id ? { ...r, custo_total: custoEsc, quantidade_total_g: qt } : r));
    } catch (e) { consoleErrorSeguro("Erro em cardápio aberto", e); }
  };

  // Persiste quantidade_total_g (usado por outras telas/relatórios) sempre que o
  // número de convidados muda. A exibição nesta tela já é 100% ao vivo (não depende
  // deste efeito) — isto é apenas para manter o cache do banco atualizado.
  // Usa refs (não um único boolean) para nunca perder um convidados intermediário:
  // se "num" mudar de novo enquanto uma passada está em andamento, a passada em
  // andamento roda de novo ao final até convergir no valor mais recente.
  const recalcRunningRef = useRef(false);
  const latestNumRef = useRef(num);
  const receitasRef = useRef(receitas);
  useEffect(() => { latestNumRef.current = num; }, [num]);
  useEffect(() => { receitasRef.current = receitas; }, [receitas]);

  useEffect(() => {
    if (!cardapio || recalcRunningRef.current || receitas.length === 0) return;
    if (!(isAdmin || cardapio.is_base === false)) return;
    recalcRunningRef.current = true;
    (async () => {
      let numUsado;
      do {
        numUsado = latestNumRef.current;
        for (const r of receitasRef.current) {
          const nq = (Number(r.per_capita_g) || 0) * numUsado;
          if (Math.abs(nq - (Number(r.quantidade_total_g) || 0)) > 0.001) {
            await base44.entities.CardapioReceita.update(r.id, { quantidade_total_g: nq });
            recalcularCusto({ ...r, quantidade_total_g: nq }, r.receita_id);
          }
        }
      } while (numUsado !== latestNumRef.current);
      recalcRunningRef.current = false;
    })();
  }, [num]);

  // === INSUMOS ===
  const addInsumo = async (insumo) => {
    if (!cardapio) return;
    const { cardapioId } = await ensureEditavel();
    const qtd = insumo._sugestao_qtd || 1;
    const novo = {
      cardapio_id: cardapioId, insumo_id: insumo.id || "",
      nome: insumo.nome || "", quantidade: qtd,
      unidade: insumo.unidade || "un",
      custo_unitario: Number(insumo.preco_unitario) || 0,
      custo_total: qtd * (Number(insumo.preco_unitario) || 0),
    };
    const criado = await criarCardapioInsumo(novo);
    setInsumos(prev => [...prev, criado]);
  };

  const updateInsumo = async (insId, field, value) => {
    const { insumosAtual, mapInsumoId } = await ensureEditavel();
    const newId = mapInsumoId(insId);
    const upd = { [field]: value };
    const ins = insumosAtual.find(i => i.id === newId);
    if (field === "quantidade" || field === "custo_unitario") {
      const q = field === "quantidade" ? Number(value) : Number(ins?.quantidade || 0);
      const cu = field === "custo_unitario" ? Number(value) : Number(ins?.custo_unitario || 0);
      upd.custo_total = q * cu;
    }
    setInsumos(prev => prev.map(i => i.id === newId ? { ...i, ...upd } : i));
    try { await base44.entities.CardapioInsumo.update(newId, upd); }
    catch (e) { consoleErrorSeguro("Erro em cardápio aberto", e); }
  };

  const removeInsumo = async (insId) => {
    const { mapInsumoId } = await ensureEditavel();
    const newId = mapInsumoId(insId);
    await base44.entities.CardapioInsumo.delete(newId);
    setInsumos(prev => prev.filter(i => i.id !== newId));
  };

  // === VENDA ===
  const saveMarkup = async (val) => {
    setMarkup(val);
    try {
      const { cardapioId } = await ensureEditavel();
      await base44.entities.Cardapio.update(cardapioId, { markup_percentual: val });
    } catch (e) { consoleErrorSeguro("Erro em cardápio aberto", e); }
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
          const qtdLiquida = (Number(ing.quantidade_por_porcao) || 0) * fator;
          if (!mapa[key]) mapa[key] = { nome, tipo: ing.tipo, quantidade_g: 0, custo: 0, origens: [], categoria: "" };
          if (!mapa[key].origens.includes(cr.receita_nome)) mapa[key].origens.push(cr.receita_nome);
          if (ing.tipo === "subreceita") {
            mapa[key].quantidade_g += qtdLiquida;
            mapa[key].origemSub = cr.receita_nome;
            continue;
          }
          if (ing.ingrediente_id) {
            const ingData = ingredienteMap[ing.ingrediente_id];
            if (ingData) {
              const calculado = calcularItemIngredienteReceita({
                item: ing,
                ingrediente: ingData,
                quantidadeLiquida: qtdLiquida,
              });
              // Lista de compras usa PB (PL × FC), a mesma base usada pelo custo.
              mapa[key].quantidade_g += calculado.pesoBruto;
              mapa[key].custo += calculado.custo;
              mapa[key].categoria = ingData.categoria || "";
            } else {
              mapa[key].quantidade_g += qtdLiquida;
            }
          } else {
            mapa[key].quantidade_g += qtdLiquida;
          }
        }
      } catch (e) { consoleErrorSeguro("Erro em cardápio aberto", e); }
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

  // === EDITAR CARDÁPIO (nome, categoria, data) ===
  const abrirEditar = () => {
    setEditForm({ nome: cardapio.nome || "", tipo: cardapio.tipo || "", data: cardapio.data || "" });
    setShowEditar(true);
  };

  const salvarEditar = async () => {
    if (!editForm.nome.trim() || !editForm.tipo) return;
    setSalvandoEditar(true);
    try {
      const { cardapioId } = await ensureEditavel();
      const upd = { nome: editForm.nome.trim(), tipo: editForm.tipo, data: editForm.data || null };
      await base44.entities.Cardapio.update(cardapioId, upd);
      setCardapio(prev => ({ ...prev, ...upd }));
      setShowEditar(false);
    } catch (e) { consoleErrorSeguro("Erro em cardápio aberto", e); }
    setSalvandoEditar(false);
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
                  onBlur={() => { saveCardapio("nome", editNome.trim().toUpperCase()); setEditandoNome(false); }}
                  onKeyDown={e => { if (e.key === "Enter") { saveCardapio("nome", editNome.trim().toUpperCase()); setEditandoNome(false); } }}
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
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 no-print"
                onClick={abrirEditar}>
                <Pencil className="w-3 h-3" /> Editar
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
                  const { mapTagId } = await ensureEditavel();
                  const newId = mapTagId(ct.id);
                  await base44.entities.CardapioTag.delete(newId);
                  setCardapioTags(prev => prev.filter(t => t.id !== newId));
                }}
              />
            );
          })}
          <TagSelector
            selectedIds={cardapioTags.map(ct => ct.tag_id)}
            onToggle={async (tag) => {
              const { cardapioId, cardapioTagsAtual, mapTagId } = await ensureEditavel();
              const exists = cardapioTagsAtual.find(ct => ct.tag_id === tag.id);
              if (exists) {
                const newId = mapTagId(exists.id);
                await base44.entities.CardapioTag.delete(newId);
                setCardapioTags(prev => prev.filter(t => t.id !== newId));
              } else {
                const novo = await criarCardapioTag({
                  cardapio_id: cardapioId,
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
          cardapioId={cardapio.id}
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
      </div>

      {/* BLOCO 3 — Insumos */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-4 print:shadow-none print:border-0">
        <CardapioInsumosSection
          insumos={insumos}
          insumosGlobais={insumosGlobais}
          onAdd={addInsumo}
          onUpdate={updateInsumo}
          onRemove={removeInsumo}
          onReloadGlobais={() => load()}
        />
      </div>

      {/* BLOCO 4 — Cores do Cardápio */}
      {receitas.length > 0 && (
        <div className="mb-4 no-print">
          <BarraCoresCardapio gruposCalc={[{ itens: receitas }]} receitaMap={receitaMap} />
        </div>
      )}

      {/* BLOCO 5 — Venda */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-4 print:shadow-none print:border-0 no-print">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <h2 className="font-display font-semibold text-lg">Quanto cobrar se eu vender?</h2>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground shrink-0" title="Como funciona?">
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm" align="start">
                <p className="text-muted-foreground">
                  Ao ativar, exibe uma barra para definir a Margem (%) desejada. Esse percentual é somado ao custo total da receita, mostrando quanto cobrar por porção para alcançar a margem definida.
                </p>
              </PopoverContent>
            </Popover>
          </div>
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
          ficha_custos: () => { setShowRelatorios(false); navigate(`/cardapio/${id}/ficha-custos`); return false; },
          receitas_cardapio: () => { setShowRelatorios(false); navigate(`/cardapio/${id}/receitas`); return false; },
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
              .filter(r => !buscaReceita.trim() || normalizarBusca(r.nome).includes(normalizarBusca(buscaReceita)))
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

      {/* Dialog Editar Cardápio */}
      <Dialog open={showEditar} onOpenChange={setShowEditar}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Cardápio</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input
                id="edit-nome"
                value={editForm.nome}
                onChange={e => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <Label>Categoria *</Label>
              <Select value={editForm.tipo} onValueChange={v => setEditForm(prev => ({ ...prev, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPOS).map(([key, t]) => (
                    <SelectItem key={key} value={key}>{t.emoji} {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-data">Data</Label>
              <Input
                id="edit-data"
                type="date"
                value={editForm.data || ""}
                onChange={e => setEditForm(prev => ({ ...prev, data: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditar(false)}>Cancelar</Button>
            <Button onClick={salvarEditar} disabled={salvandoEditar || !editForm.nome.trim() || !editForm.tipo}>
              {salvandoEditar ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aviso: já existe uma cópia pessoal deste cardápio */}
      <AlertDialog open={!!existingCopyWarning} onOpenChange={(open) => !open && setExistingCopyWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você já tem uma cópia pessoal deste cardápio</AlertDialogTitle>
            <AlertDialogDescription>
              Para evitar cópias duplicadas, continue editando a versão que já está em "Meus Cardápios".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExistingCopyWarning(null)}>Fechar</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate(`/cardapio/${existingCopyWarning?.existingCopyId}`)}>
              Ir para minha cópia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}