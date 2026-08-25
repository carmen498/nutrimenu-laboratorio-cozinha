import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { carregarContextoCustosReceitas } from "@/lib/custoContexto";
import { calcularCustoTecnicoReceitaParaCustos } from "@/lib/custos/custoTecnicoReceita";
import { calcularLaboratorioCustos } from "@/lib/custos/motorCustos";
import { rendimentoEfetivo } from "@/lib/custoReceita";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Calculator, ChefHat, ExternalLink, FileText, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import FormacaoPrecoDialog from "@/components/custos/FormacaoPrecoDialog";

const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const n = (v) => { const x = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(x) ? x : 0; };

export default function CustosCalcular() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [receitaId, setReceitaId] = useState(() => searchParams.get("receita") || "");
  const recalcularId = searchParams.get("recalcular") || "";
  const [quantidade, setQuantidade] = useState("1");
  const [horas, setHoras] = useState("0");
  const [valorHora, setValorHora] = useState("");
  const [embalagemAdicional, setEmbalagemAdicional] = useState("0");
  const [outrosCustos, setOutrosCustos] = useState("0");
  const [precoVenda, setPrecoVenda] = useState("");
  const [showFormacaoPreco, setShowFormacaoPreco] = useState(false);
  const [formacaoPreco, setFormacaoPreco] = useState(null);
  const [salvando, setSalvando] = useState(false);

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
  const recalculoValido = !recalcularId || !!calculoAnterior;
  const [recalculoInicializado, setRecalculoInicializado] = useState(false);
  useEffect(() => {
    if (!recalcularId || !calculoAnterior || loadingItensRecalculo || recalculoInicializado) return;
    const itemMaoObra = itensCalculoAnterior.find((i) => i.tipo === "mao_obra");
    const itemOutros = itensCalculoAnterior.find((i) => i.tipo === "outro");
    setQuantidade(String(calculoAnterior.quantidade_produzida || 1));
    setHoras(String(itemMaoObra?.quantidade || 0));
    setValorHora(itemMaoObra?.valor_unitario != null ? String(itemMaoObra.valor_unitario) : "");
    setEmbalagemAdicional(String(calculoAnterior.custo_embalagens || 0));
    setOutrosCustos(String(itemOutros?.valor_total || 0));
    setPrecoVenda("");
    setFormacaoPreco(null);
    setRecalculoInicializado(true);
  }, [recalcularId, calculoAnterior, itensCalculoAnterior, loadingItensRecalculo, recalculoInicializado]);

  const qtd = Math.max(0, n(quantidade));
  const valorHoraEfetivo = valorHora === "" ? Number(config?.valor_hora_padrao || 0) : n(valorHora);

  const tecnico = useMemo(() => {
    if (!receita || !contexto || qtd <= 0) return null;
    return calcularCustoTecnicoReceitaParaCustos({
      receita,
      ingredientesReceita: contexto.ingredientesPorReceita?.[receita.id] || [],
      ingredienteMap: contexto.ingredienteMap || {},
      insumosReceita: contexto.insumosPorReceita?.[receita.id] || [],
      esquecidos: contexto.esquecidosPorReceita?.[receita.id] || [],
      fator: qtd,
      numeroLotes: qtd,
    });
  }, [receita, contexto, qtd]);

  const totalPorcoes = tecnico?.porcoesEfetivas || 0;
  const resultado = useMemo(() => calcularLaboratorioCustos({
    custoTecnicoProducao: tecnico?.custoTecnicoTotal || 0,
    despesas,
    volumeMensal: Number(config?.volume_mensal_estimado || 0),
    quantidadeProduzida: qtd,
    gruposRateio: Array.isArray(config?.grupos_rateio_incluidos)
      ? config.grupos_rateio_incluidos
      : ["gastos_negocio", "producao", "embalagem_outros"],
    horasMaoDeObra: n(horas),
    valorHora: valorHoraEfetivo,
    custoEmbalagemAdicional: n(embalagemAdicional),
    outrosCustos: n(outrosCustos),
    totalPorcoes,
    precoVendaUnitario: n(precoVenda),
  }), [tecnico, despesas, config?.volume_mensal_estimado, config?.grupos_rateio_incluidos, qtd, horas, valorHoraEfetivo, embalagemAdicional, outrosCustos, totalPorcoes, precoVenda]);

  const rendimentoBase = receita && contexto ? rendimentoEfetivo(receita, contexto.ingredientesPorReceita?.[receita.id] || []) : 0;
  const categoria = receita?.categorias?.[0] || receita?.categoria || "";

  const salvar = async () => {
    if (!user?.id || !receita || !tecnico || qtd <= 0) return toast.error("Selecione uma receita e informe a produção.");
    if (!recalculoValido) return toast.error("A ficha anterior não foi encontrada. Abra novamente pelo Histórico.");
    if (!tecnico.completo) return toast.error("A receita possui pendências de custo. Corrija preços/referências antes de salvar a ficha.");
    if (!resultado.valido) return toast.error("Configure o volume mensal de receitas antes de finalizar este cálculo.");
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
        custo_embalagens: n(embalagemAdicional),
        custo_mao_obra: resultado.maoDeObra.total,
        custo_rateado: resultado.rateio.custoDaProducao,
        custo_total: resultado.custoTotal,
        custo_unitario: resultado.custoUnitario,
        custo_por_porcao: resultado.custoPorPorcao,
        preco_venda_informado: n(precoVenda),
        preco_sugerido: formacaoPreco?.precoSugerido || 0,
        markup_aplicado: formacaoPreco?.markup ?? resultado.markupMultiplicador,
        margem_estimada: formacaoPreco?.margemLiquidaPct ?? resultado.margemEstimada,
        formacao_preco_metodo: formacaoPreco ? "margem" : "informado",
        margem_desejada_pct: formacaoPreco?.margemDesejadaPct || 0,
        taxa_cartao_pct: formacaoPreco?.taxaCartaoPct || 0,
        impostos_pct: formacaoPreco?.impostosPct || 0,
        taxas_variaveis_pct: formacaoPreco?.taxasVariaveisPct || 0,
        custo_fixo_adicional_unitario: formacaoPreco?.custoFixoAdicionalUnitario || 0,
        status: recalcularId ? "recalculado" : "finalizado",
        calculo_origem_id: recalcularId || "",
      };

      const itens = [
        { tipo: "ingredientes", descricao: "Ingredientes da receita", origem: "Motor de Custos Canônico", formula: `${qtd} receita(s) × composição técnica`, quantidade: qtd, valor_unitario: qtd > 0 ? tecnico.custoIngredientes / qtd : 0, valor_total: tecnico.custoIngredientes, ordem: 1 },
        { tipo: "ingredientes", descricao: "Ingredientes esquecidos", origem: "Laboratório de Cozinha", formula: "Conforme registros técnicos da receita", quantidade: qtd, valor_unitario: qtd > 0 ? tecnico.custoEsquecidos / qtd : 0, valor_total: tecnico.custoEsquecidos, ordem: 2 },
        { tipo: "embalagem", descricao: "Insumos/embalagens técnicos da receita", origem: "Laboratório de Cozinha", formula: "Conforme cadastro técnico da receita", quantidade: qtd, valor_unitario: qtd > 0 ? tecnico.custoInsumosTecnicos / qtd : 0, valor_total: tecnico.custoInsumosTecnicos, ordem: 3 },
        { tipo: "embalagem", descricao: "Embalagem/custo específico adicional", origem: "Informado neste cálculo", formula: "Valor direto", quantidade: 1, valor_unitario: n(embalagemAdicional), valor_total: n(embalagemAdicional), ordem: 4 },
        { tipo: "mao_obra", descricao: "Mão de obra direta", origem: "Informado neste cálculo", formula: `${n(horas)} h × ${money(valorHoraEfetivo)}/h`, quantidade: n(horas), valor_unitario: valorHoraEfetivo, valor_total: resultado.maoDeObra.total, ordem: 5 },
        { tipo: "despesa_rateada", descricao: "Despesas mensais rateadas", origem: "Minhas Despesas", formula: `${money(resultado.rateio.custoPorUnidade)} × ${qtd} receita(s)`, quantidade: qtd, valor_unitario: resultado.rateio.custoPorUnidade, valor_total: resultado.rateio.custoDaProducao, ordem: 6 },
        { tipo: "outro", descricao: "Outros custos desta produção", origem: "Informado neste cálculo", formula: "Valor direto", quantidade: 1, valor_unitario: n(outrosCustos), valor_total: n(outrosCustos), ordem: 7 },
      ].filter((i) => i.valor_total > 0 || i.ordem === 1);

      const resposta = await base44.functions.invoke("salvarCalculoCusto", { calculo: payloadCalculo, itens });
      const calculoId = resposta?.data?.calculo_id;
      if (!resposta?.data?.success || !calculoId) throw new Error(resposta?.data?.error || "A gravação segura da ficha não foi confirmada.");
      qc.invalidateQueries({ queryKey: ["custos-historico", user.id] });
      toast.success(recalcularId ? "Nova versão salva." : "Ficha de custo salva.");
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

      {recalcularId && (loadingRecalculo || loadingItensRecalculo ? <Card className="p-4 text-sm text-muted-foreground">Carregando a ficha anterior para gerar uma nova versão...</Card> : calculoAnterior ? <Card className="p-4 border-primary/20 bg-primary/5"><p className="text-sm font-medium text-primary">Recalculando {calculoAnterior.origem_nome_snapshot}</p><p className="text-xs text-muted-foreground mt-1">Será criada a versão {Number(calculoAnterior.versao_calculo || 1) + 1}. Quantidade, mão de obra e custos diretos foram reaproveitados da ficha anterior; o preço de venda deve ser revisto com o custo atualizado.</p></Card> : <Card className="p-4 border-red-200 bg-red-50"><p className="text-sm font-medium text-red-800">A ficha anterior não foi encontrada.</p><p className="text-xs text-red-700 mt-1">Volte ao Histórico e inicie o recálculo novamente.</p></Card>)}

      <div className="grid xl:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="space-y-4">
          <Card className="p-5 space-y-3">
            <div><p className="text-xs font-semibold text-primary">PASSO 1</p><h2 className="font-semibold text-lg">Qual receita você quer calcular?</h2></div>
            <select value={receitaId} onChange={(e) => setReceitaId(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Selecione uma receita...</option>
              {receitas.map((r) => <option key={r.id} value={r.id}>{r.nome}{r.is_base === false ? " · Minha Receita" : ""}</option>)}
            </select>
            {loadingReceitas && <p className="text-xs text-muted-foreground">Carregando receitas...</p>}
            {receita && <div className="flex items-center gap-3 rounded-lg border p-3"><ChefHat className="w-5 h-5 text-primary" /><div className="flex-1"><p className="font-medium">{receita.nome}</p><p className="text-xs text-muted-foreground">{categoria || "Sem categoria"} · origem: Laboratório de Cozinha</p></div><Link to={`/receita/${receita.id}`} className="text-xs text-primary inline-flex gap-1">Ver receita <ExternalLink className="w-3 h-3" /></Link></div>}
          </Card>

          <Card className="p-5 space-y-4">
            <div><p className="text-xs font-semibold text-primary">PASSO 2</p><h2 className="font-semibold text-lg">Quanto pretende produzir?</h2><p className="text-xs text-muted-foreground">1 receita corresponde a 1 rendimento completo da receita selecionada.</p></div>
            <div className="grid sm:grid-cols-3 gap-3"><div className="sm:col-span-1"><Label>Quantidade de receitas</Label><Input type="number" min="0.01" step="0.01" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Rendimento estimado</p><p className="font-semibold mt-1">{tecnico ? `${Math.round(tecnico.rendimento)} ${receita?.unidade_base || "g"}` : "—"}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Porções estimadas</p><p className="font-semibold mt-1">{tecnico ? totalPorcoes.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}</p></div></div>
          </Card>

          <Card className="p-5 space-y-4">
            <div><p className="text-xs font-semibold text-primary">PASSO 3</p><h2 className="font-semibold text-lg">Custo desta produção</h2></div>
            {loadingContexto ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Calculando custo técnico...</div> : !receita ? <p className="text-sm text-muted-foreground">Selecione uma receita para calcular.</p> : <>
              {!tecnico?.completo && tecnico && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex gap-2"><AlertCircle className="w-4 h-4 mt-0.5" /><span>Há {tecnico.itensSemPreco + tecnico.insumosSemPreco + tecnico.referenciasAusentes} pendência(s) de preço/referência na receita. O valor pode estar incompleto.</span></div>}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Ingredientes</span><strong>{money(tecnico?.custoIngredientes)}</strong></div>
                <div className="flex justify-between"><span>Insumos/embalagens já cadastrados na receita</span><strong>{money(tecnico?.custoInsumosTecnicos)}</strong></div>
                {Number(tecnico?.custoEsquecidos || 0) > 0 && <div className="flex justify-between"><span>Ingredientes esquecidos</span><strong>{money(tecnico?.custoEsquecidos)}</strong></div>}
              </div>
              <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t">
                <div><Label>Embalagem/custo específico adicional</Label><Input type="number" min="0" step="0.01" value={embalagemAdicional} onChange={(e) => setEmbalagemAdicional(e.target.value)} /><p className="text-[11px] text-muted-foreground mt-1">Use somente se ainda não estiver cadastrado na receita ou no rateio mensal.</p></div>
                <div><Label>Outros custos desta produção</Label><Input type="number" min="0" step="0.01" value={outrosCustos} onChange={(e) => setOutrosCustos(e.target.value)} /></div>
                <div><Label>Horas de trabalho direto</Label><Input type="number" min="0" step="0.25" value={horas} onChange={(e) => setHoras(e.target.value)} /></div>
                <div><Label>Valor da hora</Label><Input type="number" min="0" step="0.01" value={valorHora === "" ? config?.valor_hora_padrao ?? "" : valorHora} onChange={(e) => setValorHora(e.target.value)} placeholder="0,00" /></div>
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 grid sm:grid-cols-3 gap-3"><div><p className="text-xs text-muted-foreground">Custo total</p><p className="text-xl font-bold text-primary">{money(resultado.custoTotal)}</p></div><div><p className="text-xs text-muted-foreground">Custo por receita</p><p className="text-xl font-bold">{money(resultado.custoUnitario)}</p></div><div><p className="text-xs text-muted-foreground">Custo por porção</p><p className="text-xl font-bold">{totalPorcoes > 0 ? money(resultado.custoPorPorcao) : "—"}</p></div></div>
            </>}
          </Card>

          <Card className="p-5 space-y-4">
            <div><p className="text-xs font-semibold text-primary">PASSO 4</p><h2 className="font-semibold text-lg">Por quanto pretende vender?</h2></div>
            <div className="grid sm:grid-cols-3 gap-3 items-end"><div><Label>Preço de venda por receita</Label><Input type="number" min="0" step="0.01" value={precoVenda} onChange={(e) => { setPrecoVenda(e.target.value); setFormacaoPreco(null); }} placeholder="0,00" /></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{formacaoPreco ? "Margem líquida alvo" : "Margem estimada"}</p><p className="font-semibold mt-1">{n(precoVenda) > 0 ? `${Number(formacaoPreco?.margemLiquidaPct ?? resultado.margemEstimada).toFixed(1).replace(".", ",")}%` : "—"}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Markup</p><p className="font-semibold mt-1">{n(precoVenda) > 0 ? `${Number(formacaoPreco?.markup ?? resultado.markupMultiplicador).toFixed(2).replace(".", ",")}x` : "—"}</p></div></div>
            <Button variant="outline" onClick={() => setShowFormacaoPreco(true)} disabled={!receita || !tecnico?.completo || qtd <= 0 || resultado.custoUnitario <= 0 || !resultado.valido}><Calculator className="w-4 h-4 mr-2" /> Não sei quanto cobrar</Button>
            {formacaoPreco && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs"><p className="font-medium text-primary">Preço formado com margem assistida</p><p className="text-muted-foreground mt-1">Margem alvo {Number(formacaoPreco.margemDesejadaPct || 0).toFixed(1).replace(".", ",")}% · taxas {Number(formacaoPreco.taxasVariaveisPct || 0).toFixed(1).replace(".", ",")}% · preço sugerido {money(formacaoPreco.precoSugerido)}</p></div>}
          </Card>

          <div className="flex justify-end"><Button onClick={salvar} disabled={salvando || !receita || !tecnico?.completo || qtd <= 0 || !recalculoValido || !resultado.valido}>{salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />} {recalcularId ? "Gerar nova versão da Ficha" : "Gerar Ficha de Custo"}</Button></div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4">
          <Card className="p-5"><h2 className="font-semibold">Resumo</h2><div className="space-y-3 mt-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Receita</span><strong className="text-right max-w-[160px] truncate">{receita?.nome || "—"}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Produção</span><strong>{qtd > 0 ? `${qtd} receita(s)` : "—"}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Custo técnico</span><strong>{money(tecnico?.custoTecnicoTotal)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Mão de obra</span><strong>{money(resultado.maoDeObra.total)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Rateio</span><strong>{money(resultado.rateio.custoDaProducao)}</strong></div><div className="border-t pt-3 flex justify-between"><span className="font-medium">Total</span><strong className="text-primary">{money(resultado.custoTotal)}</strong></div></div></Card>
          <Card className="p-4 flex gap-3"><Info className="w-5 h-5 text-primary shrink-0" /><div><p className="text-sm font-medium">Rateio configurável, sem dupla contagem</p><p className="text-xs text-muted-foreground mt-1">Esta produção usa os grupos escolhidos em Configurações de Rateio. “Seu trabalho / ajudantes” permanece separado e é calculado pela mão de obra direta informada aqui.</p><Link to="/custos/configuracoes" className="text-xs font-medium text-primary underline mt-2 inline-block">Revisar configurações de rateio</Link></div></Card>
          {!resultado.rateio.valido && <Card className="p-4 border-amber-300 bg-amber-50"><p className="text-sm font-medium text-amber-900">Rateio ainda não pode ser calculado</p><p className="text-xs text-amber-800 mt-1">Há despesas incluídas no rateio, mas o volume mensal de receitas está zerado. A formação do preço e a geração da ficha ficam bloqueadas para evitar custo subestimado.</p><Link to="/custos/configuracoes" className="text-xs font-medium text-amber-900 underline mt-2 inline-block">Configurar volume mensal</Link></Card>}
        </div>
      </div>

      <FormacaoPrecoDialog
        open={showFormacaoPreco}
        onClose={() => setShowFormacaoPreco(false)}
        onApply={(dados) => {
          setFormacaoPreco(dados);
          setPrecoVenda(Number(dados.precoSugerido || 0).toFixed(2));
        }}
        custoUnitario={resultado.custoUnitario}
        custoPorPorcao={resultado.custoPorPorcao}
        custoRateadoUnitario={qtd > 0 ? resultado.rateio.custoDaProducao / qtd : 0}
        markupPadrao={config?.markup_padrao || 3}
      />
    </div>
  );
}
