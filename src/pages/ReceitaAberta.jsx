import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from "@/components/ui/alert-dialog";
import {
  ChefHat, ArrowLeft, Minus, Plus, ShoppingCart, FileText, Copy,
  Pencil, Trash2, GripVertical, DollarSign, AlertTriangle, Camera, Sparkles, Loader2, Check, X, ArrowUp, ArrowDown, ArrowUpDown, Star, Scale
} from "lucide-react";
import MedidasCaseirasReceitaDialog from "@/components/receita/MedidasCaseirasReceitaDialog";
import { toast } from "sonner";
import AddIngredienteDialog from "@/components/receita/AddIngredienteDialog";
import EditReceitaDialog from "@/components/receita/EditReceitaDialog";
import InsumosSection from "@/components/receita/InsumosSection";
import IngredientesEsquecidos from "@/components/receita/IngredientesEsquecidos";
import EditItemDialog from "@/components/receita/EditItemDialog";
import CalculadoraCusto from "@/components/CalculadoraCusto";
import TagBadge from "@/components/tags/TagBadge";
import TagList from "@/components/tags/TagList";
import TagSelector from "@/components/tags/TagSelector";
import { formatarModoPreparo } from "@/lib/formatarModoPreparo";
import { calcularModoPreparoComposto } from "@/lib/modoPreparoComposto";
import ModoPreparoComposto from "@/components/receita/ModoPreparoComposto";
import { sugerirPerCapita, getPerCapitaInfo } from "@/lib/perCapitaData";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import DraggableRow from "@/components/receita/DraggableRow";
import CadastrarMedidaDialog from "@/components/receita/CadastrarMedidaDialog";
import { converterGramasParaMedida, converterMedidaParaGramas } from "@/lib/conversorMedidas";
import EscaladorReceita from "@/components/receita/EscaladorReceita";
import EscalarReceitaDialog from "@/components/receita/EscalarReceitaDialog";
import TabelaIngredientesReceita from "@/components/receita/TabelaIngredientesReceita";
import CorPredominantePicker from "@/components/receita/CorPredominantePicker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { getCorHex, getCorLabelCompleto } from "@/lib/coresReceita";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { registrarHistorico } from "@/lib/registrarHistorico";
import { garantirReceitaEditavel } from "@/lib/forkReceita";
import { useAuth } from "@/lib/AuthContext";
import { buscarPrecosPersonalizados, aplicarPrecosPersonalizados, salvarPrecoPersonalizado } from "@/lib/precoIngredienteCliente";

export default function ReceitaAberta() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Contexto de origem (cardápio/evento): quando a ficha é aberta a partir de um
  // cardápio, o escalador abre pré-escalado com o PC e nº de pessoas daquele
  // cardápio. Nunca é gravado — é puramente de visualização (efêmero).
  const contextoOrigem = useMemo(() => {
    const pc = parseFloat(searchParams.get("ctxPc"));
    const pessoas = parseFloat(searchParams.get("ctxPessoas"));
    const nome = searchParams.get("ctxNome");
    if (pc > 0 && pessoas > 0 && nome) return { pc, pessoas, nome };
    return null;
  }, [searchParams]);
  const [porcoes, setPorcoes] = useState(null);
  const [quantidadeTotal, setQuantidadeTotal] = useState(null);
  const [pcLocal, setPcLocal] = useState(null);
  const [showAddIng, setShowAddIng] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMargin, setShowMargin] = useState(false);
  const [orderingByPrep, setOrderingByPrep] = useState(false);
  const [margem, setMargem] = useState(30);
  const [editingPrice, setEditingPrice] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingQtdId, setEditingQtdId] = useState(null);
  const [editingQtdValue, setEditingQtdValue] = useState("");
  const [editingIngId, setEditingIngId] = useState(null);
  const [ingSearch, setIngSearch] = useState("");
  const [pendingGrupo, setPendingGrupo] = useState(false);
  const [pendingGrupoTitulo, setPendingGrupoTitulo] = useState("");
  const [editingGrupoId, setEditingGrupoId] = useState(null);
  const [editingGrupoTitulo, setEditingGrupoTitulo] = useState("");
  const [convertingNAId, setConvertingNAId] = useState(null);
  const [convertingNATitulo, setConvertingNATitulo] = useState("");
  const [localFavoritando, setLocalFavoritando] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [pdpValue, setPdpValue] = useState("");
  const [editingPreparo, setEditingPreparo] = useState(false);
  const [preparoDraft, setPreparoDraft] = useState("");
  const [editingDescritivo, setEditingDescritivo] = useState(false);
  const [descritivoDraft, setDescritivoDraft] = useState("");
  const [editingNota, setEditingNota] = useState(false);
  const [notaDraft, setNotaDraft] = useState("");
  const [mostrarFC, setMostrarFC] = useState(false);
  const [mostrarMedidaCaseira, setMostrarMedidaCaseira] = useState(false);
  const [cadastrarMedidaIng, setCadastrarMedidaIng] = useState(null);
  const [editarMedidaMc, setEditarMedidaMc] = useState(null);
  const [editingMedidaId, setEditingMedidaId] = useState(null);
  const [medidaInputValue, setMedidaInputValue] = useState("");
  const [showMedidasReceita, setShowMedidasReceita] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEscalar, setShowEscalar] = useState(false);
  const [existingCopyWarning, setExistingCopyWarning] = useState(null);

  const { data: receita, isLoading: loadingReceita } = useQuery({
    queryKey: ["receita", id],
    queryFn: () => base44.entities.Receita.filter({ id }),
    select: (data) => data[0],
  });

  const { data: itens = [], isLoading: loadingItens } = useQuery({
    queryKey: ["itens-receita", id],
    queryFn: () => base44.entities.IngredienteReceita.filter({ receita_id: id }),
  });

  const { data: ingredientesDB = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
  });

  const { data: precosPersonalizados = {} } = useQuery({
    queryKey: ["precos-personalizados", user?.id],
    queryFn: () => buscarPrecosPersonalizados(user.id),
    enabled: !isAdmin && !!user?.id,
  });

  // Não-admins calculam o custo com o PRÓPRIO preço (quando personalizado);
  // admins sempre veem/gravam com o preço base do cadastro compartilhado.
  const ingredientesEfetivos = useMemo(
    () => (isAdmin ? ingredientesDB : aplicarPrecosPersonalizados(ingredientesDB, precosPersonalizados)),
    [ingredientesDB, isAdmin, precosPersonalizados]
  );

  const { data: receitasBasicas = [] } = useQuery({
    queryKey: ["receitas-basicas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "-nome"),
  });

  const { data: insumosReceita = [] } = useQuery({
    queryKey: ["insumos-receita", id],
    queryFn: () => base44.entities.InsumoReceita.filter({ receita_id: id }),
  });

  const { data: esquecidos = [] } = useQuery({
    queryKey: ["esquecidos-receita", id],
    queryFn: () => base44.entities.IngredienteEsquecidoReceita.filter({ receita_id: id }),
  });

  const { data: receitaTags = [] } = useQuery({
    queryKey: ["receita-tags", id],
    queryFn: () => base44.entities.ReceitaTag.filter({ receita_id: id }, "created_date", 200),
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => base44.entities.Tag.list("nome", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: medidasCaseiras = [] } = useQuery({
    queryKey: ["medidas-caseiras"],
    queryFn: () => base44.entities.MedidaCaseira.list("-created_date", 500),
    staleTime: 60 * 1000,
  });

  const { data: utensiliosPadrao = [] } = useQuery({
    queryKey: ["utensilios-padrao"],
    queryFn: () => base44.entities.UtensilioPadrao.list("simbolo", 200),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (receita && receita.rendimento_total > 0 && pdpValue === "") {
      setPdpValue(String(receita.rendimento_total));
    }
  }, [receita]);

  useEffect(() => {
    if (receita) setMostrarFC(!!receita.mostrar_fc);
  }, [receita]);

  useEffect(() => {
    if (receita) setMostrarMedidaCaseira(!!receita.mostrar_medida_caseira);
  }, [receita]);

  const handleToggleFC = async (val) => {
    setMostrarFC(val);
    const { receitaId } = await ensureEditavel();
    await base44.entities.Receita.update(receitaId, { mostrar_fc: val });
    registrarHistorico(receitaId, receita?.nome, ["Exibição FC"]);
  };

  const handleToggleMedidaCaseira = async (val) => {
    setMostrarMedidaCaseira(val);
    const { receitaId } = await ensureEditavel();
    await base44.entities.Receita.update(receitaId, { mostrar_medida_caseira: val });
    registrarHistorico(receitaId, receita?.nome, ["Medida caseira"]);
  };

  const handleToggleRevisar = async (val) => {
    const { receitaId } = await ensureEditavel();
    await base44.entities.Receita.update(receitaId, { revisar: val });
    qc.invalidateQueries({ queryKey: ["receita", receitaId] });
  };

  const handleSaveDescritivo = async () => {
    try {
      const { receitaId } = await ensureEditavel();
      await base44.entities.Receita.update(receitaId, { descritivo_menu: descritivoDraft });
      registrarHistorico(receitaId, receita?.nome, ["Descritivo"]);
      qc.invalidateQueries({ queryKey: ["receita", receitaId] });
      setEditingDescritivo(false);
      toast.success("Descritivo atualizado!");
    } catch (err) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    }
  };

  const handleSaveNota = async () => {
    try {
      const { receitaId } = await ensureEditavel();
      await base44.entities.Receita.update(receitaId, { nota: notaDraft });
      registrarHistorico(receitaId, receita?.nome, ["Nota"]);
      qc.invalidateQueries({ queryKey: ["receita", receitaId] });
      setEditingNota(false);
      toast.success("Nota atualizada!");
    } catch (err) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    }
  };

  const handleSavePDP = async (val) => {
    if (!isNaN(val) && val > 0) {
      const { receitaId } = await ensureEditavel();
      await base44.entities.Receita.update(receitaId, { rendimento_total: val });
      registrarHistorico(receitaId, receita?.nome, ["Rendimento"]);
      qc.invalidateQueries({ queryKey: ["receita", receitaId] });
      // Rendimento (PDP) é o peso real pós-cocção — nunca deve reescalonar os
      // ingredientes. Sincroniza a Quantidade Total do escalador com o novo
      // PDP imediatamente, mantendo fator = 1 (ingredientes preservados).
      setQuantidadeTotal(val);
      setPorcoes(pcLocal > 0 ? +(val / pcLocal).toFixed(2) : null);
      toast.success("Rendimento atualizado!");
    }
  };

  const handlePDPChange = (newPDP) => {
    const val = Math.max(1, Math.round(newPDP));
    setPdpValue(String(val));
    handleSavePDP(val);
  };

  // Soma bruta (sem escala) dos pesos líquidos de todos os ingredientes da receita —
  // usada para manter a Quantidade Total sempre refletindo a lista de ingredientes,
  // independente do PC Recomendado estar definido ou não.
  const somaIngredientesRaw = useMemo(() => {
    if (!receita) return 0;
    const porcoesBase = receita.porcoes_base || 1;
    return itens
      .filter((i) => i.tipo !== "grupo")
      .reduce((sum, i) => sum + (i.quantidade_por_porcao || 0) * porcoesBase, 0);
  }, [itens, receita]);

  // Per capita sugerido
  const perCapitaSugerido = useMemo(() => {
    if (!receita) return null;
    const cat = (receita.categorias || []).length > 0 ? receita.categorias[0] : (receita.categoria || "");
    const sug = sugerirPerCapita(receita.nome, cat);
    const info = getPerCapitaInfo(cat);
    return { g: sug, medida: info?.medida || "" };
  }, [receita]);

  // Estado inicial do escalador: DESCREVE a receita cadastrada (rendimento PDP + PC gravado),
  // nunca escala nada por conta própria.
  // Quantidade Total herda rendimento_total quando preenchido (>0); quando vazio/nulo/zero,
  // cai para o Peso Bruto (soma automática dos ingredientes) em vez de zerar.
  // Nº de Porções depende do PC estar definido — sem PC, fica em branco (null), nunca cai
  // para porcoes_base como valor "de mentira".
  const estadoInicialEscala = useMemo(() => {
    if (!receita) return null;
    const pcInit = receita.per_capita_g || perCapitaSugerido?.g || 0;
    const totalInit = receita.rendimento_total > 0 ? receita.rendimento_total : Math.round(somaIngredientesRaw);
    const porcoesInit = pcInit > 0 && totalInit > 0
      ? +(totalInit / pcInit).toFixed(2)
      : null;
    return { pc: pcInit, quantidadeTotal: totalInit, porcoes: porcoesInit };
  }, [receita, perCapitaSugerido, somaIngredientesRaw]);

  // Inicializa o escalador uma única vez (por abertura da ficha) com o estado inicial —
  // ou, se a ficha foi aberta a partir de um cardápio/evento, com o contexto de origem.
  useEffect(() => {
    if (estadoInicialEscala && pcLocal === null) {
      if (contextoOrigem) {
        setPcLocal(contextoOrigem.pc);
        setPorcoes(contextoOrigem.pessoas);
        setQuantidadeTotal(Math.round(contextoOrigem.pc * contextoOrigem.pessoas));
      } else {
        setPcLocal(estadoInicialEscala.pc);
        setQuantidadeTotal(estadoInicialEscala.quantidadeTotal);
        setPorcoes(estadoInicialEscala.porcoes);
      }
    }
  }, [estadoInicialEscala, pcLocal, contextoOrigem]);

  // Refs para ler os valores mais recentes de dentro do efeito de sincronização
  // abaixo, sem precisar recriá-lo a cada mudança de PC/Total (evita loop).
  const pcLocalRef = useRef(pcLocal);
  useEffect(() => { pcLocalRef.current = pcLocal; }, [pcLocal]);
  const quantidadeTotalRef = useRef(quantidadeTotal);
  useEffect(() => { quantidadeTotalRef.current = quantidadeTotal; }, [quantidadeTotal]);

  // Quantidade Total = soma dos pesos líquidos dos ingredientes, SEMPRE que a lista
  // mudar (adicionar, remover, editar peso) — incondicional, não depende do PC.
  // Só re-sincroniza automaticamente enquanto o total ainda reflete a soma natural
  // (ou a receita ainda não tem rendimento_total gravado, caso de receita nova);
  // uma vez escalado manualmente pelo usuário, para de sobrescrever.
  const prevRawTotalRef = useRef(null);
  useEffect(() => {
    if (!receita || pcLocal === null) return;
    const rawRounded = Math.round(somaIngredientesRaw);
    if (prevRawTotalRef.current === null) {
      prevRawTotalRef.current = rawRounded;
      if (!receita.rendimento_total && rawRounded > 0) {
        setQuantidadeTotal(rawRounded);
        setPorcoes(pcLocalRef.current > 0 ? +(rawRounded / pcLocalRef.current).toFixed(2) : null);
      }
      return;
    }
    if (rawRounded !== prevRawTotalRef.current) {
      const prevRaw = prevRawTotalRef.current;
      prevRawTotalRef.current = rawRounded;
      const wasTrackingNatural = quantidadeTotalRef.current === prevRaw || !receita.rendimento_total;
      if (wasTrackingNatural) {
        setQuantidadeTotal(rawRounded);
        setPorcoes(pcLocalRef.current > 0 ? +(rawRounded / pcLocalRef.current).toFixed(2) : null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [somaIngredientesRaw]);

  // PC Recomendado é um campo persistido da receita. Editá-lo NUNCA altera a
  // Quantidade Total (rendimento fixo da ficha) — apenas recalcula o Nº de
  // Porções (Quantidade Total ÷ PC) e grava o novo PC na receita.
  // Garante que a edição não recaia sobre o catálogo compartilhado: cria uma
  // cópia pessoal (fork) quando um não-admin edita uma receita is_base=true.
  const ensureEditavel = async () => {
    const result = await garantirReceitaEditavel({ receita, itens, receitaTags, isAdmin, userId: user?.id });
    if (result.blocked) {
      setExistingCopyWarning({ existingCopyId: result.existingCopyId });
      throw new Error("EXISTING_COPY_BLOCKED");
    }
    if (result.forked) {
      toast.success("Uma cópia editável desta receita foi criada para você.");
      navigate(`/receita/${result.receitaId}`, { replace: true });
    }
    return result;
  };

  const commitPC = async (newPC) => {
    const val = Math.max(1, Math.round(newPC));
    setPcLocal(val);
    const total = quantidadeTotal || 0;
    if (val > 0 && total > 0) setPorcoes(+(total / val).toFixed(2));
    try {
      const { receitaId } = await ensureEditavel();
      await base44.entities.Receita.update(receitaId, { per_capita_g: val });
      registrarHistorico(receitaId, receita?.nome, ["Per capita"]);
      qc.invalidateQueries({ queryKey: ["receita", receitaId] });
    } catch (err) {
      toast.error("Erro ao salvar PC recomendado: " + (err.message || ""));
    }
  };

  const commitPorcoes = (newPorcoes) => {
    const val = Math.max(1, Math.round(newPorcoes));
    setPorcoes(val);
    const pc = pcLocal || 0;
    if (pc > 0) setQuantidadeTotal(Math.round(val * pc));
  };

  // Quantidade Total é agora o único controle de reescala — edição aqui
  // sobrescreve PERMANENTEMENTE os pesos dos ingredientes e o rendimento
  // da receita (substitui o antigo botão "Ajustar peso total da receita").
  const commitTotalGrams = async (grams) => {
    const g = Math.max(0, Math.round(grams));
    const pc = pcLocal || 0;
    setQuantidadeTotal(g);
    setPorcoes(pc > 0 ? Math.max(0, Math.floor(g / pc)) : null);
    const baseTotal = receita?.rendimento_total || 0;
    if (baseTotal <= 0 || g === baseTotal) return;
    try {
      const { receitaId, mapItemId } = await ensureEditavel();
      const fatorRescale = g / baseTotal;
      const updates = itens
        .filter((i) => i.tipo !== "grupo")
        .map((i) => ({ id: mapItemId(i.id), quantidade_por_porcao: (i.quantidade_por_porcao || 0) * fatorRescale }));
      if (updates.length > 0) await base44.entities.IngredienteReceita.bulkUpdate(updates);
      await base44.entities.Receita.update(receitaId, { rendimento_total: g });
      registrarHistorico(receitaId, receita?.nome, ["Ingredientes", "Rendimento"]);
      qc.invalidateQueries({ queryKey: ["receita", receitaId] });
      qc.invalidateQueries({ queryKey: ["itens-receita", receitaId] });
      toast.success("Peso total ajustado — ingredientes recalculados!");
    } catch (err) {
      toast.error("Erro ao ajustar peso total: " + (err.message || ""));
    }
  };

  const handleRestaurarEscala = () => {
    if (!estadoInicialEscala) return;
    setPcLocal(estadoInicialEscala.pc);
    setQuantidadeTotal(estadoInicialEscala.quantidadeTotal);
    setPorcoes(estadoInicialEscala.porcoes);
  };

  const isEscalado = !!(estadoInicialEscala && Math.abs((quantidadeTotal || 0) - (estadoInicialEscala.quantidadeTotal || 0)) > 0.5);

  const handleSavePreparo = async () => {
    try {
      const { receitaId } = await ensureEditavel();
      await base44.entities.Receita.update(receitaId, { modo_preparo: preparoDraft });
      registrarHistorico(receitaId, receita?.nome, ["Modo de preparo"]);
      qc.invalidateQueries({ queryKey: ["receita", receitaId] });
      setEditingPreparo(false);
      toast.success("Modo de preparo atualizado!");
    } catch (err) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    }
  };

  const ingMap = useMemo(() => {
    const map = {};
    ingredientesEfetivos.forEach((i) => { map[i.id] = i; });
    return map;
  }, [ingredientesEfetivos]);

  const receitasBasicasMap = useMemo(() => {
    const map = {};
    receitasBasicas.forEach((r) => { map[r.id] = r; });
    return map;
  }, [receitasBasicas]);

  const uteMap = useMemo(() => {
    const map = {};
    utensiliosPadrao.forEach((u) => { map[u.id] = u; });
    return map;
  }, [utensiliosPadrao]);

  const medidaByIngrediente = useMemo(() => {
    const map = {};
    medidasCaseiras.forEach((mc) => {
      if (mc.alimento && !map[mc.alimento]) map[mc.alimento] = mc;
    });
    return map;
  }, [medidasCaseiras]);

  const getMedidaDisplay = (item) => {
    if (!item.ing) return null;
    const mc = medidaByIngrediente[item.ing.id];
    if (!mc) return null;
    const ute = uteMap[mc.utensilio];
    return converterGramasParaMedida(item.qtdNova, mc, ute);
  };

  const fator = receita && receita.rendimento_total > 0 && quantidadeTotal > 0 ? quantidadeTotal / receita.rendimento_total : 1;

  const temOrdemManual = useMemo(() => itens.some(i => (i.ordem || 0) > 0), [itens]);

  const itensFicha = useMemo(() => {
    return [...itens]
      .sort((a, b) => {
        if (temOrdemManual) return (a.ordem || 0) - (b.ordem || 0);
        // grupos vão para o topo quando sem ordem explícita
        if (a.tipo === "grupo" && b.tipo !== "grupo") return -1;
        if (a.tipo !== "grupo" && b.tipo === "grupo") return 1;
        return ((b.quantidade_por_porcao || 0) * (receita?.porcoes_base || 1) * fator)
             - ((a.quantidade_por_porcao || 0) * (receita?.porcoes_base || 1) * fator);
      })
      .map((item) => {
        if (item.tipo === "grupo") {
          return { ...item, isGrupo: true, custo: 0, qtdOriginal: 0, qtdNova: 0, qtdComprar: 0 };
        }
        if (item.tipo === "subreceita") {
          const rb = receitasBasicasMap[item.subreceita_id];
          const qtdOriginal = item.quantidade_por_porcao * (receita?.porcoes_base || 1);
          const qtdNova = item.quantidade_por_porcao * (receita?.porcoes_base || 1) * fator;
          // Subreceita line is a visual marker only — cost comes from exploded ingredients
          return { ...item, isSubreceita: true, receitaBase: rb, custo: 0, qtdOriginal, qtdNova, qtdComprar: qtdNova, isGrupo: false, isNA: false };
        }
        const ing = ingMap[item.ingrediente_id];
        const qtdOriginal = item.quantidade_por_porcao * (receita?.porcoes_base || 1);
        const qtdNova = qtdOriginal * fator;
        const fc = ing?.fator_correcao || 1;
        const qtdComprar = qtdNova * fc;
        const custo = qtdComprar * (ing?.preco_por_g_rs || 0);
        const isNA = !!(item.ingrediente_nome && item.ingrediente_nome.toUpperCase() === "N/A");
        const isChildOfSubreceita = !!item.subreceita_parent_id;
        return { ...item, ing, qtdOriginal, qtdNova, qtdComprar, custo, isGrupo: false, isNA, isChildOfSubreceita };
      });
  }, [itens, ingMap, fator, receita, temOrdemManual]);

  // Reagrupa: filhos explodidos ficam imediatamente abaixo do seu marcador
  const itensFichaAgrupada = useMemo(() => {
    const childrenByParent = {};
    itensFicha.forEach(item => {
      if (item.subreceita_parent_id) {
        if (!childrenByParent[item.subreceita_parent_id]) childrenByParent[item.subreceita_parent_id] = [];
        childrenByParent[item.subreceita_parent_id].push(item);
      }
    });
    const result = [];
    const seen = new Set();
    itensFicha.forEach(item => {
      if (seen.has(item.id) || item.subreceita_parent_id) return;
      result.push(item);
      seen.add(item.id);
      if (item.tipo === "subreceita" && childrenByParent[item.id]) {
        childrenByParent[item.id].forEach(child => {
          result.push(child);
          seen.add(child.id);
        });
      }
    });
    return result;
  }, [itensFicha]);

  const ingredientesParaMedidas = useMemo(() =>
    itensFichaAgrupada.filter(i => i.ing && !i.isGrupo),
    [itensFichaAgrupada]
  );

  // Build movement blocks: grupo = block header (absorbs all following items until next grupo),
  // subreceita = marker + children, loose items = single-entry blocks
  const blocos = useMemo(() => {
    const items = itensFichaAgrupada;
    const blocks = [];
    let i = 0;
    while (i < items.length) {
      if (items[i].tipo === "grupo") {
        const entries = [{ item: items[i], idx: i }];
        let j = i + 1;
        while (j < items.length && items[j].tipo !== "grupo") {
          entries.push({ item: items[j], idx: j });
          j++;
        }
        blocks.push({ entries, startIdx: i });
        i = j;
      } else if (items[i].tipo === "subreceita" && !items[i].subreceita_parent_id) {
        const entries = [{ item: items[i], idx: i }];
        let j = i + 1;
        while (j < items.length && items[j].subreceita_parent_id === items[i].id) {
          entries.push({ item: items[j], idx: j });
          j++;
        }
        blocks.push({ entries, startIdx: i });
        i = j;
      } else {
        blocks.push({ entries: [{ item: items[i], idx: i }], startIdx: i });
        i++;
      }
    }
    return blocks;
  }, [itensFichaAgrupada]);

  const temSubreceitas = useMemo(
    () => itensFichaAgrupada.some(i => i.tipo === "subreceita" && !i.subreceita_parent_id && i.subreceita_id),
    [itensFichaAgrupada]
  );
  const blocosCompostos = useMemo(
    () => temSubreceitas && receita ? calcularModoPreparoComposto(itensFichaAgrupada, receitasBasicasMap, receita.modo_preparo) : [],
    [temSubreceitas, itensFichaAgrupada, receitasBasicasMap, receita]
  );

  const findBlocoIdx = (idx) => {
    for (let b = 0; b < blocos.length; b++) {
      if (idx >= blocos[b].startIdx && idx < blocos[b].startIdx + blocos[b].entries.length) return b;
    }
    return -1;
  };

  const pesoBruto = itensFicha.filter(i => !i.isGrupo).reduce((sum, i) => sum + (i.qtdNova || 0), 0);
  const custoIngredientes = itensFicha.reduce((sum, i) => sum + i.custo, 0);
  const custoInsumos = insumosReceita.reduce((sum, i) => sum + (i.custo_total || 0), 0);
  const custoEsquecidos = esquecidos.reduce((sum, i) => sum + ((i.custo_total || 0) * fator), 0);
  const custoTotal = custoIngredientes + custoInsumos + custoEsquecidos;
  const custoPorcao = (porcoes || 1) > 0 ? custoTotal / (porcoes || 1) : 0;

  // Save costs to recipe (apenas admin grava no catálogo compartilhado;
  // não-admins veem o custo calculado normalmente, mas não persistem no original)
  useEffect(() => {
    if (isAdmin && receita && fator === 1 && custoTotal > 0) {
      const newCT = parseFloat(custoTotal.toFixed(2));
      const newCP = parseFloat(custoPorcao.toFixed(2));
      const newCI = parseFloat(custoInsumos.toFixed(2));
      if (newCT !== receita.custo_total || newCP !== receita.custo_por_porcao || newCI !== (receita.custo_insumos || 0)) {
        base44.entities.Receita.update(id, { custo_total: newCT, custo_por_porcao: newCP, custo_insumos: newCI });
      }
    }
  }, [custoTotal, custoPorcao, custoInsumos, receita, fator, id]);

  const updatePriceMut = useMutation({
    mutationFn: async ({ ingId, preco_embalagem_rs, peso_embalagem_g }) => {
      const preco_por_g_rs = peso_embalagem_g > 0 ? preco_embalagem_rs / peso_embalagem_g : 0;
      if (!isAdmin) {
        await salvarPrecoPersonalizado({ ingredienteId: ingId, userId: user.id, precoPorGRs: preco_por_g_rs });
        return;
      }
      await base44.entities.Ingrediente.update(ingId, { preco_embalagem_rs, peso_embalagem_g, preco_por_g_rs });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      qc.invalidateQueries({ queryKey: ["precos-personalizados"] });
      setEditingPrice(null);
      toast.success(isAdmin ? "Preço atualizado em todas as receitas!" : "Seu preço pessoal foi salvo!");
    },
  });

  const updateQtdMut = useMutation({
    mutationFn: async ({ itemId, quantidade_por_porcao }) => {
      const { receitaId, mapItemId } = await ensureEditavel();
      await base44.entities.IngredienteReceita.update(mapItemId(itemId), { quantidade_por_porcao });
      return receitaId;
    },
    onSuccess: (receitaId) => {
      registrarHistorico(receitaId, receita?.nome, ["Ingredientes"]);
      qc.invalidateQueries({ queryKey: ["itens-receita", receitaId] });
      setEditingQtdId(null);
    },
  });

  const updateFCMut = useMutation({
    mutationFn: async ({ ingId, fator_correcao }) => {
      await base44.entities.Ingrediente.update(ingId, { fator_correcao });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      toast.success("Fator de correção atualizado em todas as receitas!");
    },
  });

  const updateItemMut = useMutation({
    mutationFn: async ({ itemId, quantidade_por_porcao, pre_preparo, ingrediente_id, ingrediente_nome }) => {
      const updates = { quantidade_por_porcao, pre_preparo };
      if (ingrediente_id) {
        updates.ingrediente_id = ingrediente_id;
        updates.ingrediente_nome = ingrediente_nome;
      }
      const { receitaId, mapItemId } = await ensureEditavel();
      await base44.entities.IngredienteReceita.update(mapItemId(itemId), updates);
      return receitaId;
    },
    onSuccess: (receitaId) => {
      registrarHistorico(receitaId, receita?.nome, ["Ingredientes"]);
      qc.invalidateQueries({ queryKey: ["itens-receita", receitaId] });
      setEditingItem(null);
      toast.success("Item atualizado");
    },
  });

  const updateOrdemMut = useMutation({
    mutationFn: async ({ itemId, ordem }) => {
      await base44.entities.IngredienteReceita.update(itemId, { ordem });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
    },
  });

  const replaceIngMut = useMutation({
    mutationFn: async ({ itemId, newIngredienteId, newIngredienteNome }) => {
      await base44.entities.IngredienteReceita.update(itemId, {
        tipo: "ingrediente",
        ingrediente_id: newIngredienteId,
        ingrediente_nome: newIngredienteNome,
        subreceita_id: "",
        subreceita_nome: "",
      });
    },
    onSuccess: () => {
      registrarHistorico(id, receita?.nome, ["Ingredientes"]);
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      setEditingIngId(null);
      setIngSearch("");
      toast.success("Ingrediente substituído");
    },
  });

  const replaceWithSubreceitaMut = useMutation({
    mutationFn: async ({ itemId, receitaId, receitaNome }) => {
      await base44.entities.IngredienteReceita.update(itemId, {
        tipo: "subreceita",
        ingrediente_id: "",
        ingrediente_nome: "",
        subreceita_id: receitaId,
        subreceita_nome: receitaNome,
      });
    },
    onSuccess: () => {
      registrarHistorico(id, receita?.nome, ["Ingredientes"]);
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      setEditingIngId(null);
      setIngSearch("");
      toast.success("Substituído por sub-receita");
    },
  });

  const addGrupoMut = useMutation({
    mutationFn: async (titulo) => {
      const maxOrdem = itens.reduce((max, i) => Math.max(max, i.ordem || 0), 0);
      await base44.entities.IngredienteReceita.create({
        receita_id: id,
        tipo: "grupo",
        titulo_grupo: titulo,
        ordem: maxOrdem + 10,
      });
    },
    onSuccess: () => {
      registrarHistorico(id, receita?.nome, ["Ingredientes"]);
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      setPendingGrupo(false);
      setPendingGrupoTitulo("");
    },
  });

  const convertToGrupoMut = useMutation({
    mutationFn: async ({ itemId, titulo }) => {
      const maxOrdem = itens.reduce((max, i) => Math.max(max, i.ordem || 0), 0);
      await base44.entities.IngredienteReceita.delete(itemId);
      await base44.entities.IngredienteReceita.create({
        receita_id: id,
        tipo: "grupo",
        titulo_grupo: titulo,
        ordem: maxOrdem + 10,
      });
    },
    onSuccess: () => {
      registrarHistorico(id, receita?.nome, ["Ingredientes"]);
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      setConvertingNAId(null);
      setConvertingNATitulo("");
      toast.success("Convertido para sub-título");
    },
  });

  const updateGrupoMut = useMutation({
    mutationFn: async ({ itemId, titulo }) => {
      await base44.entities.IngredienteReceita.update(itemId, { titulo_grupo: titulo });
    },
    onSuccess: () => {
      registrarHistorico(id, receita?.nome, ["Ingredientes"]);
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      setEditingGrupoId(null);
    },
  });

  const deleteItemOrGrupoMut = useMutation({
    mutationFn: async (itemId) => {
      const { receitaId, mapItemId, forked } = await ensureEditavel();
      if (forked) return receitaId; // cópia criada com o item intacto; exclusão deve ser repetida na cópia
      await base44.entities.IngredienteReceita.delete(mapItemId(itemId));
      return receitaId;
    },
    onSuccess: (receitaId) => {
      registrarHistorico(receitaId, receita?.nome, ["Ingredientes"]);
      qc.invalidateQueries({ queryKey: ["itens-receita", receitaId] });
      toast.success("Item removido");
    },
  });

  const deleteSubreceitaMut = useMutation({
    mutationFn: async (itemId) => {
      await base44.entities.IngredienteReceita.deleteMany({ subreceita_parent_id: itemId });
      await base44.entities.IngredienteReceita.delete(itemId);
    },
    onSuccess: () => {
      registrarHistorico(id, receita?.nome, ["Ingredientes"]);
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      toast.success("Sub-receita e ingredientes removidos");
    },
  });

  const duplicarReceitaMut = useMutation({
    mutationFn: async () => {
      const { id: _id, created_date, updated_date, created_by_id, ...rest } = receita;
      const nova = await base44.entities.Receita.create({ ...rest, nome: `${receita.nome} (cópia)` });
      for (const item of itens) {
        const { id: iid, created_date: cd, updated_date: ud, created_by_id: cb, ...irest } = item;
        await base44.entities.IngredienteReceita.create({ ...irest, receita_id: nova.id });
      }
      return nova;
    },
    onSuccess: (nova) => {
      toast.success("Receita duplicada!");
      navigate(`/receita/${nova.id}`);
    },
  });

  const deleteReceitaMut = useMutation({
    mutationFn: async () => {
      const ings = await base44.entities.IngredienteReceita.filter({ receita_id: id });
      for (const ing of ings) await base44.entities.IngredienteReceita.delete(ing.id);
      return base44.entities.Receita.delete(id);
    },
    onSuccess: () => {
      toast.success("Receita excluída!");
      navigate("/receitas");
    },
  });

  const handleMove = async (idx, dir) => {
    const items = itensFichaAgrupada;
    const item = items[idx];
    if (!item) return;
    if (dir < 0 && idx === 0) return;
    if (dir > 0 && idx >= items.length - 1) return;

    // If no manual order exists yet, initialize ALL items with sequential ordem first
    if (!temOrdemManual) {
      await base44.entities.IngredienteReceita.bulkUpdate(
        items.map((it, i) => ({ id: it.id, ordem: i * 10 }))
      );
    }

    // Child: only move within its sibling group
    if (item.subreceita_parent_id) {
      const parentId = item.subreceita_parent_id;
      const sibIdxs = [];
      items.forEach((it, i) => { if (it.subreceita_parent_id === parentId) sibIdxs.push(i); });
      const localIdx = sibIdxs.indexOf(idx);
      const targetLocalIdx = localIdx + dir;
      if (targetLocalIdx < 0 || targetLocalIdx >= sibIdxs.length) return;
      const targetIdx = sibIdxs[targetLocalIdx];
      await base44.entities.IngredienteReceita.bulkUpdate([
        { id: items[idx].id, ordem: targetIdx * 10 },
        { id: items[targetIdx].id, ordem: idx * 10 },
      ]);
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      toast.success("Ordem alterada");
      return;
    }

    // Grupo header: move entire section (all items until next grupo) via pre-computed blocos
    if (item.isGrupo) {
      const blockIdx = findBlocoIdx(idx);
      if (blockIdx === -1) return;
      const targetBlockIdx = blockIdx + dir;
      if (targetBlockIdx < 0 || targetBlockIdx >= blocos.length) return;

      const blockA = blocos[blockIdx];
      const blockB = blocos[targetBlockIdx];
      const firstBlock = dir < 0 ? blockA : blockB;
      const secondBlock = dir < 0 ? blockB : blockA;
      const baseIdx = Math.min(blockA.startIdx, blockB.startIdx);
      const updates = [];
      for (let k = 0; k < firstBlock.entries.length; k++) {
        updates.push({ id: firstBlock.entries[k].item.id, ordem: (baseIdx + k) * 10 });
      }
      for (let k = 0; k < secondBlock.entries.length; k++) {
        updates.push({ id: secondBlock.entries[k].item.id, ordem: (baseIdx + firstBlock.entries.length + k) * 10 });
      }
      await base44.entities.IngredienteReceita.bulkUpdate(updates);
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      toast.success("Ordem alterada");
      return;
    }

    // Sub-receita marker or regular ingredient: treat as atomic block, swap with adjacent block
    // Atomic block = sub-receita marker + its children, or a single regular ingredient
    const getAtomicBlock = (startIdx) => {
      const it = items[startIdx];
      if (it.isSubreceita || it.subreceita_parent_id) {
        const parentId = it.subreceita_parent_id || it.id;
        const markerIdx = it.subreceita_parent_id
          ? items.findIndex(x => x.id === parentId)
          : startIdx;
        const entries = [{ item: items[markerIdx], idx: markerIdx }];
        let j = markerIdx + 1;
        while (j < items.length && items[j].subreceita_parent_id === parentId) {
          entries.push({ item: items[j], idx: j });
          j++;
        }
        return { entries, startIdx: markerIdx, endIdx: j };
      }
      return { entries: [{ item: it, idx: startIdx }], startIdx, endIdx: startIdx + 1 };
    };

    const sourceBlock = getAtomicBlock(idx);
    let targetIdx = dir < 0 ? sourceBlock.startIdx - 1 : sourceBlock.endIdx;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const targetItem = items[targetIdx];
    if (targetItem.isGrupo) return; // can't cross grupo boundary
    // If target is a sub-receita child, resolve to its marker (jump the whole block)
    if (targetItem.subreceita_parent_id) {
      const markerIdx = items.findIndex(x => x.id === targetItem.subreceita_parent_id);
      if (markerIdx === -1) return;
      targetIdx = markerIdx;
    }

    const targetBlock = getAtomicBlock(targetIdx);
    const firstBlock = dir < 0 ? sourceBlock : targetBlock;
    const secondBlock = dir < 0 ? targetBlock : sourceBlock;
    const baseIdx = Math.min(sourceBlock.startIdx, targetBlock.startIdx);
    const updates = [];
    firstBlock.entries.forEach((e, k) => updates.push({ id: e.item.id, ordem: (baseIdx + k) * 10 }));
    secondBlock.entries.forEach((e, k) => updates.push({ id: e.item.id, ordem: (baseIdx + firstBlock.entries.length + k) * 10 }));
    await base44.entities.IngredienteReceita.bulkUpdate(updates);
    qc.invalidateQueries({ queryKey: ["itens-receita", id] });
    toast.success("Ordem alterada");
  };

  const handleDragEnd = async (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const items = itensFichaAgrupada;
    const sourceIdx = result.source.index;
    const destIdx = result.destination.index;
    const dragged = items[sourceIdx];
    if (!dragged) return;

    // Initialize ordem if needed
    if (!temOrdemManual) {
      await base44.entities.IngredienteReceita.bulkUpdate(
        items.map((it, i) => ({ id: it.id, ordem: i * 10 }))
      );
    }

    // Compute block to move: grupo = section until next grupo, subreceita = marker + children, else single
    let blockStart, blockEnd;
    if (dragged.isGrupo) {
      blockStart = sourceIdx;
      blockEnd = sourceIdx + 1;
      while (blockEnd < items.length && !items[blockEnd].isGrupo) blockEnd++;
    } else if (dragged.isSubreceita) {
      blockStart = sourceIdx;
      blockEnd = sourceIdx + 1;
      while (blockEnd < items.length && items[blockEnd].subreceita_parent_id === dragged.id) blockEnd++;
    } else {
      blockStart = sourceIdx;
      blockEnd = sourceIdx + 1;
    }

    const blockItems = items.slice(blockStart, blockEnd);
    const remaining = items.slice(0, blockStart).concat(items.slice(blockEnd));

    // Adjust destination for removed block
    let adjustedDest = destIdx >= blockEnd ? destIdx - blockItems.length : destIdx;
    adjustedDest = Math.max(0, Math.min(adjustedDest, remaining.length));

    // Prevent dropping inside a sub-receita's children — snap after the block
    if (adjustedDest > 0 && adjustedDest < remaining.length) {
      const after = remaining[adjustedDest];
      const before = remaining[adjustedDest - 1];
      if (after && after.subreceita_parent_id && (!before || before.id !== after.subreceita_parent_id)) {
        let snap = adjustedDest;
        while (snap < remaining.length && remaining[snap].subreceita_parent_id === after.subreceita_parent_id) snap++;
        adjustedDest = snap;
      }
    }

    const newOrder = [
      ...remaining.slice(0, adjustedDest),
      ...blockItems,
      ...remaining.slice(adjustedDest)
    ];

    const updates = newOrder.map((it, i) => ({ id: it.id, ordem: i * 10 }));
    await base44.entities.IngredienteReceita.bulkUpdate(updates);
    qc.invalidateQueries({ queryKey: ["itens-receita", id] });
    toast.success("Ordem alterada");
  };

  const handleOrderByPrep = async () => {
    if (!receita?.modo_preparo) {
      toast.error("A receita não tem modo de preparo descrito.");
      return;
    }
    setOrderingByPrep(true);
    try {
      // Only reorder existing non-group items — never create or delete
      const nonGroup = [];
      const groupPositions = [];
      itens.forEach((item, idx) => {
        if (item.tipo === "grupo") {
          groupPositions.push({ ...item, idx });
        } else {
          const nome = item.ingrediente_nome || item.subreceita_nome || "";
          if (nome) nonGroup.push({ ...item, idx, nome });
        }
      });

      if (nonGroup.length === 0) { setOrderingByPrep(false); return; }

      const ingNames = nonGroup.map((ng, i) => `ID:${i} — ${ng.nome}`).join("\n");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise o modo de preparo abaixo e devolva os IDs na ordem em que cada ingrediente aparece pela PRIMEIRA vez no texto.

Modo de preparo:
${receita.modo_preparo}

Ingredientes:
${ingNames}

REGRAS:
- Retorne APENAS os IDs dos ingredientes que REALMENTE aparecem na lista acima, na nova ordem.
- NUNCA invente ingredientes novos — use apenas os IDs fornecidos.
- Ingredientes NÃO mencionados no modo de preparo: coloque no FINAL do array.
- Se um ingrediente do modo de preparo não estiver na lista fornecida, IGNORE — não invente um ID.`,
        response_json_schema: {
          type: "object",
          properties: {
            ids_ordenados: {
              type: "array",
              items: { type: "number" },
              description: "Array com os IDs (números) na nova ordem. Apenas IDs da lista fornecida."
            }
          }
        }
      });

      const orderedIds = (result.ids_ordenados || []).map(Number);
      if (orderedIds.length === 0) {
        toast.error("Não foi possível determinar a ordem dos ingredientes.");
        setOrderingByPrep(false);
        return;
      }

      // Map IDs back to items, skipping any ID that doesn't match
      const reordered = [];
      const usedIds = new Set();
      for (const id of orderedIds) {
        const match = nonGroup.find(ng => ng.idx === id);
        if (match && !usedIds.has(match.id)) {
          reordered.push(match);
          usedIds.add(match.id);
        }
      }
      // Append any remaining nonGroup items not included by the LLM
      for (const ng of nonGroup) {
        if (!usedIds.has(ng.id)) reordered.push(ng);
      }

      // Interleave groups based on their original position relative to ingredients
      const finalOrder = [];
      let ri = 0;
      for (const gp of groupPositions) {
        while (ri < reordered.length && reordered[ri].idx < gp.idx) {
          finalOrder.push(reordered[ri]);
          ri++;
        }
        finalOrder.push(gp);
      }
      while (ri < reordered.length) {
        finalOrder.push(reordered[ri]);
        ri++;
      }

      // Only update ordem — never touch name, quantity, or cost
      for (let i = 0; i < finalOrder.length; i++) {
        await base44.entities.IngredienteReceita.update(finalOrder[i].id, { ordem: i * 10 });
      }

      registrarHistorico(id, receita?.nome, ["Ingredientes"]);
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      toast.success("Ingredientes ordenados conforme o modo de preparo. Ajuste manualmente se necessário.");
    } catch (err) {
      toast.error("Erro ao ordenar: " + err.message);
    } finally {
      setOrderingByPrep(false);
    }
  };

  const handleConfirmQtd = (itemId) => {
    const val = parseFloat(editingQtdValue);
    if (!isNaN(val) && val >= 0) {
      const baseTotal = (receita?.porcoes_base || 1) * fator;
      updateQtdMut.mutate({ itemId, quantidade_por_porcao: baseTotal > 0 ? val / baseTotal : val });
    }
  };

  // FC column visibility controlled by mostrarFC toggle

  const formatCurrency = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const formatCustoItem = (item) => {
    if (!item.ing || !item.ing.preco_por_g_rs || item.ing.preco_por_g_rs === 0) {
      return { text: "R$ 0,00", className: "text-orange-600 font-semibold" };
    }
    if (item.custo > 0 && item.custo < 0.01) {
      return { text: `R$ ${item.custo.toFixed(4).replace(".", ",")}`, className: "text-primary" };
    }
    return { text: formatCurrency(item.custo), className: "text-primary" };
  };
  const formatWeight = (g, unit) => {
    if (unit === "ml") return g >= 1000 ? `${(g / 1000).toFixed(2).replace(".", ",")} lt` : `${g.toFixed(0)} ml`;
    return g >= 1000 ? `${(g / 1000).toFixed(2).replace(".", ",")} kg` : `${g.toFixed(0)} g`;
  };

  if (loadingReceita) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!receita) {
    return <div className="text-center py-20"><p>Receita não encontrada</p><Link to="/receitas" className="text-primary underline mt-2 inline-block">Voltar</Link></div>;
  }

  const precoVenda = showMargin ? custoPorcao / (1 - margem / 100) : 0;
  const passos = formatarModoPreparo(receita?.modo_preparo);

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      {/* Header + Photo */}
      <div className="flex items-start gap-0">
        {/* Left block */}
        <div className="flex-1 min-w-0 space-y-2 pr-3">
          {/* Line 1: Name + actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display text-xl font-bold truncate">{receita.nome}</h1>
            <button
              onClick={async () => {
                if (localFavoritando) return;
                setLocalFavoritando(true);
                try {
                  const { receitaId } = await ensureEditavel();
                  await base44.entities.Receita.update(receitaId, { favorita: !receita.favorita });
                  qc.invalidateQueries({ queryKey: ["receita", receitaId] });
                } finally {
                  setLocalFavoritando(false);
                }
              }}
              disabled={localFavoritando}
              className={`p-1.5 rounded-full hover:bg-muted shrink-0 ${localFavoritando ? "opacity-50" : ""}`}
              title={receita.favorita ? "Remover das favoritas" : "Marcar como favorita"}
            >
              <Star className={`w-5 h-5 ${receita.favorita ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
            </button>
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => duplicarReceitaMut.mutate()} disabled={duplicarReceitaMut.isPending}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Duplicar receita
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir receita
            </Button>
          </div>
          {/* Line 2: Categories + base info */}
          <div className="flex items-center gap-2 flex-wrap">
            {(receita.categorias || []).length > 0 ? (
              receita.categorias.map(cat => (
                <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
              ))
            ) : receita.categoria ? (
              <Badge variant="secondary">{receita.categoria}</Badge>
            ) : null}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/50">
              <Switch checked={!!receita.revisar} onCheckedChange={handleToggleRevisar} className="scale-90" />
              <span className={`text-xs font-medium ${receita.revisar ? "text-amber-700" : "text-muted-foreground"}`}>A revisar</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md hover:bg-muted/50 transition-colors"
                  title="Clique para alterar a cor"
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                    style={{ backgroundColor: getCorHex(receita.cor_predominante) }}
                  />
                  <span className="text-xs text-muted-foreground">{getCorLabelCompleto(receita.cor_predominante)}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <p className="text-xs font-medium text-muted-foreground mb-2">Cor predominante do prato</p>
                <CorPredominantePicker
                  value={receita.cor_predominante}
                  onChange={async (val) => {
                    const { receitaId } = await ensureEditavel();
                    await base44.entities.Receita.update(receitaId, { cor_predominante: val });
                    registrarHistorico(receitaId, receita?.nome, ["Cor predominante"]);
                    qc.invalidateQueries({ queryKey: ["receita", receitaId] });
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          {/* Line 3: Tags */}
          <TagList
            receitaTags={receitaTags}
            allTags={allTags}
            onRemove={async (rt) => {
              const { receitaId, mapTagId } = await ensureEditavel();
              await base44.entities.ReceitaTag.delete(mapTagId(rt.id));
              qc.invalidateQueries({ queryKey: ["receita-tags", receitaId] });
            }}
          />
          <div className="flex items-center gap-1.5">
            <TagSelector
              selectedIds={receitaTags.map(rt => rt.tag_id)}
              onToggle={async (tag) => {
                const { receitaId, mapTagId } = await ensureEditavel();
                const exists = receitaTags.find(rt => rt.tag_id === tag.id);
                if (exists) {
                  await base44.entities.ReceitaTag.delete(mapTagId(exists.id));
                } else {
                  await base44.entities.ReceitaTag.create({
                    receita_id: receitaId,
                    tag_id: tag.id,
                    tag_nome: tag.nome,
                    tag_grupo: tag.grupo,
                    tag_cor: tag.cor,
                  });
                }
                qc.invalidateQueries({ queryKey: ["receita-tags", receitaId] });
              }}
            />
          </div>
        </div>
        {/* Right block: Photo */}
        {receita.foto_url ? (
          <button
            onClick={() => setShowLightbox(true)}
            className="shrink-0 w-[120px] h-[120px] md:w-[200px] md:h-[160px] rounded-lg overflow-hidden bg-muted shadow-sm hover:opacity-90 transition-opacity"
          >
            <img src={receita.foto_url} alt={receita.nome} className="w-full h-full object-cover" />
          </button>
        ) : (
          <label
            className="shrink-0 w-[120px] h-[120px] md:w-[200px] md:h-[160px] rounded-lg bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/40 hover:bg-muted/80 transition-colors cursor-pointer"
            title="Adicionar foto"
          >
            <Camera className="w-8 h-8 text-muted-foreground/60" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                  const { file_url } = await base44.integrations.Core.UploadFile({ file });
                  const { receitaId } = await ensureEditavel();
                  await base44.entities.Receita.update(receitaId, { foto_url: file_url });
                  registrarHistorico(receitaId, receita?.nome, ["Foto"]);
                  qc.invalidateQueries({ queryKey: ["receita", receitaId] });
                  toast.success("Foto adicionada!");
                } catch {
                  toast.error("Erro ao enviar foto");
                }
              }}
            />
          </label>
        )}
      </div>

      {/* Selo de contexto: ficha aberta a partir de um cardápio/evento */}
      {contextoOrigem && isEscalado && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5 w-fit">
          <Scale className="w-3.5 h-3.5" />
          escalado para {contextoOrigem.nome} · {contextoOrigem.pessoas} pessoas
        </div>
      )}

      {/* Escalador da receita: PC × Porções = Total */}
      <EscaladorReceita
        pc={pcLocal || 0}
        porcoes={porcoes}
        quantidadeTotalG={quantidadeTotal}
        onChangePC={commitPC}
        onChangePorcoes={commitPorcoes}
        onChangeTotalG={commitTotalGrams}
        isEscalado={isEscalado}
        onRestore={handleRestaurarEscala}
      />
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowEscalar(true)}>
          <Scale className="w-3.5 h-3.5 mr-1" /> Escalar receita
        </Button>
      </div>
      {/* Ingredients table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold">Ingredientes</h2>
          <div className="flex gap-1 flex-wrap">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
              <Switch checked={mostrarFC} onCheckedChange={handleToggleFC} className="scale-90" />
              <span className="text-xs text-muted-foreground font-medium">FC</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
              <Switch checked={mostrarMedidaCaseira} onCheckedChange={handleToggleMedidaCaseira} className="scale-90" />
              <span className="text-xs text-muted-foreground font-medium">Medida caseira</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setPendingGrupo(true)}>
              <Plus className="w-4 h-4 mr-1" /> Sub-título
            </Button>
            <Button size="sm" onClick={async () => { const { forked } = await ensureEditavel(); if (!forked) setShowAddIng(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Ingrediente
            </Button>
          </div>
        </div>

        {loadingItens ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : itensFichaAgrupada.filter(i => !i.isGrupo && !i.isNA).length === 0 && itensFichaAgrupada.filter(i => i.isGrupo || i.isNA).length === 0 && !pendingGrupo ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>Nenhum ingrediente adicionado</p>
            <Button size="sm" className="mt-3" onClick={async () => { const { forked } = await ensureEditavel(); if (!forked) setShowAddIng(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar ingrediente
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            <TabelaIngredientesReceita
              itens={itensFichaAgrupada}
              receita={receita}
              fator={fator}
              mostrarFC={mostrarFC}
              mostrarMedidaCaseira={mostrarMedidaCaseira}
              blocos={blocos}
              findBlocoIdx={findBlocoIdx}
              medidaByIngrediente={medidaByIngrediente}
              uteMap={uteMap}
              getMedidaDisplay={getMedidaDisplay}
              editingQtdId={editingQtdId}
              editingQtdValue={editingQtdValue}
              setEditingQtdId={setEditingQtdId}
              setEditingQtdValue={setEditingQtdValue}
              handleConfirmQtd={handleConfirmQtd}
              editingIngId={editingIngId}
              ingSearch={ingSearch}
              setEditingIngId={setEditingIngId}
              setIngSearch={setIngSearch}
              ingredientesDB={ingredientesDB}
              receitasBasicas={receitasBasicas}
              replaceIngMut={replaceIngMut}
              replaceWithSubreceitaMut={replaceWithSubreceitaMut}
              editingGrupoId={editingGrupoId}
              editingGrupoTitulo={editingGrupoTitulo}
              setEditingGrupoId={setEditingGrupoId}
              setEditingGrupoTitulo={setEditingGrupoTitulo}
              updateGrupoMut={updateGrupoMut}
              convertingNAId={convertingNAId}
              convertingNATitulo={convertingNATitulo}
              setConvertingNAId={setConvertingNAId}
              setConvertingNATitulo={setConvertingNATitulo}
              convertToGrupoMut={convertToGrupoMut}
              editingMedidaId={editingMedidaId}
              medidaInputValue={medidaInputValue}
              setEditingMedidaId={setEditingMedidaId}
              setMedidaInputValue={setMedidaInputValue}
              updateQtdMut={updateQtdMut}
              setCadastrarMedidaIng={setCadastrarMedidaIng}
              setEditarMedidaMc={setEditarMedidaMc}
              setEditingItem={setEditingItem}
              deleteItemOrGrupoMut={deleteItemOrGrupoMut}
              deleteSubreceitaMut={deleteSubreceitaMut}
              updateFCMut={updateFCMut}
              handleMove={handleMove}
              handleDragEnd={handleDragEnd}
              formatWeight={formatWeight}
              formatCustoItem={formatCustoItem}
            />

            {pendingGrupo && (
              <div className="flex items-stretch gap-0.5">
                <div className="flex items-center justify-center w-8 min-h-[32px] shrink-0" title="Arraste disponível após salvar">
                  <GripVertical className="w-4 h-4 text-muted-foreground/20" />
                </div>
                <Card className="p-3 bg-primary/20 border-primary/40 border-dashed flex-1">
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-9 text-sm font-bold flex-1"
                      value={pendingGrupoTitulo}
                      onChange={(e) => setPendingGrupoTitulo(e.target.value.toUpperCase())}
                      placeholder="Digite o nome do sub-título..."
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && pendingGrupoTitulo.trim()) {
                          addGrupoMut.mutate(pendingGrupoTitulo.trim().toUpperCase());
                        }
                        if (e.key === "Escape") { setPendingGrupo(false); setPendingGrupoTitulo(""); }
                      }}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      if (pendingGrupoTitulo.trim()) addGrupoMut.mutate(pendingGrupoTitulo.trim().toUpperCase());
                      else { setPendingGrupo(false); setPendingGrupoTitulo(""); }
                    }} title="Salvar sub-título">
                      <Check className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setPendingGrupo(false); setPendingGrupoTitulo(""); }} title="Cancelar">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pesos */}
      <Card className="p-4">
        <h3 className="font-display text-sm font-bold mb-3">Pesos</h3>
        {(() => {
          const pdpNum = parseFloat(pdpValue) || 0;
          let perdaText = "—";
          let perdaClass = "text-muted-foreground";
          let perdaTitle = "Pese a preparação pronta e registre o PDP para calcular a perda";
          if (pdpNum > 0 && pesoBruto > 0) {
            if (pdpNum > pesoBruto) {
              const pct = ((pdpNum - pesoBruto) / pesoBruto) * 100;
              perdaText = `Ganho: +${pct.toFixed(1).replace(".", ",")}%`;
              perdaClass = "text-blue-600";
              perdaTitle = "PDP = Peso Depois de Pronto. Ganho indica hidratação na cocção.";
            } else {
              const pct = ((pesoBruto - pdpNum) / pesoBruto) * 100;
              perdaText = `Perda: ${pct.toFixed(1).replace(".", ",")}%`;
              perdaClass = "text-primary";
              perdaTitle = "PDP = Peso Depois de Pronto. A % Perda identifica receitas com rendimento muito abaixo do esperado.";
            }
          }
          return (
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Peso Bruto:</span>
                <span className="font-medium">{pesoBruto.toLocaleString("pt-BR")} g</span>
              </div>
              <span className="text-muted-foreground">|</span>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Rendimento (PDP):</span>
                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => handlePDPChange((receita.rendimento_total || 0) - 50)}>
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    value={pdpValue || ""}
                    onChange={(e) => {
                      setPdpValue(e.target.value);
                    }}
                    onBlur={() => handleSavePDP(parseInt(pdpValue) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSavePDP(parseInt(pdpValue) || 0);
                    }}
                    className="text-center text-sm font-bold h-8 w-24 pr-7"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">g</span>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => handlePDPChange((receita.rendimento_total || 0) + 50)}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <span className="text-muted-foreground">|</span>
              <div className="flex items-center gap-1" title={perdaTitle}>
                <span className="text-muted-foreground">Perda:</span>
                <span className={`font-medium ${perdaClass}`}>{perdaText}</span>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Ingredientes Esquecidos */}
      <IngredientesEsquecidos receitaId={id} fator={fator} />

      {/* Mode of preparation */}
      {(passos.length > 0 || temSubreceitas) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg font-bold">Modo de Preparo</h2>
            {!editingPreparo && (
              <Button variant="ghost" size="sm" onClick={() => { setPreparoDraft(receita.modo_preparo || ""); setEditingPreparo(true); }}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
              </Button>
            )}
          </div>
          <Card className="p-4">
            {editingPreparo ? (
              <div className="space-y-2">
                {temSubreceitas && (
                  <p className="text-xs text-muted-foreground italic">Editando o bloco "Montagem" da receita-mãe. Os modos de preparo das sub-receitas são exibidos por referência e não podem ser editados aqui.</p>
                )}
                <textarea
                  className="w-full text-sm leading-relaxed border rounded-md p-3 min-h-[150px] focus:outline-none focus:ring-1 focus:ring-ring"
                  value={preparoDraft}
                  onChange={(e) => setPreparoDraft(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditingPreparo(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleSavePreparo}>Salvar</Button>
                </div>
              </div>
            ) : temSubreceitas ? (
              <ModoPreparoComposto blocos={blocosCompostos} />
            ) : passos.length === 1 ? (
              <p className="text-sm leading-relaxed whitespace-pre-line">{passos[0].replace(/^\d+[\.\-\)]\s*/, "")}</p>
            ) : (
              <ol className="space-y-2 list-decimal list-inside">
                {passos.map((passo, idx) => (
                  <li key={idx} className="text-sm leading-relaxed pl-1">{passo.replace(/^\d+[\.\-\)]\s*/, "")}</li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      )}

      {/* Descritivo do Menu */}
      {editingDescritivo ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg font-bold">Descritivo da receita (para Menu)</h2>
          </div>
          <Card className="p-4">
            <div className="space-y-2">
              <textarea
                className="w-full text-sm leading-relaxed border rounded-md p-3 min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring"
                value={descritivoDraft}
                onChange={(e) => setDescritivoDraft(e.target.value)}
                placeholder="Texto voltado ao cliente final. Ex: Filé mignon grelhado com molho de mostarda e ervas."
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditingDescritivo(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleSaveDescritivo}>Salvar</Button>
              </div>
            </div>
          </Card>
        </div>
      ) : receita.descritivo_menu ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg font-bold">Descritivo da receita (para Menu)</h2>
            <Button variant="ghost" size="sm" onClick={() => { setDescritivoDraft(receita.descritivo_menu || ""); setEditingDescritivo(true); }}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
            </Button>
          </div>
          <Card className="p-4">
            <p className="text-sm leading-relaxed whitespace-pre-line">{receita.descritivo_menu}</p>
          </Card>
        </div>
      ) : null}

      {/* Nota */}
      {editingNota ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg font-bold">Nota</h2>
          </div>
          <Card className="p-4">
            <div className="space-y-2">
              <textarea
                className="w-full text-sm leading-relaxed border rounded-md p-3 min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring"
                value={notaDraft}
                onChange={(e) => setNotaDraft(e.target.value)}
                placeholder="Observações livres sobre a receita."
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditingNota(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleSaveNota}>Salvar</Button>
              </div>
            </div>
          </Card>
        </div>
      ) : receita.nota ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg font-bold">Nota</h2>
            <Button variant="ghost" size="sm" onClick={() => { setNotaDraft(receita.nota || ""); setEditingNota(true); }}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
            </Button>
          </div>
          <Card className="p-4">
            <p className="text-sm leading-relaxed whitespace-pre-line">{receita.nota}</p>
          </Card>
        </div>
      ) : null}

      {/* Insumos e Embalagens */}
      <InsumosSection receitaId={id} />

      {/* Custos */}
      <Card className="p-4">
        <h3 className="font-display text-sm font-bold mb-3">Custos</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ingredientes</span>
            <span className="font-medium">{formatCurrency(custoIngredientes)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Insumos e embalagens</span>
            <span className="font-medium">{formatCurrency(custoInsumos)}</span>
          </div>
          {custoEsquecidos > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground italic text-xs">Ingredientes esquecidos</span>
              <span className="font-medium text-xs">{formatCurrency(custoEsquecidos)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(custoTotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            <span>Custo por porção</span>
            <span className="font-semibold text-primary">{formatCurrency(custoPorcao)}</span>
          </div>
        </div>
      </Card>

      {/* Margin calculator */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Quanto cobrar se eu vender?</span>
          </div>
          <Switch checked={showMargin} onCheckedChange={setShowMargin} />
        </div>
        {showMargin && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Margem: {margem}%</span>
              <span className="font-bold text-primary text-lg">{formatCurrency(precoVenda)} /porção</span>
            </div>
            <Slider value={[margem]} min={10} max={80} step={5} onValueChange={(v) => setMargem(v[0])} />
          </div>
        )}
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate(`/receita/${id}/lista-compras?porcoes=${porcoes || receita.porcoes_base || 1}`)}>
          <ShoppingCart className="w-4 h-4 mr-1" /> Gerar lista de compras
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-1" /> ↓ Exportar PDF
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => navigate(`/ficha-tecnica/${id}`)}>Ficha Técnica</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/ficha-custos-receita/${id}`)}>Ficha de Custos</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialogs */}
      {showAddIng && (
        <AddIngredienteDialog
          open={true}
          onClose={() => setShowAddIng(false)}
          receitaId={id}
          receitaNome={receita.nome}
          porcoes={receita.porcoes_base}
          unidadeBase={receita.unidade_base}
        />
      )}

      {showEdit && (
        <EditReceitaDialog open={true} onClose={() => setShowEdit(false)} receita={receita} itens={itens} />
      )}

      {showEscalar && (
        <EscalarReceitaDialog
          open={true}
          onClose={() => setShowEscalar(false)}
          pc={pcLocal || 0}
          onConfirm={commitTotalGrams}
        />
      )}

      {editingItem && (
        <EditItemDialog
          open={true}
          onClose={() => setEditingItem(null)}
          item={editingItem}
          porcoesBase={receita?.porcoes_base}
          fator={fator}
          onSave={(data) => updateItemMut.mutate(data)}
          saving={updateItemMut.isPending}
          onEditPrice={(ing) => setEditingPrice({ ing })}
        />
      )}

      {editingPrice && (
        <EditPriceDialog
          open={true}
          onClose={() => setEditingPrice(null)}
          item={editingPrice}
          ing={editingPrice.ing}
          isAdmin={isAdmin}
          onSave={(data) => updatePriceMut.mutate(data)}
          saving={updatePriceMut.isPending}
        />
      )}

      {/* Cadastrar Medida (Regra 3) */}
      {cadastrarMedidaIng && (
        <CadastrarMedidaDialog
          open={true}
          onClose={() => { setCadastrarMedidaIng(null); setEditarMedidaMc(null); }}
          ingrediente={cadastrarMedidaIng}
          utensilios={utensiliosPadrao}
          medidaExistente={editarMedidaMc}
        />
      )}

      {/* Medidas Caseiras da Receita — cadastro centralizado */}
      {showMedidasReceita && (
        <MedidasCaseirasReceitaDialog
          open={true}
          onClose={() => setShowMedidasReceita(false)}
          itens={ingredientesParaMedidas}
          medidaByIngrediente={medidaByIngrediente}
          utensilios={utensiliosPadrao}
          uteMap={uteMap}
          getMedidaDisplay={getMedidaDisplay}
        />
      )}

      {/* Aviso: usuário já tem uma cópia pessoal desta receita */}
      <AlertDialog open={!!existingCopyWarning} onOpenChange={(v) => !v && setExistingCopyWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você já personalizou esta receita</AlertDialogTitle>
            <AlertDialogDescription>
              Você já tem essa receita personalizada em Minhas Receitas. Deseja continuar editando a sua versão?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate(`/receita/${existingCopyWarning.existingCopyId}`)}>
              Ir para minha cópia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de exclusão da receita */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{receita.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A receita e todos os seus ingredientes serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteReceitaMut.mutate()}
              disabled={deleteReceitaMut.isPending}
            >
              {deleteReceitaMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lightbox */}
      {showLightbox && receita.foto_url && (
        <Dialog open={true} onOpenChange={() => setShowLightbox(false)}>
          <DialogContent className="max-w-3xl p-2 bg-black/95 border-none">
            <img src={receita.foto_url} alt={receita.nome} className="w-full max-h-[80vh] object-contain rounded" />
            <div className="flex justify-center gap-3 mt-3">
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" asChild>
                <label className="cursor-pointer">
                  <Camera className="w-4 h-4 mr-1" /> Trocar foto
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                      const { file_url } = await base44.integrations.Core.UploadFile({ file });
                      const { receitaId } = await ensureEditavel();
                      await base44.entities.Receita.update(receitaId, { foto_url: file_url });
                      registrarHistorico(receitaId, receita?.nome, ["Foto"]);
                      qc.invalidateQueries({ queryKey: ["receita", receitaId] });
                      toast.success("Foto atualizada!");
                    } catch { toast.error("Erro ao enviar foto"); }
                  }} />
                </label>
              </Button>
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={async () => {
                const { receitaId } = await ensureEditavel();
                await base44.entities.Receita.update(receitaId, { foto_url: "" });
                registrarHistorico(receitaId, receita?.nome, ["Foto"]);
                qc.invalidateQueries({ queryKey: ["receita", receitaId] });
                setShowLightbox(false);
                toast.success("Foto removida");
              }}>
                <Trash2 className="w-4 h-4 mr-1" /> Remover foto
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EditPriceDialog({ open, onClose, item, ing, isAdmin = true, onSave, saving }) {
  const [peso, setPeso] = useState(ing?.peso_embalagem_g || 0);
  const [preco, setPreco] = useState(ing?.preco_embalagem_rs || 0);

  if (!ing) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Editar Preço — {ing.nome}</DialogTitle>
        </DialogHeader>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            {isAdmin
              ? "O preço é do cadastro geral — alterar afeta todas as receitas que o usam."
              : "Este é o seu preço pessoal — não altera o cadastro compartilhado nem outros usuários."}
          </p>
        </div>
        <CalculadoraCusto
          initialQuantidade={ing?.peso_embalagem_g || ""}
          initialPrecoTotal={ing?.preco_embalagem_rs || ""}
          onChange={({ peso_embalagem_g, preco_embalagem_rs }) => {
            setPeso(peso_embalagem_g);
            setPreco(preco_embalagem_rs);
          }}
        />
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave({ ingId: ing.id, preco_embalagem_rs: preco, peso_embalagem_g: peso })} disabled={saving}>
            {saving ? "Salvando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}