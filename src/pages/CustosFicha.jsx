import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, ArrowLeft, Calculator, ChevronRight, ExternalLink, RefreshCw, WalletCards } from "lucide-react";

const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v) => `${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const numero = (v, max = 2) => Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: max });
const dataHora = (v) => v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export default function CustosFicha() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complementaresOpen, setComplementaresOpen] = useState(false);

  const { data: calculos = [], isLoading } = useQuery({
    queryKey: ["custos-ficha", id, user?.id],
    queryFn: () => base44.entities.CalculoCusto.filter({ id, user_id: user.id }, "-data_calculo", 1),
    enabled: !!id && !!user?.id,
    staleTime: 0,
  });
  const calculo = calculos[0] || null;

  const { data: itens = [] } = useQuery({
    queryKey: ["custos-ficha-itens", id, user?.id],
    queryFn: () => base44.entities.CalculoCustoItem.filter({ calculo_id: id, user_id: user.id }, "ordem", 100),
    enabled: !!id && !!user?.id && !!calculo,
    staleTime: 0,
  });

  const { data: receitas = [] } = useQuery({
    queryKey: ["custos-ficha-receita-atual", calculo?.origem_id],
    queryFn: () => base44.entities.Receita.filter({ id: calculo.origem_id }, "", 1),
    enabled: !!calculo?.origem_id,
    staleTime: 0,
  });
  const receitaAtual = receitas[0] || null;

  const { data: versoesPosteriores = [] } = useQuery({
    queryKey: ["custos-ficha-versao-posterior", calculo?.id, user?.id],
    queryFn: () => base44.entities.CalculoCusto.filter({ calculo_origem_id: calculo.id, user_id: user.id }, "-data_calculo", 1),
    enabled: !!calculo?.id && !!user?.id,
    staleTime: 0,
  });
  const versaoPosterior = versoesPosteriores[0] || null;
  const ehVersaoAtual = !versaoPosterior;

  const receitaMudou = useMemo(() => {
    if (!calculo?.origem_versao_snapshot || !receitaAtual) return false;
    const atual = String(receitaAtual.updated_date || receitaAtual.data_personalizacao || receitaAtual.created_date || "");
    return !!atual && atual !== String(calculo.origem_versao_snapshot);
  }, [calculo, receitaAtual]);

  const somaItens = useMemo(() => itens.reduce((s, i) => s + Number(i.valor_total || 0), 0), [itens]);
  const diferencaComposicao = calculo ? Math.abs(somaItens - Number(calculo.custo_total || 0)) : 0;
  const preco = Number(calculo?.preco_venda_informado || 0);
  const formacaoAssistida = calculo?.formacao_preco_metodo === "margem";
  const taxasVariaveisPct = Number(calculo?.taxas_variaveis_pct || 0);
  const custoFixoVenda = Number(calculo?.custo_fixo_adicional_unitario || 0);
  const taxasVendaUnitario = preco * taxasVariaveisPct / 100;
  const custosComercializacaoUnitario = taxasVendaUnitario + custoFixoVenda;
  const lucroUnitario = preco - Number(calculo?.custo_unitario || 0) - custosComercializacaoUnitario;
  const margemPositiva = preco > 0 && lucroUnitario >= 0;
  const categoria = calculo?.categoria_snapshot || "Sem categoria";

  if (isLoading) return <div className="py-12 text-center text-sm text-muted-foreground">Carregando ficha...</div>;
  if (!calculo) return (
    <div className="max-w-3xl mx-auto py-12">
      <Card className="p-8 text-center"><AlertCircle className="w-8 h-8 mx-auto text-muted-foreground" /><h1 className="font-semibold text-lg mt-3">Ficha não encontrada</h1><p className="text-sm text-muted-foreground mt-1">O cálculo pode ter sido removido ou não pertence a este usuário.</p><Button className="mt-4" variant="outline" onClick={() => navigate("/custos")}>Voltar ao Laboratório de Custos</Button></Card>
    </div>
  );

  return (
    <div className="space-y-5 pb-24 md:pb-8 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <div><div className="flex items-center gap-2 flex-wrap"><h1 className="font-display text-2xl font-bold">Ficha de Custo</h1><Badge variant="outline">Versão {calculo.versao_calculo || 1}</Badge></div><p className="text-sm text-muted-foreground mt-1">Registro histórico do custo calculado. Os valores desta ficha ficam preservados e não mudam automaticamente.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ehVersaoAtual ? <Button variant="outline" onClick={() => navigate(`/custos/calcular?receita=${encodeURIComponent(calculo.origem_id)}&recalcular=${encodeURIComponent(calculo.id)}`)}><RefreshCw className="w-4 h-4 mr-2" /> Recalcular com preços atuais</Button> : <Button variant="outline" onClick={() => navigate(`/custos/ficha/${versaoPosterior.id}`)}><RefreshCw className="w-4 h-4 mr-2" /> Ver versão posterior</Button>}
        </div>
      </div>

      {receitaMudou && <Card className="p-4 border-amber-300 bg-amber-50 flex gap-3"><AlertCircle className="w-5 h-5 text-amber-800 shrink-0" /><div><p className="text-sm font-medium text-amber-900">A receita foi alterada depois deste cálculo.</p><p className="text-xs text-amber-800 mt-1">Esta ficha continua mostrando os valores originais. {ehVersaoAtual ? "Use “Recalcular com preços atuais” para gerar uma nova versão." : "Já existe uma versão posterior desta ficha; avance para ela antes de recalcular novamente."}</p></div></Card>}

      {!ehVersaoAtual && <Card className="px-4 py-3 bg-muted/40 border-dashed"><p className="text-sm font-medium">Esta é uma versão histórica.</p><p className="text-xs text-muted-foreground mt-1">A versão {versaoPosterior.versao_calculo || Number(calculo.versao_calculo || 1) + 1} foi criada a partir desta ficha. O histórico permanece preservado e novos recálculos devem partir da versão mais recente.</p></Card>}

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {calculo.foto_url_snapshot ? <img src={calculo.foto_url_snapshot} alt="" className="w-20 h-20 rounded-xl object-cover border" /> : <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center"><Calculator className="w-8 h-8 text-primary" /></div>}
          <div className="flex-1 min-w-0"><h2 className="font-display text-xl font-bold truncate">{calculo.origem_nome_snapshot}</h2><div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2"><span>{categoria}</span><span>Origem: Laboratório de Cozinha</span><span>{numero(calculo.quantidade_produzida)} receita(s)</span><span>Calculado em {dataHora(calculo.data_calculo)}</span></div></div>
          {receitaAtual && <Link to={`/receita/${calculo.origem_id}`} className="text-xs text-primary inline-flex items-center gap-1">Ver receita atual <ExternalLink className="w-3 h-3" /></Link>}
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Custo total da produção</p><p className="text-2xl font-bold text-primary mt-1">{money(calculo.custo_total)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Custo por receita</p><p className="text-2xl font-bold mt-1">{money(calculo.custo_unitario)}</p><p className="text-[11px] text-muted-foreground mt-1">1 receita = 1 rendimento completo</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Preço de venda</p><p className="text-2xl font-bold mt-1">{preco > 0 ? money(preco) : "—"}</p><p className="text-[11px] text-muted-foreground mt-1">{formacaoAssistida ? "preço sugerido aplicado" : "valor informado"}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">{formacaoAssistida ? "Margem líquida" : "Margem estimada"}</p><p className="text-2xl font-bold mt-1">{preco > 0 ? pct(calculo.margem_estimada) : "—"}</p><p className="text-[11px] text-muted-foreground mt-1">{formacaoAssistida ? "após custos de comercialização" : "antes de custos de comercialização"}</p></Card>
      </div>

      <div className="grid lg:grid-cols-[1.25fr_.75fr] gap-4 items-start">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-lg">Composição do custo</h2><p className="text-xs text-muted-foreground mt-1">Principais componentes desta ficha.</p></div><WalletCards className="w-5 h-5 text-primary" /></div>
          <div className="mt-4 divide-y">
            {itens.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Detalhamento indisponível para este cálculo.</p> : itens.map((item) => <div key={item.id} className="py-3 flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-sm font-medium">{item.descricao}</p><p className="text-[11px] text-muted-foreground mt-0.5">{item.origem}</p></div><strong className="text-sm whitespace-nowrap">{money(item.valor_total)}</strong></div>)}
            <div className="pt-4 flex justify-between"><span className="font-semibold">Custo total</span><strong className="text-primary text-lg">{money(calculo.custo_total)}</strong></div>
          </div>
          {diferencaComposicao > 0.01 && <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">Há uma diferença de {money(diferencaComposicao)} entre o detalhamento salvo e o total da ficha. Cálculos criados antes da C6 podem não ter todos os itens históricos detalhados.</div>}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-lg">Análise rápida</h2>
          <div className="space-y-3 mt-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">{formacaoAssistida ? "Preço sugerido aplicado" : "Preço informado"}</span><strong>{preco > 0 ? money(preco) : "—"}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Custo por receita</span><strong>{money(calculo.custo_unitario)}</strong></div>{formacaoAssistida && custosComercializacaoUnitario > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Custos de comercialização</span><strong>{money(custosComercializacaoUnitario)}</strong></div>}{formacaoAssistida && taxasVariaveisPct > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Custo médio de comercialização</span><strong>{pct(taxasVariaveisPct)}</strong></div>}{formacaoAssistida && custoFixoVenda > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Custo adicional histórico</span><strong>{money(custoFixoVenda)}</strong></div>}<div className="flex justify-between"><span className="text-muted-foreground">Lucro {formacaoAssistida ? "líquido" : "estimado"} por receita</span><strong>{preco > 0 ? money(lucroUnitario) : "—"}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">{formacaoAssistida ? "Margem líquida" : "Margem estimada"}</span><strong>{preco > 0 ? pct(calculo.margem_estimada) : "—"}</strong></div></div>
          {preco > 0 ? <div className={`mt-4 rounded-lg p-3 text-sm ${margemPositiva ? "bg-primary/5 border border-primary/20 text-primary" : "bg-red-50 border border-red-200 text-red-800"}`}>{margemPositiva ? (formacaoAssistida ? "Este preço cobre o custo por receita, os custos de comercialização informados e preserva resultado positivo." : "Este preço cobre o custo calculado. A margem exibida é estimada antes de eventuais custos de comercialização.") : "Este preço está abaixo dos custos considerados nesta ficha."}</div> : <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">Nenhum preço de venda foi informado nesta ficha.</div>}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <Accordion type="single" collapsible value={complementaresOpen ? "complementares" : ""} onValueChange={(v) => setComplementaresOpen(v === "complementares")}>
          <AccordionItem value="complementares" className="border-0"><AccordionTrigger className="px-5 py-4 hover:no-underline"><div className="text-left"><p className="font-semibold">Informações complementares</p><p className="text-xs font-normal text-muted-foreground mt-1">Parâmetros, valores técnicos e detalhes do cálculo.</p></div></AccordionTrigger><AccordionContent className="px-5 pb-5"><div className="grid md:grid-cols-2 gap-4 text-sm"><div className="rounded-lg border p-4 space-y-2"><h3 className="font-semibold">Parâmetros da produção</h3><div className="flex justify-between"><span className="text-muted-foreground">Quantidade produzida</span><strong>{numero(calculo.quantidade_produzida)} receita(s)</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Porções estimadas</span><strong>{numero(calculo.total_porcoes_snapshot, 1)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Rendimento base</span><strong>{numero(calculo.rendimento_snapshot)} {calculo.rendimento_unidade_snapshot || ""}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Versão do motor técnico</span><strong>{calculo.modelo_tecnico_versao || "—"}</strong></div></div><div className="rounded-lg border p-4 space-y-2"><h3 className="font-semibold">Custos técnicos registrados</h3><div className="flex justify-between"><span className="text-muted-foreground">Ingredientes</span><strong>{money(calculo.custo_ingredientes_snapshot)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Insumos técnicos</span><strong>{money(calculo.custo_insumos_tecnicos_snapshot)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Ingredientes esquecidos</span><strong>{money(calculo.custo_esquecidos_snapshot)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Custo técnico total</span><strong>{money(calculo.custo_tecnico_snapshot)}</strong></div></div><div className="rounded-lg border p-4 space-y-2"><h3 className="font-semibold">Formação do custo</h3>{Number(calculo.custo_embalagens || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Embalagem adicional histórica</span><strong>{money(calculo.custo_embalagens)}</strong></div>}{Number(calculo.custo_mao_obra || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Mão de obra histórica</span><strong>{money(calculo.custo_mao_obra)}</strong></div>}<div className="flex justify-between"><span className="text-muted-foreground">Custo do Negócio</span><strong>{money(calculo.custo_rateado)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Custo por porção</span><strong>{money(calculo.custo_por_porcao)}</strong></div></div><div className="rounded-lg border p-4 space-y-2"><h3 className="font-semibold">Preço</h3><div className="flex justify-between"><span className="text-muted-foreground">Método</span><strong>{formacaoAssistida ? "Formação avançada" : "Formação direta"}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Markup aplicado</span><strong>{Number(calculo.markup_aplicado || 0) > 0 ? `${numero(calculo.markup_aplicado)}x` : "—"}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">{formacaoAssistida ? "Margem líquida" : "Margem estimada"}</span><strong>{preco > 0 ? pct(calculo.margem_estimada) : "—"}</strong></div>{formacaoAssistida && taxasVariaveisPct > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Custo médio de comercialização</span><strong>{pct(taxasVariaveisPct)}</strong></div>}{custoFixoVenda > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Custo adicional histórico</span><strong>{money(custoFixoVenda)}</strong></div>}<div className="flex justify-between"><span className="text-muted-foreground">Status</span><strong>{calculo.status}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Versão da ficha</span><strong>{calculo.versao_calculo || 1}</strong></div></div></div></AccordionContent></AccordionItem>
        </Accordion>
      </Card>

      <div className="flex justify-between gap-3"><Button variant="ghost" onClick={() => navigate("/custos")}><ArrowLeft className="w-4 h-4 mr-2" /> Laboratório de Custos</Button><Button variant="outline" onClick={() => navigate(`/custos/calcular?receita=${encodeURIComponent(calculo.origem_id)}`)}>Novo cálculo desta receita <ChevronRight className="w-4 h-4 ml-2" /></Button></div>
    </div>
  );
}
