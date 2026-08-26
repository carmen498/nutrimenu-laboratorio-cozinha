import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { carregarContextoCustosReceitas } from "@/lib/custoContexto";
import { calcularCustoTecnicoReceitaParaCustos } from "@/lib/custos/custoTecnicoReceita";
import { calcularLaboratorioCustos, calcularMargemSobreVenda, calcularMarkupMultiplicador, calcularPrecoPorMargem, calcularPrecoPorMarkup } from "@/lib/custos/motorCustos";
import { rendimentoEfetivo } from "@/lib/custoReceita";
import { invalidarCustosDependentesSeguro } from "@/lib/invalidacaoCusto";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, Calculator, CircleHelp, ExternalLink, FileText, Info, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import FormacaoPrecoDialog from "@/components/custos/FormacaoPrecoDialog";

const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const n = (v) => { const x = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(x) ? x : 0; };
const RASCUNHO_CUSTOS_KEY = "laboratorio-custos:calculo-em-andamento";

export default function CustosCalcular() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [receitaId, setReceitaId] = useState(() => searchParams.get("receita") || "");
  const recalcularId = searchParams.get("recalcular") || "";
  const [quantidade, setQuantidade] = useState("1");
  const [buscaReceita, setBuscaReceita] = useState("");
  const [buscaReceitaAberta, setBuscaReceitaAberta] = useState(false);
  const [insumosAdicionais, setInsumosAdicionais] = useState([]);
  const [exclusoesTecnicas, setExclusoesTecnicas] = useState({ insumos: [], esquecidos: [] });
  const [campoPrecoAtivo, setCampoPrecoAtivo] = useState("margem_padrao");
  const [precoEntrada, setPrecoEntrada] = useState("");
  const [margemEntrada, setMargemEntrada] = useState("");
  const [markupEntrada, setMarkupEntrada] = useState("");
  const [showFormacaoPreco, setShowFormacaoPreco] = useState(false);
  const [formacaoPreco, setFormacaoPreco] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false);

  useEffect(() => {
    if (recalcularId || searchParams.get("receita")) {
      setRascunhoRestaurado(true);
      return;
    }
    try {
      const bruto = window.sessionStorage.getItem(RASCUNHO_CUSTOS_KEY);
      if (!bruto) return;
      const rascunho = JSON.parse(bruto);
      if (rascunho?.receitaId) setReceitaId(rascunho.receitaId);
      if (rascunho?.buscaReceita) setBuscaReceita(rascunho.buscaReceita);
      if (rascunho?.quantidade) setQuantidade(String(rascunho.quantidade));
      if (Array.isArray(rascunho?.insumosAdicionais)) setInsumosAdicionais(rascunho.insumosAdicionais);
      if (rascunho?.exclusoesTecnicas) setExclusoesTecnicas({ insumos: rascunho.exclusoesTecnicas.insumos || [], esquecidos: rascunho.exclusoesTecnicas.esquecidos || [] });
      if (rascunho?.campoPrecoAtivo) setCampoPrecoAtivo(rascunho.campoPrecoAtivo);
      if (rascunho?.precoEntrada != null) setPrecoEntrada(String(rascunho.precoEntrada));
      if (rascunho?.margemEntrada != null) setMargemEntrada(String(rascunho.margemEntrada));
      if (rascunho?.markupEntrada != null) setMarkupEntrada(String(rascunho.markupEntrada));
      if (rascunho?.formacaoPreco) setFormacaoPreco(rascunho.formacaoPreco);
    } catch {
      window.sessionStorage.removeItem(RASCUNHO_CUSTOS_KEY);
    } finally {
      setRascunhoRestaurado(true);
    }
  }, [recalcularId, searchParams]);

  useEffect(() => {
    if (!rascunhoRestaurado || recalcularId) return;
    try {
      window.sessionStorage.setItem(RASCUNHO_CUSTOS_KEY, JSON.stringify({
        receitaId,
        buscaReceita,
        quantidade,
        insumosAdicionais,
        exclusoesTecnicas,
        campoPrecoAtivo,
        precoEntrada,
        margemEntrada,
        markupEntrada,
        formacaoPreco,
      }));
    } catch {
      // Rascunho é conveniência de navegação; falha de storage não bloqueia o cálculo.
    }
  }, [rascunhoRestaurado, recalcularId, receitaId, buscaReceita, quantidade, insumosAdicionais, exclusoesTecnicas, campoPrecoAtivo, precoEntrada, margemEntrada, markupEntrada, formacaoPreco]);

  const { data: todasReceitas = [], isLoading: loadingReceitas } = useQuery({
    queryKey: ["custos-receitas", user?.id, isAdmin],
    queryFn: () => fetchAllPages(base44.entities.Receita, "nome"),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const receitas = useMemo(() => {
    if (isAdmin) return todasReceitas.filter((r) => r.is_base !== false);
    const pessoaisPorOrigem = {};
    const autorais = [];
    todasReceitas.forEach((r) => {
      if (r.is_base === false && (r.usuario_dono_id === user?.id || r.created_by_id === user?.id)) {
        const origem = r.receita_origem_id || r.forked_from_id;
        if (origem) pessoaisPorOrigem[origem] = r;
        else autorais.push(r);
      }
    });
    const catalogo = todasReceitas.filter((r) => r.is_base === true).map((r) => pessoaisPorOrigem[r.id] || r);
    return [...catalogo, ...autorais].sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
  }, [todasReceitas, isAdmin, user?.id]);

  const receita = receitas.find((r) => r.id === receitaId) || null;
  const receitasFiltradas = useMemo(() => {
    const termo = buscaReceita.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return receitas.slice(0, 12);
    return receitas.filter((r) => String(r.nome || "").toLocaleLowerCase("pt-BR").includes(termo)).slice(0, 20);
  }, [receitas, buscaReceita]);

  const { data: contexto, isLoading: loadingContexto } = useQuery({
    queryKey: ["custos-contexto-receita", receitaId, user?.id, isAdmin],
    queryFn: () => carregarContextoCustosReceitas({ receitaIds: [receitaId], userId: user.id, isAdmin }),
    enabled: !!receitaId && !!user?.id,
    staleTime: 0,
  });

  const { data: despesas = [] } = useQuery({
    queryKey: ["custos-despesas", user?.id],
    queryFn: () => base44.entities.DespesaCustoUsuario.filter({ user_id: user.id }, "ordem", 500),
    enabled: !!user?.id,
  });

  const { data: configuracoes = [] } = useQuery({
    queryKey: ["custos-config", user?.id],
    queryFn: () => base44.entities.ConfiguracaoCustosUsuario.filter({ user_id: user.id }, "-updated_date", 10),
    enabled: !!user?.id,
  });

  const { data: calculosAnteriores = [], isLoading: loadingRecalculo } = useQuery({
    queryKey: ["custos-recalculo-origem", recalcularId, user?.id],
    queryFn: () => base44.entities.CalculoCusto.filter({ id: recalcularId, user_id: user.id }, "-data_calculo", 1),
    enabled: !!recalcularId && !!user?.id,
    staleTime: 0,
  });

  const { data: itensCalculoAnterior = [], isLoading: loadingItensRecalculo } = useQuery({
    queryKey: ["custos-recalculo-itens", recalcularId, user?.id],
    queryFn: () => base44.entities.CalculoCustoItem.filter({ calculo_id: recalcularId, user_id: user.id }, "ordem", 100),
    enabled: !!recalcularId && !!user?.id && calculosAnteriores.length > 0,
    staleTime: 0,
  });

  const config = configuracoes[0] || null;
  const calculoAnterior = calculosAnteriores[0] || null;

  const { data: versoesPosteriores = [], isLoading: loadingVersaoPosterior } = useQuery({
    queryKey: ["custos-recalculo-versao-posterior", recalcularId, user?.id],
    queryFn: () => base44.entities.CalculoCusto.filter({ calculo_origem_id: recalcularId, user_id: user.id }, "-data_calculo", 1),
    enabled: !!recalcularId && !!user?.id && !!calculoAnterior,
    staleTime: 0,
  });
  const versaoPosterior = versoesPosteriores[0] || null;
  const recalculoValido = !recalcularId || (!!calculoAnterior && !versaoPosterior);
  const [recalculoInicializado, setRecalculoInicializado] = useState(false);
  useEffect(() => {
    if (!recalcularId || !calculoAnterior || loadingItensRecalculo || recalculoInicializado) return;
    setQuantidade(String(calculoAnterior.quantidade_produzida || 1));
    setInsumosAdicionais(itensCalculoAnterior.filter((i) => i.tipo === "outro" && i.origem === "Adicionado neste cálculo").map((i) => ({ id: i.id, descricao: i.descricao, valor: String(i.valor_unitario || i.valor_total || 0), modo: String(i.formula || "").includes("por receita") ? "por_receita" : "producao" })));
    setCampoPrecoAtivo("margem_padrao");
    setPrecoEntrada("");
    setMargemEntrada("");
    setMarkupEntrada("");
    setFormacaoPreco(null);
    setRecalculoInicializado(true);
  }, [recalcularId, calculoAnterior, itensCalculoAnterior, loadingItensRecalculo, recalculoInicializado]);

  const qtd = Math.max(0, n(quantidade));

  const tecnico = useMemo(() => {
    if (!receita || !contexto || qtd <= 0) return null;
    const insumosAtivos = (contexto.insumosPorReceita?.[receita.id] || []).filter((item) => !exclusoesTecnicas.insumos.includes(item.id));
    const esquecidosAtivos = (contexto.esquecidosPorReceita?.[receita.id] || []).filter((item) => !exclusoesTecnicas.esquecidos.includes(item.id));
    return calcularCustoTecnicoReceitaParaCustos({
      receita,
      ingredientesReceita: contexto.ingredientesPorReceita?.[receita.id] || [],
      ingredienteMap: contexto.ingredienteMap || {},
      insumosReceita: insumosAtivos,
      esquecidos: esquecidosAtivos,
      fator: qtd,
      numeroLotes: qtd,
    });
  }, [receita, contexto, qtd, exclusoesTecnicas]);

  const totalPorcoes = tecnico?.porcoesEfetivas || 0;
  const totalInsumosAdicionais = useMemo(() => insumosAdicionais.reduce((s, item) => {
    const valor = Math.max(0, n(item.valor));
    return s + (item.modo === "producao" ? valor : valor * qtd);
  }, 0), [insumosAdicionais, qtd]);
  const resultado = useMemo(() => calcularLaboratorioCustos({
    custoTecnicoProducao: tecnico?.custoTecnicoTotal || 0,
    despesas,
    quantidadeProduzida: qtd,
    gruposRateio: Array.isArray(config?.grupos_rateio_incluidos)
      ? config.grupos_rateio_incluidos
      : ["gastos_negocio", "trabalho_ajudantes", "producao", "embalagem_outros"],
    aplicarCustoNegocio: Boolean(receita && tecnico && config?.aplicar_custo_negocio),
    baseCustoNegocio: config?.base_custo_negocio || "mes",
    diasProducaoMes: Number(config?.dias_producao_mes || 0),
    producaoMediaDia: Number(config?.producao_media_dia || 0),
    producaoMediaMes: Number(config?.volume_mensal_estimado || 0),
    insumosAdicionais: totalInsumosAdicionais,
    totalPorcoes,
    precoVendaUnitario: 0,
  }), [tecnico, despesas, config?.volume_mensal_estimado, config?.grupos_rateio_incluidos, config?.aplicar_custo_negocio, config?.base_custo_negocio, config?.dias_producao_mes, config?.producao_media_dia, qtd, totalInsumosAdicionais, totalPorcoes]);

  const formacaoDireta = useMemo(() => {
    const custo = Number(resultado.custoUnitario || 0);
    if (formacaoPreco) {
      return {
        preco: Number(formacaoPreco.precoSugerido || 0),
        margem: Number(formacaoPreco.margemLiquidaPct || 0),
        markup: Number(formacaoPreco.markup || 0),
        valido: Number(formacaoPreco.precoSugerido || 0) > 0,
        origem: "avancada",
      };
    }
    if (custo <= 0) return { preco: 0, margem: 0, markup: 0, valido: false, origem: campoPrecoAtivo };

    if (campoPrecoAtivo === "preco") {
      const preco = Math.max(0, n(precoEntrada));
      return {
        preco,
        margem: calcularMargemSobreVenda({ custoUnitario: custo, precoVendaUnitario: preco }),
        markup: calcularMarkupMultiplicador({ custoUnitario: custo, precoVendaUnitario: preco }),
        valido: preco > 0,
        origem: "preco",
      };
    }

    if (campoPrecoAtivo === "margem" || campoPrecoAtivo === "margem_padrao") {
      const margem = campoPrecoAtivo === "margem_padrao"
        ? Math.max(0, Number(config?.margem_padrao ?? 20))
        : (margemEntrada === "" ? 0 : Math.max(0, n(margemEntrada)));
      if (campoPrecoAtivo === "margem" && margemEntrada === "") return { preco: 0, margem: 0, markup: 0, valido: false, origem: "margem" };
      const calculo = calcularPrecoPorMargem({ custoUnitario: custo, margemDesejadaPct: margem });
      const preco = calculo.valido ? calculo.preco : 0;
      return {
        preco,
        margem,
        markup: calcularMarkupMultiplicador({ custoUnitario: custo, precoVendaUnitario: preco }),
        valido: calculo.valido && preco > 0,
        origem: campoPrecoAtivo === "margem_padrao" ? "margem_padrao" : "margem",
        diagnostico: calculo.diagnostico,
      };
    }

    const markup = Math.max(0, n(markupEntrada));
    const preco = calcularPrecoPorMarkup({ custoUnitario: custo, markup });
    return {
      preco,
      margem: calcularMargemSobreVenda({ custoUnitario: custo, precoVendaUnitario: preco }),
      markup,
      valido: markup > 0 && preco > 0,
      origem: "markup",
    };
  }, [resultado.custoUnitario, formacaoPreco, campoPrecoAtivo, precoEntrada, margemEntrada, markupEntrada, config?.margem_padrao]);

  const precoVendaEfetivo = Number(formacaoDireta.preco || 0);
  const precoValido = formacaoDireta.valido && precoVendaEfetivo > 0;
  const valorPrecoCampo = campoPrecoAtivo === "preco" && !formacaoPreco ? precoEntrada : (precoVendaEfetivo > 0 ? precoVendaEfetivo.toFixed(2) : "");
  const valorMargemCampo = campoPrecoAtivo === "margem" && !formacaoPreco ? margemEntrada : (precoVendaEfetivo > 0 ? Number(formacaoDireta.margem || 0).toFixed(1) : "");
  const valorMarkupCampo = campoPrecoAtivo === "markup" && !formacaoPreco ? markupEntrada : (Number(formacaoDireta.markup || 0) > 0 ? Number(formacaoDireta.markup).toFixed(2) : "");

  const editarPreco = (valor) => { setFormacaoPreco(null); setCampoPrecoAtivo("preco"); setPrecoEntrada(valor); };
  const editarMargem = (valor) => { setFormacaoPreco(null); setCampoPrecoAtivo("margem"); setMargemEntrada(valor); };
  const editarMarkup = (valor) => { setFormacaoPreco(null); setCampoPrecoAtivo("markup"); setMarkupEntrada(valor); };
  const preservarRascunhoAntesDeSair = () => {
    if (recalcularId) return;
    try {
      window.sessionStorage.setItem(RASCUNHO_CUSTOS_KEY, JSON.stringify({ receitaId, buscaReceita, quantidade, insumosAdicionais, exclusoesTecnicas, campoPrecoAtivo, precoEntrada, margemEntrada, markupEntrada, formacaoPreco }));
    } catch {
      // A navegação continua mesmo se o storage do navegador estiver indisponível.
    }
  };

  const rendimentoBase = receita && contexto ? rendimentoEfetivo(receita, contexto.ingredientesPorReceita?.[receita.id] || []) : 0;
  const categoria = receita?.categorias?.[0] || receita?.categoria || "";
  const insumosImportados = tecnico?.insumosEscalados || [];
  const esquecidosImportados = useMemo(() => {
    if (!receita || !contexto) return [];
    return (contexto.esquecidosPorReceita?.[receita.id] || []).filter((item) => !exclusoesTecnicas.esquecidos.includes(item.id)).map((item) => ({
      ...item,
      custoEscalado: Number(item.custo_total || 0) * qtd,
    }));
  }, [receita, contexto, exclusoesTecnicas.esquecidos, qtd]);
  const podeAlterarReceitaOrigem = !!receita && (isAdmin || receita.is_base === false);

  const retirarDoCalculo = (tipo, id) => {
    setExclusoesTecnicas((atual) => ({ ...atual, [tipo]: [...new Set([...(atual[tipo] || []), id])] }));
    toast.success("Item desconsiderado somente neste cálculo.");
  };

  const removerDaReceita = async (entityName, tipo, id) => {
    if (!receita || !podeAlterarReceitaOrigem) return toast.error("Esta receita não pode ser alterada diretamente. Personalize-a no Laboratório de Cozinha para remover o item da origem.");
    if (!window.confirm("Remover este item da receita? Essa alteração também afetará os próximos cálculos desta receita.")) return;
    try {
      await base44.entities[entityName].delete(id);
      await invalidarCustosDependentesSeguro({ receitaIds: [receita.id], motivo: "item_removido_no_laboratorio_custos", origem: "laboratorio_custos" });
      setExclusoesTecnicas((atual) => ({ ...atual, [tipo]: (atual[tipo] || []).filter((x) => x !== id) }));
      await qc.invalidateQueries({ queryKey: ["custos-contexto-receita", receita.id] });
      toast.success("Item removido da receita.");
    } catch (err) {
      toast.error("Não foi possível remover o item: " + (err?.message || "erro inesperado"));
    }
  };
  const pendenciasDetalhadas = useMemo(() => {
    if (!tecnico || !receita || !contexto) return [];
    const itensReceita = contexto.ingredientesPorReceita?.[receita.id] || [];
    const esquecidosReceita = contexto.esquecidosPorReceita?.[receita.id] || [];
    const itemMap = Object.fromEntries(itensReceita.map((item) => [item.id, item]));
    const esquecidoMap = Object.fromEntries(esquecidosReceita.map((item) => [item.id, item]));
    const nomes = [];
    for (const problema of tecnico.problemas || []) {
      if (problema.tipo === "insumo_sem_preco") continue;
      const ingrediente = problema.ingrediente_id ? contexto.ingredienteMap?.[problema.ingrediente_id] : null;
      const item = problema.item_id ? itemMap[problema.item_id] : null;
      const esquecido = problema.item_id ? esquecidoMap[problema.item_id] : null;
      const nome = esquecido?.nome || item?.ingrediente_nome || ingrediente?.nome || "Item da receita";
      if (problema.tipo === "sem_preco" || problema.tipo === "esquecido_sem_preco") nomes.push(`${nome} — sem preço`);
      else if (problema.tipo === "ingrediente_nao_encontrado" || problema.tipo === "ingrediente_sem_id" || problema.tipo === "esquecido_nome_id_divergente") nomes.push(`${nome} — referência ausente ou inválida`);
      else if (problema.tipo === "ingrediente_nome_id_divergente") nomes.push(`${nome} — referência divergente`);
      else nomes.push(`${nome} — revisar cadastro`);
    }
    for (const insumo of insumosImportados.filter((item) => item.semPreco)) nomes.push(`${insumo.insumo_nome || "Insumo/embalagem"} — sem preço`);
    return [...new Set(nomes)];
  }, [tecnico, receita, contexto, insumosImportados]);

  const explicacaoCustoNegocio = useMemo(() => {
    if (!resultado.rateio.aplicar) return "O Custo do Negócio está desligado em Minhas Despesas e não entra neste cálculo.";
    const total = money(resultado.rateio.totalMensal || 0);
    if ((config?.base_custo_negocio || "mes") === "dia") {
      const dias = Number(config?.dias_producao_mes || 0);
      const porDia = Number(config?.producao_media_dia || 0);
      return `${total} de despesas consideradas ÷ ${dias || 0} dia(s) de produção ÷ ${porDia || 0} receita(s) por dia = ${money(resultado.rateio.custoPorUnidade)} por receita.`;
    }
    const porMes = Number(config?.volume_mensal_estimado || 0);
    return `${total} de despesas consideradas ÷ ${porMes || 0} receita(s) por mês = ${money(resultado.rateio.custoPorUnidade)} por receita.`;
  }, [resultado.rateio, config?.base_custo_negocio, config?.dias_producao_mes, config?.producao_media_dia, config?.volume_mensal_estimado]);

  const salvar = async () => {
    if (!user?.id || !receita || !tecnico || qtd <= 0) return toast.error("Selecione uma receita e informe a produção.");
    if (!recalculoValido) return toast.error("A ficha anterior não foi encontrada. Abra novamente pelo Histórico.");
    if (!tecnico.completo) return toast.error("A receita possui pendências de custo. Corrija preços/referências antes de salvar a ficha.");
    if (!resultado.valido) return toast.error("Revise o Custo do Negócio em Minhas Despesas antes de finalizar este cálculo.");
    if (!precoValido) return toast.error("Revise a formação do preço antes de gerar a ficha.");
    setSalvando(true);
    try {
      const payloadCalculo = {
        user_id: user.id,
        tipo_origem: "receita",
        origem_id: receita.id,
        origem_nome_snapshot: receita.nome,
        origem_versao_snapshot: String(receita.updated_date || receita.data_personalizacao || receita.created_date || ""),
        categoria_snapshot: categoria,
        foto_url_snapshot: receita.foto_url || "",
        quantidade_produzida: qtd,
        unidade_producao: "receitas",
        rendimento_snapshot: rendimentoBase,
        rendimento_unidade_snapshot: receita.unidade_base || "g",
        total_porcoes_snapshot: totalPorcoes,
        modelo_tecnico_versao: tecnico.modeloTecnicoVersao,
        custo_ingredientes_snapshot: tecnico.custoIngredientes,
        custo_insumos_tecnicos_snapshot: tecnico.custoInsumosTecnicos,
        custo_esquecidos_snapshot: tecnico.custoEsquecidos,
        custo_tecnico_snapshot: tecnico.custoTecnicoTotal,
        custo_embalagens: 0,
        custo_mao_obra: 0,
        custo_rateado: resultado.rateio.custoDaProducao,
        custo_total: resultado.custoTotal,
        custo_unitario: resultado.custoUnitario,
        custo_por_porcao: resultado.custoPorPorcao,
        preco_venda_informado: precoVendaEfetivo,
        preco_sugerido: formacaoPreco?.precoSugerido || 0,
        markup_aplicado: formacaoPreco?.markup ?? formacaoDireta.markup,
        margem_estimada: formacaoPreco?.margemLiquidaPct ?? formacaoDireta.margem,
        formacao_preco_metodo: formacaoPreco ? "margem" : "informado",
        margem_desejada_pct: formacaoPreco?.margemDesejadaPct ?? ((formacaoDireta.origem === "margem" || formacaoDireta.origem === "margem_padrao") ? formacaoDireta.margem : 0),
        taxa_cartao_pct: 0,
        impostos_pct: 0,
        taxas_variaveis_pct: formacaoPreco?.taxasVariaveisPct || 0,
        custo_fixo_adicional_unitario: 0,
        status: recalcularId ? "recalculado" : "finalizado",
        calculo_origem_id: recalcularId || "",
      };

      const itens = [
        { tipo: "ingredientes", descricao: "Ingredientes da receita", origem: "Laboratório de Cozinha", formula: `${qtd} receita(s) × composição técnica`, quantidade: qtd, valor_unitario: qtd > 0 ? tecnico.custoIngredientes / qtd : 0, valor_total: tecnico.custoIngredientes, ordem: 1 },
        { tipo: "ingredientes", descricao: "Ingredientes esquecidos", origem: "Laboratório de Cozinha", formula: "Conforme registros técnicos da receita", quantidade: qtd, valor_unitario: qtd > 0 ? tecnico.custoEsquecidos / qtd : 0, valor_total: tecnico.custoEsquecidos, ordem: 2 },
        { tipo: "embalagem", descricao: "Insumos e embalagens da receita", origem: "Laboratório de Cozinha", formula: "Conforme cadastro técnico da receita", quantidade: qtd, valor_unitario: qtd > 0 ? tecnico.custoInsumosTecnicos / qtd : 0, valor_total: tecnico.custoInsumosTecnicos, ordem: 3 },
        { tipo: "despesa_rateada", descricao: "Custo do Negócio", origem: "Minhas Despesas", formula: resultado.rateio.aplicar ? `${money(resultado.rateio.custoPorUnidade)} × ${qtd} receita(s)` : "Não aplicado", quantidade: qtd, valor_unitario: resultado.rateio.custoPorUnidade, valor_total: resultado.rateio.custoDaProducao, ordem: 4 },
        ...insumosAdicionais.filter((item) => String(item.descricao || "").trim() && n(item.valor) > 0).map((item, index) => {
          const valor = Math.max(0, n(item.valor));
          const porReceita = item.modo !== "producao";
          return { tipo: "outro", descricao: String(item.descricao).trim(), origem: "Adicionado neste cálculo", formula: porReceita ? `${money(valor)} por receita × ${qtd} receita(s)` : "Valor total informado para esta produção", quantidade: porReceita ? qtd : 1, valor_unitario: valor, valor_total: porReceita ? valor * qtd : valor, ordem: 10 + index };
        }),
      ].filter((i) => i.valor_total > 0 || i.ordem === 1);

      const resposta = await base44.functions.invoke("salvarCalculoCusto", { calculo: payloadCalculo, itens });
      const calculoId = resposta?.data?.calculo_id;
      if (!resposta?.data?.success || !calculoId) throw new Error(resposta?.data?.error || "A gravação segura da ficha não foi confirmada.");
      qc.invalidateQueries({ queryKey: ["custos-historico", user.id] });
      toast.success(recalcularId ? "Nova versão salva." : "Ficha de custo salva.");
      if (!recalcularId) window.sessionStorage.removeItem(RASCUNHO_CUSTOS_KEY);
      navigate(`/custos/ficha/${calculoId}`);
    } catch (err) {
      toast.error("Não foi possível salvar o cálculo: " + (err?.message || "erro inesperado"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Calcular Custo</h1>
        <p className="text-sm text-muted-foreground mt-1">Use uma receita do Laboratório de Cozinha e acrescente os custos do seu negócio.</p>
      </div>

      {recalcularId && (loadingRecalculo || loadingItensRecalculo || loadingVersaoPosterior ? <Card className="p-4 text-sm text-muted-foreground">Carregando a ficha anterior para gerar uma nova versão...</Card> : versaoPosterior ? <Card className="p-4 border-amber-300 bg-amber-50"><p className="text-sm font-medium text-amber-900">Esta ficha já possui uma versão posterior.</p><p className="text-xs text-amber-800 mt-1">Para manter o histórico linear, novos recálculos devem partir da versão mais recente.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => navigate(`/custos/ficha/${versaoPosterior.id}`)}>Abrir versão {versaoPosterior.versao_calculo || Number(calculoAnterior?.versao_calculo || 1) + 1}</Button></Card> : calculoAnterior ? <Card className="p-4 border-primary/20 bg-primary/5"><p className="text-sm font-medium text-primary">Recalculando {calculoAnterior.origem_nome_snapshot}</p><p className="text-xs text-muted-foreground mt-1">Será criada a versão {Number(calculoAnterior.versao_calculo || 1) + 1}. A quantidade e os insumos adicionais foram reaproveitados da ficha anterior; o preço de venda deve ser revisto com o custo atualizado.</p></Card> : <Card className="p-4 border-red-200 bg-red-50"><p className="text-sm font-medium text-red-800">A ficha anterior não foi encontrada.</p><p className="text-xs text-red-700 mt-1">Volte ao Histórico e inicie o recálculo novamente.</p></Card>)}

      <div className="grid xl:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="space-y-4">
          {receita && !recalcularId && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3 text-sm"><Info className="w-4 h-4 text-amber-700 shrink-0" /><div><p className="font-medium text-amber-900">Rascunho — este cálculo ainda não está no Histórico.</p><p className="text-xs text-amber-800 mt-0.5">Você pode sair e voltar sem perder o preenchimento. Para registrar a ficha, use <strong>Salvar cálculo e gerar ficha</strong>.</p></div></div>}
          <Card className="p-5 space-y-3">
            <div><p className="text-xs font-semibold text-primary">PASSO 1</p><h2 className="font-semibold text-lg">Qual receita você quer calcular?</h2></div>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={buscaReceita}
                onChange={(e) => { setBuscaReceita(e.target.value); setBuscaReceitaAberta(true); }}
                onFocus={() => setBuscaReceitaAberta(true)}
                onBlur={() => window.setTimeout(() => setBuscaReceitaAberta(false), 120)}
                placeholder={receita ? receita.nome : "Digite o nome da receita..."}
                className="pl-9"
                autoComplete="off"
              />
              {buscaReceitaAberta && !loadingReceitas && <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border bg-popover shadow-lg p-1">
                {receitasFiltradas.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhuma receita encontrada.</p> : receitasFiltradas.map((r) => <button key={r.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setReceitaId(r.id); setBuscaReceita(r.nome); setBuscaReceitaAberta(false); setInsumosAdicionais([]); setExclusoesTecnicas({ insumos: [], esquecidos: [] }); setCampoPrecoAtivo("margem_padrao"); setPrecoEntrada(""); setMargemEntrada(""); setMarkupEntrada(""); setFormacaoPreco(null); }} className={`w-full text-left rounded-md px-3 py-2.5 text-sm hover:bg-muted ${r.id === receitaId ? "bg-primary/5 text-primary" : ""}`}><span className="font-medium">{r.nome}</span>{r.is_base === false && <span className="ml-2 text-xs text-muted-foreground">Minha Receita</span>}</button>)}
              </div>}
            </div>
            <div className="flex items-center justify-between gap-3"><p className="text-[11px] text-muted-foreground">Digite parte do nome para localizar rapidamente entre as receitas do Laboratório de Cozinha.</p>{receita && <Link to={`/receita/${receita.id}`} onClick={preservarRascunhoAntesDeSair} className="text-xs text-primary inline-flex gap-1 whitespace-nowrap">Ver receita <ExternalLink className="w-3 h-3" /></Link>}</div>
            {loadingReceitas && <p className="text-xs text-muted-foreground">Carregando receitas...</p>}
          </Card>

          <Card className="p-5 space-y-4">
            <div><p className="text-xs font-semibold text-primary">PASSO 2</p><h2 className="font-semibold text-lg">Quanto pretende produzir?</h2><p className="text-xs text-muted-foreground">1 receita corresponde a 1 rendimento completo da receita selecionada.</p></div>
            <div className="grid sm:grid-cols-3 gap-3"><div className="sm:col-span-1"><Label>Quantidade de receitas</Label><Input type="number" min="0.01" step="0.01" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /><p className="text-[11px] text-muted-foreground mt-1">Ex.: 20 significa produzir 20 rendimentos completos desta receita.</p></div><div className="rounded-lg bg-muted/40 p-3"><div className="flex items-center gap-1.5"><p className="text-xs text-muted-foreground">Rendimento estimado da produção</p><Popover><PopoverTrigger asChild><button type="button" className="text-muted-foreground hover:text-foreground" aria-label="O que é rendimento estimado?"><CircleHelp className="w-3.5 h-3.5" /></button></PopoverTrigger><PopoverContent className="w-80 text-sm" align="start"><p className="font-medium">Rendimento estimado</p><p className="text-muted-foreground mt-2">É o rendimento completo da receita multiplicado pela quantidade de receitas que você informou. Serve para mostrar quanto será produzido no total, na unidade cadastrada na receita.</p><p className="text-muted-foreground mt-2">Exemplo: se 1 receita rende 1.725 g e você produzir 20 receitas, o rendimento estimado será 34.500 g.</p></PopoverContent></Popover></div><p className="font-semibold mt-1">{tecnico ? `${Math.round(tecnico.rendimento)} ${receita?.unidade_base || "g"}` : "—"}</p></div><div className="rounded-lg bg-muted/40 p-3"><div className="flex items-center gap-1.5"><p className="text-xs text-muted-foreground">Nº de porções estimadas</p><Popover><PopoverTrigger asChild><button type="button" className="text-muted-foreground hover:text-foreground" aria-label="O que são porções estimadas?"><CircleHelp className="w-3.5 h-3.5" /></button></PopoverTrigger><PopoverContent className="w-80 text-sm" align="start"><p className="font-medium">Porções estimadas</p><p className="text-muted-foreground mt-2">É a quantidade aproximada de porções obtida a partir do rendimento total produzido e da porção cadastrada na receita.</p><p className="text-muted-foreground mt-2">Este número serve para calcular o custo por porção. Ele não altera o número de receitas produzidas.</p></PopoverContent></Popover></div><p className="font-semibold mt-1">{tecnico ? totalPorcoes.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}</p></div></div>
          </Card>

          <Card className="p-5 space-y-4">
            <div><p className="text-xs font-semibold text-primary">PASSO 3</p><h2 className="font-semibold text-lg">Custo desta produção</h2></div>
            {loadingContexto ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Calculando custo técnico...</div> : !receita ? <p className="text-sm text-muted-foreground">Selecione uma receita para calcular.</p> : <>
              {!tecnico?.completo && tecnico && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><div className="flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><div className="flex-1"><p className="font-medium">Há {pendenciasDetalhadas.length || (tecnico.itensSemPreco + tecnico.insumosSemPreco + tecnico.referenciasAusentes)} pendência(s) na receita.</p>{pendenciasDetalhadas.length > 0 && <ul className="mt-1 space-y-0.5 text-xs">{pendenciasDetalhadas.map((item) => <li key={item}>• {item}</li>)}</ul>}<Link to={`/receita/${receita.id}#ingredientes-esquecidos`} onClick={preservarRascunhoAntesDeSair} className="inline-flex items-center gap-1 text-xs font-medium underline mt-2">Ver na receita <ExternalLink className="w-3 h-3" /></Link></div></div></div>}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5">Ingredientes <Popover><PopoverTrigger asChild><button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Como é calculado o custo dos ingredientes?"><CircleHelp className="w-3.5 h-3.5" /></button></PopoverTrigger><PopoverContent className="w-80 text-sm" align="start"><p className="font-medium">Ingredientes</p><p className="text-muted-foreground mt-2">Soma do custo dos ingredientes da receita cadastrada no Laboratório de Cozinha, considerando a quantidade de receitas informada.</p></PopoverContent></Popover></span><strong>{money(tecnico?.custoIngredientes)}</strong></div>
                <div className="flex justify-between gap-3"><span className="inline-flex items-center gap-2">Insumos e embalagens importados da receita {insumosImportados.length > 0 && <Popover><PopoverTrigger asChild><button type="button" className="text-xs text-primary underline">Ver itens</button></PopoverTrigger><PopoverContent className="w-96 text-sm" align="start"><p className="font-medium">Insumos e embalagens importados</p><div className="mt-2 divide-y max-h-64 overflow-y-auto">{insumosImportados.map((item, index) => <div key={item.id || index} className="py-2 flex justify-between gap-3"><div><p>{item.insumo_nome || `Item ${index + 1}`}</p>{item.semPreco && <p className="text-xs text-amber-700">Sem preço cadastrado</p>}</div><strong className="whitespace-nowrap">{item.semPreco ? "—" : money(item.custoEscalado)}</strong></div>)}</div></PopoverContent></Popover>}</span><strong>{money(tecnico?.custoInsumosTecnicos)}</strong></div>
                {Number(tecnico?.custoEsquecidos || 0) > 0 && <div className="flex justify-between"><span>Ingredientes esquecidos</span><strong>{money(tecnico?.custoEsquecidos)}</strong></div>}
              </div>
              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">Insumo não cadastrado?</p><p className="text-[11px] text-muted-foreground mt-0.5">Adicione somente quando algo usado nesta produção ainda não estiver cadastrado na receita.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setInsumosAdicionais((atual) => [...atual, { id: `novo-${Date.now()}-${atual.length}`, descricao: "", valor: "", modo: "por_receita" }])}><Plus className="w-4 h-4 mr-1" /> Adicionar insumo não cadastrado</Button></div>
                {insumosAdicionais.length > 0 && <div className="space-y-2">{insumosAdicionais.map((item, index) => <div key={item.id || index} className="grid lg:grid-cols-[1fr_150px_170px_36px] gap-2 items-center rounded-lg border p-2"><Input value={item.descricao} onChange={(e) => setInsumosAdicionais((atual) => atual.map((x, i) => i === index ? { ...x, descricao: e.target.value } : x))} placeholder="Ex.: caixa especial, gelo seco..." /><div className="relative"><span className="absolute left-3 top-2.5 text-sm text-muted-foreground">R$</span><Input className="pl-9" type="number" min="0" step="0.01" value={item.valor} onChange={(e) => setInsumosAdicionais((atual) => atual.map((x, i) => i === index ? { ...x, valor: e.target.value } : x))} placeholder="0,00" /></div><select value={item.modo || "por_receita"} onChange={(e) => setInsumosAdicionais((atual) => atual.map((x, i) => i === index ? { ...x, modo: e.target.value } : x))} className="h-10 rounded-md border bg-background px-2 text-sm"><option value="por_receita">Por receita</option><option value="producao">Produção inteira</option></select><Button type="button" variant="ghost" size="icon" aria-label="Remover insumo" onClick={() => setInsumosAdicionais((atual) => atual.filter((_, i) => i !== index))}><Trash2 className="w-4 h-4" /></Button>{n(item.valor) > 0 && <p className="lg:col-span-4 text-[11px] text-muted-foreground">{item.modo === "producao" ? `${money(n(item.valor))} no total desta produção.` : `${money(n(item.valor))} por receita × ${qtd} receita(s) = ${money(n(item.valor) * qtd)}.`}</p>}</div>)}</div>}
                {totalInsumosAdicionais > 0 && <div className="flex justify-between text-sm rounded-lg bg-muted/30 px-3 py-2"><span>Total de insumos adicionados neste cálculo</span><strong>{money(totalInsumosAdicionais)}</strong></div>}
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5">Custo técnico importado <Popover><PopoverTrigger asChild><button type="button" className="text-muted-foreground hover:text-foreground" aria-label="O que compõe o custo técnico importado?"><CircleHelp className="w-3.5 h-3.5" /></button></PopoverTrigger><PopoverContent className="w-80 text-sm" align="start"><p className="font-medium">Custo técnico importado</p><p className="text-muted-foreground mt-2">É a soma dos ingredientes, insumos e embalagens cadastrados na receita, além de outros componentes técnicos registrados no Laboratório de Cozinha.</p></PopoverContent></Popover></span><strong>{money(tecnico?.custoTecnicoTotal)}</strong></div>
                {totalInsumosAdicionais > 0 && <div className="flex justify-between"><span>Insumos adicionados neste cálculo</span><strong>{money(totalInsumosAdicionais)}</strong></div>}
                <div className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5">Custo do Negócio {resultado.rateio.aplicar ? "aplicado" : "não aplicado"} <Popover><PopoverTrigger asChild><button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Como foi calculado o Custo do Negócio?"><CircleHelp className="w-3.5 h-3.5" /></button></PopoverTrigger><PopoverContent className="w-96 text-sm" align="start"><p className="font-medium">Como este valor foi calculado?</p><p className="text-muted-foreground mt-2">{explicacaoCustoNegocio}</p><Link to="/custos/despesas" className="text-xs font-medium text-primary underline mt-3 inline-block">Revisar Minhas Despesas</Link></PopoverContent></Popover></span><strong>{money(resultado.rateio.custoDaProducao)}</strong></div>
                {resultado.rateio.aplicar && <p className="text-[11px] text-muted-foreground">{money(resultado.rateio.custoPorUnidade)} por receita, conforme configuração em Minhas Despesas.</p>}
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 grid sm:grid-cols-3 gap-3"><div><p className="text-xs text-muted-foreground">Custo total da produção</p><p className="text-xl font-bold text-primary">{money(resultado.custoTotal)}</p><p className="text-[11px] text-muted-foreground mt-1">Tudo o que custa produzir a quantidade informada.</p></div><div><p className="text-xs text-muted-foreground">Custo por receita</p><p className="text-xl font-bold">{money(resultado.custoUnitario)}</p><p className="text-[11px] text-muted-foreground mt-1">Custo de 1 rendimento completo. Ainda não é o preço de venda.</p></div><div><p className="text-xs text-muted-foreground">Custo por porção</p><p className="text-xl font-bold">{totalPorcoes > 0 ? money(resultado.custoPorPorcao) : "—"}</p><p className="text-[11px] text-muted-foreground mt-1">Custo estimado de uma porção da receita.</p></div></div>
            </>}
          </Card>

          <Card className="p-5 space-y-4">
            <div><p className="text-xs font-semibold text-primary">PASSO 4</p><h2 className="font-semibold text-lg">Por quanto pretende vender?</h2><p className="text-xs text-muted-foreground mt-1">Aqui o sistema transforma o <strong className="text-foreground">custo por receita</strong> do Passo 3 em <strong className="text-foreground">preço de venda por receita</strong>. Preço, margem e markup ficam vinculados: o último campo alterado passa a comandar o cálculo.</p></div>
            <div className="grid sm:grid-cols-3 gap-3 items-start">
              <div><Label>Preço de venda por receita</Label><Input type="number" min="0" step="0.01" value={valorPrecoCampo} onChange={(e) => editarPreco(e.target.value)} placeholder="0,00" /><p className="text-[11px] text-muted-foreground mt-1">Valor que você pretende cobrar por 1 receita completa.</p></div>
              <div><Label>Margem (%)</Label><Input type="number" min="0" max="99.9" step="0.1" value={valorMargemCampo} onChange={(e) => editarMargem(e.target.value)} placeholder="Ex.: 40" /><p className="text-[11px] text-muted-foreground mt-1">Percentual do preço de venda que sobra após descontar o custo considerado.</p></div>
              <div><div className="flex items-center gap-1.5"><Label>Markup (x)</Label><Popover><PopoverTrigger asChild><button type="button" className="text-muted-foreground hover:text-foreground" aria-label="O que é markup?"><CircleHelp className="w-3.5 h-3.5" /></button></PopoverTrigger><PopoverContent className="w-80 text-sm" align="start"><p className="font-medium">Preço, margem e markup trabalham juntos.</p><div className="text-muted-foreground mt-2 space-y-1"><p>Alterou o <strong className="text-foreground">Preço</strong> → recalculamos Margem + Markup.</p><p>Alterou a <strong className="text-foreground">Margem</strong> → recalculamos Preço + Markup.</p><p>Alterou o <strong className="text-foreground">Markup</strong> → recalculamos Preço + Margem.</p></div><p className="text-muted-foreground mt-2">O último campo alterado passa a comandar o cálculo.</p><div className="border-t mt-3 pt-3"><p className="font-medium">Markup é um multiplicador, não uma porcentagem.</p><p className="text-muted-foreground mt-2">Exemplo: custo de R$ 100,00 com markup de <strong className="text-foreground">2,50x</strong> gera preço-base de R$ 250,00.</p><p className="text-muted-foreground mt-2">O markup alterado aqui vale somente para esta receita e não muda o padrão das Configurações.</p></div></PopoverContent></Popover></div><Input type="number" min="0.01" step="0.01" value={valorMarkupCampo} onChange={(e) => editarMarkup(e.target.value)} placeholder="Ex.: 2,50" /><p className="text-[11px] text-muted-foreground mt-1">Multiplicador. Ex.: 2,50x — não use %.</p></div>
            </div>
            {campoPrecoAtivo === "margem" && n(margemEntrada) >= 100 && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">A margem precisa ser menor que 100% para calcular um preço de venda.</div>}
            {!formacaoPreco && precoValido && <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm"><div className="flex items-center gap-2"><Info className="w-4 h-4 text-primary" /><p className="font-semibold">Como chegamos a estes valores?</p></div>{formacaoDireta.origem === "markup" ? <><p className="text-muted-foreground">O cálculo está sendo comandado pelo <strong className="text-foreground">markup de {Number(formacaoDireta.markup || 0).toFixed(2).replace(".", ",")}x</strong>.</p><p><strong>{money(resultado.custoUnitario)}</strong> de custo por receita × <strong>{Number(formacaoDireta.markup || 0).toFixed(2).replace(".", ",")}x</strong> = <strong>{money(precoVendaEfetivo)}</strong> de preço de venda.</p><p className="text-xs text-muted-foreground">Com esse preço, a margem calculada é {Number(formacaoDireta.margem || 0).toFixed(1).replace(".", ",")}%.</p></> : formacaoDireta.origem === "margem" || formacaoDireta.origem === "margem_padrao" ? <><p className="text-muted-foreground">O cálculo está sendo comandado pela <strong className="text-foreground">{formacaoDireta.origem === "margem_padrao" ? "margem inicial sugerida" : "margem desejada"} de {Number(formacaoDireta.margem || 0).toFixed(1).replace(".", ",")}%</strong>.</p><p>Com custo de <strong>{money(resultado.custoUnitario)}</strong> por receita, o preço necessário é <strong>{money(precoVendaEfetivo)}</strong>.</p><p className="text-xs text-muted-foreground">Esse preço corresponde a um markup de {Number(formacaoDireta.markup || 0).toFixed(2).replace(".", ",")}x. A margem é apenas um ponto de partida editável.</p></> : <><p className="text-muted-foreground">O cálculo está sendo comandado pelo <strong className="text-foreground">preço de venda informado</strong>.</p><p>Preço <strong>{money(precoVendaEfetivo)}</strong> ÷ custo <strong>{money(resultado.custoUnitario)}</strong> = markup de <strong>{Number(formacaoDireta.markup || 0).toFixed(2).replace(".", ",")}x</strong>.</p><p className="text-xs text-muted-foreground">A margem resultante é {Number(formacaoDireta.margem || 0).toFixed(1).replace(".", ",")}%.</p></>}</div>}
            <Button variant="outline" onClick={() => setShowFormacaoPreco(true)} disabled={!receita || !tecnico?.completo || qtd <= 0 || resultado.custoUnitario <= 0 || !resultado.valido}><Calculator className="w-4 h-4 mr-2" /> Formação avançada do preço</Button>
            {formacaoPreco && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs"><p className="font-medium text-primary">Formação avançada aplicada</p><p className="text-muted-foreground mt-1">Margem alvo {Number(formacaoPreco.margemDesejadaPct || 0).toFixed(1).replace(".", ",")}% · custo médio de comercialização {Number(formacaoPreco.taxasVariaveisPct || 0).toFixed(1).replace(".", ",")}% · preço sugerido {money(formacaoPreco.precoSugerido)}</p><p className="text-muted-foreground mt-1">Se você editar Preço, Margem ou Markup acima, o cálculo volta ao modo direto.</p></div>}
          </Card>

          <div className="flex justify-end"><Button onClick={salvar} disabled={salvando || !receita || !tecnico?.completo || qtd <= 0 || !recalculoValido || !resultado.valido || !precoValido}>{salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />} {recalcularId ? "Gerar nova versão da Ficha" : "Gerar Ficha de Custo"}</Button></div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-20">
          <Card className="p-5"><h2 className="font-semibold">Resumo</h2><div className="space-y-3 mt-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Receita</span><strong className="text-right max-w-[160px] truncate">{receita?.nome || "—"}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Produção</span><strong>{qtd > 0 ? `${qtd} receita(s)` : "—"}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Custo técnico</span><strong>{money(tecnico?.custoTecnicoTotal)}</strong></div>{totalInsumosAdicionais > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Insumos adicionais</span><strong>{money(totalInsumosAdicionais)}</strong></div>}<div className="flex justify-between"><span className="text-muted-foreground">Custo do Negócio</span><strong>{money(resultado.rateio.custoDaProducao)}</strong></div><div className="border-t pt-3 flex justify-between"><span className="font-medium">Custo total da produção</span><strong className="text-primary">{money(resultado.custoTotal)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Custo por receita</span><strong>{money(resultado.custoUnitario)}</strong></div>{precoValido && <><div className="border-t pt-3 flex justify-between"><span className="font-medium">Preço de venda por receita</span><strong>{money(precoVendaEfetivo)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Margem</span><strong>{Number(formacaoDireta.margem || 0).toFixed(1).replace(".", ",")}%</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Markup</span><strong>{Number(formacaoDireta.markup || 0).toFixed(2).replace(".", ",")}x</strong></div></>}</div></Card>
          <Card className="p-4 flex gap-3"><Info className="w-5 h-5 text-primary shrink-0" /><div><p className="text-sm font-medium">Custos importados e configuração global</p><p className="text-xs text-muted-foreground mt-1">Ingredientes, insumos e embalagens específicas vêm do Laboratório de Cozinha. O Custo do Negócio é aplicado somente se estiver ativado em Minhas Despesas.</p><Link to="/custos/despesas" className="text-xs font-medium text-primary underline mt-2 inline-block">Revisar Minhas Despesas</Link></div></Card>
          {!resultado.rateio.valido && <Card className="p-4 border-amber-300 bg-amber-50"><p className="text-sm font-medium text-amber-900">Custo do Negócio ainda não pode ser distribuído</p><p className="text-xs text-amber-800 mt-1">A aplicação está ativada, mas faltam dados de produção na base Dia/Mês escolhida.</p><Link to="/custos/despesas" className="text-xs font-medium text-amber-900 underline mt-2 inline-block">Configurar Custo do Negócio</Link></Card>}
        </div>
      </div>

      <FormacaoPrecoDialog
        open={showFormacaoPreco}
        onClose={() => setShowFormacaoPreco(false)}
        onApply={(dados) => {
          setFormacaoPreco(dados);
          setCampoPrecoAtivo("avancada");
        }}
        custoUnitario={resultado.custoUnitario}
        custoPorPorcao={resultado.custoPorPorcao}
        custoRateadoUnitario={qtd > 0 ? resultado.rateio.custoDaProducao / qtd : 0}
        margemPadrao={Number(config?.margem_padrao ?? 20)}
        dadosIniciais={formacaoPreco}
        custoComercializacaoPct={Number(config?.custo_comercializacao_pct || 0)}
        aplicarCustoComercializacao={Boolean(config?.aplicar_custo_comercializacao)}
      />
    </div>
  );
}
