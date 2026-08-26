import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { somarDespesasAtivas } from "@/lib/custos/motorCustos";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChefHat,
  Circle,
  FileText,
  History,
  PlayCircle,
  Settings2,
  Target,
  WalletCards,
} from "lucide-react";

const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataCurta = (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "—";
const numero = (v, max = 2) => Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: max });

const GRUPOS_RATEAVEIS = ["gastos_negocio", "producao", "embalagem_outros"];

export default function CustosInicio() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: despesas = [], isLoading: loadingDespesas } = useQuery({
    queryKey: ["custos-despesas", user?.id],
    queryFn: () => base44.entities.DespesaCustoUsuario.filter({ user_id: user.id }, "ordem", 500),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const { data: configuracoes = [], isLoading: loadingConfig } = useQuery({
    queryKey: ["custos-config", user?.id],
    queryFn: () => base44.entities.ConfiguracaoCustosUsuario.filter({ user_id: user.id }, "-updated_date", 10),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const { data: calculos = [], isLoading: loadingCalculos } = useQuery({
    queryKey: ["custos-historico", user?.id],
    queryFn: () => base44.entities.CalculoCusto.filter({ user_id: user.id, tipo_origem: "receita" }, "-data_calculo", 500),
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const config = configuracoes[0] || null;
  const gruposRateio = Array.isArray(config?.grupos_rateio_incluidos)
    ? config.grupos_rateio_incluidos.filter((g) => GRUPOS_RATEAVEIS.includes(g))
    : GRUPOS_RATEAVEIS;
  const volumeMensal = Number(config?.volume_mensal_estimado || 0);

  const totalDespesasAtivas = useMemo(
    () => despesas.filter((d) => d.ativo !== false).reduce((s, d) => s + Number(d.valor_mensal || 0), 0),
    [despesas],
  );
  const totalRateio = useMemo(() => somarDespesasAtivas(despesas, gruposRateio), [despesas, gruposRateio]);
  const custoRateadoPorReceita = volumeMensal > 0 ? totalRateio / volumeMensal : 0;
  const ultimosCalculos = calculos.slice(0, 4);
  const ultimoCalculo = calculos[0] || null;

  const temDespesas = despesas.some((d) => d.ativo !== false);
  const rateioConfigurado = !!config && volumeMensal > 0;
  const temCalculos = calculos.length > 0;

  const fluxo = [
    { label: "Despesas cadastradas", descricao: "Registre seus gastos", concluido: temDespesas, to: "/custos/despesas", Icon: WalletCards },
    { label: "Rateio configurado", descricao: "Distribua os custos", concluido: rateioConfigurado, to: "/custos/configuracoes", Icon: Settings2 },
    { label: "Cálculo realizado", descricao: "Obtenha o custo", concluido: temCalculos, to: "/custos/calcular", Icon: Calculator },
    { label: "Ficha disponível", descricao: "Registre e consulte", concluido: temCalculos, to: "/custos/historico", Icon: FileText },
  ];

  const proximaAcao = !temDespesas
    ? {
        titulo: "Cadastre suas despesas mensais",
        texto: "Comece pelos gastos do negócio, despesas operacionais, pessoal e embalagens gerais.",
        botao: "Abrir Minhas Despesas",
        to: "/custos/despesas",
        Icon: WalletCards,
      }
    : !rateioConfigurado
      ? {
          titulo: "Defina como as despesas serão rateadas",
          texto: "Escolha os grupos que entram no rateio e informe quantas receitas completas você produz por mês.",
          botao: "Configurar rateio",
          to: "/custos/configuracoes",
          Icon: Settings2,
        }
      : {
          titulo: "Calcule uma receita",
          texto: temCalculos
            ? "Seu ambiente está configurado. Gere um novo cálculo quando houver mudança de custo, produção ou preço."
            : "Despesas e rateio estão preparados. Selecione uma receita para formar o custo e o preço de venda.",
          botao: "Calcular custo",
          to: "/custos/calcular",
          Icon: Calculator,
        };

  const loading = loadingDespesas || loadingConfig || loadingCalculos;

  return (
    <div className="space-y-5 pb-24 md:pb-8 max-w-7xl mx-auto">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-r from-primary/[0.12] via-primary/[0.05] to-lime-100/50 px-5 py-5 sm:px-7 sm:py-6">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-lime-300/20 blur-2xl" />
        <div className="absolute right-28 -bottom-20 h-44 w-44 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative grid lg:grid-cols-[190px_1fr_auto] gap-5 lg:items-center">
          <div className="hidden lg:flex h-36 rounded-2xl border border-white/70 bg-white/55 backdrop-blur-sm items-center justify-center relative overflow-hidden">
            <div className="absolute left-5 top-5 h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center"><ChefHat className="w-6 h-6 text-primary" /></div>
            <div className="absolute right-5 bottom-5 h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm"><Calculator className="w-7 h-7" /></div>
            <div className="h-16 w-16 rounded-full border-8 border-primary/10 flex items-center justify-center"><WalletCards className="w-7 h-7 text-primary" /></div>
          </div>

          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold tracking-tight">Laboratório de Custos</h1>
            <p className="text-sm sm:text-base text-foreground/80 mt-2 max-w-2xl">Transforme o custo técnico das suas receitas em custo de produção, preço de venda e margem.</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Rateio das despesas</span>
              <span className="inline-flex items-center gap-1.5"><Target className="w-4 h-4 text-primary" /> Formação do preço</span>
              <span className="inline-flex items-center gap-1.5"><FileText className="w-4 h-4 text-primary" /> Ficha de custo</span>
            </div>
          </div>

          <div className="flex lg:flex-col gap-2 sm:min-w-[180px]">
            <Button onClick={() => navigate("/custos/calcular")} className="flex-1 gap-2"><Calculator className="w-4 h-4" /> Calcular custo</Button>
            <Button variant="outline" asChild className="flex-1 gap-2 bg-white/60"><a href="#fluxo-laboratorio"><PlayCircle className="w-4 h-4" /> Ver como funciona</a></Button>
          </div>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card className="p-4 border-primary/10">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs text-muted-foreground">Despesas mensais ativas</p><p className="text-2xl font-bold mt-1">{loading ? "—" : money(totalDespesasAtivas)}</p><p className="text-[11px] text-muted-foreground mt-1">Total atualmente cadastrado</p></div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><WalletCards className="w-5 h-5" /></div>
          </div>
        </Card>
        <Card className="p-4 border-primary/10">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs text-muted-foreground">Rateio por receita</p><p className="text-2xl font-bold mt-1">{loading ? "—" : rateioConfigurado ? money(custoRateadoPorReceita) : "—"}</p><p className="text-[11px] text-muted-foreground mt-1">{rateioConfigurado ? `${numero(volumeMensal)} receita(s)/mês` : "Quantidade mensal não configurada"}</p></div>
            <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center"><Settings2 className="w-5 h-5" /></div>
          </div>
        </Card>
        <Card className="p-4 border-primary/10">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs text-muted-foreground">Fichas salvas</p><p className="text-2xl font-bold mt-1">{loading ? "—" : calculos.length}</p><p className="text-[11px] text-muted-foreground mt-1">Histórico preservado por versão</p></div>
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
          </div>
        </Card>
        <Card className="p-4 border-primary/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-xs text-muted-foreground">Último custo por receita</p><p className="text-2xl font-bold mt-1">{loading ? "—" : ultimoCalculo ? money(ultimoCalculo.custo_unitario) : "—"}</p><p className="text-[11px] text-muted-foreground mt-1 truncate max-w-[210px]">{ultimoCalculo ? ultimoCalculo.origem_nome_snapshot : "Nenhum cálculo realizado"}</p></div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center"><Calculator className="w-5 h-5" /></div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5">
          <Card id="fluxo-laboratorio" className="p-5 sm:p-6 scroll-mt-24">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-semibold text-lg">Fluxo do Laboratório</h2><p className="text-sm text-muted-foreground mt-1">Do cadastro das despesas à Ficha de Custo em quatro etapas.</p></div>
            </div>
            <div className="mt-6 grid sm:grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-0">
              {fluxo.map((etapa, index) => {
                const Icon = etapa.Icon;
                return (
                  <div key={etapa.label} className="relative flex xl:flex-col items-center xl:text-center gap-3 xl:gap-2 px-2">
                    {index < fluxo.length - 1 && <div className="hidden xl:block absolute top-6 left-[62%] w-[76%] h-px bg-primary/30" />}
                    <Link to={etapa.to} className={`relative z-10 h-12 w-12 rounded-full border flex items-center justify-center shrink-0 transition-colors ${etapa.concluido ? "bg-primary/10 border-primary/30 text-primary" : "bg-background border-border text-muted-foreground hover:border-primary/30"}`}>
                      <Icon className="w-5 h-5" />
                      {etapa.concluido && <span className="absolute -right-1 -bottom-1 h-5 w-5 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5" /></span>}
                    </Link>
                    <div className="min-w-0"><p className="text-[10px] font-semibold text-primary">{index + 1}</p><p className="text-sm font-semibold leading-tight mt-0.5">{etapa.label}</p><p className="text-xs text-muted-foreground mt-1">{etapa.descricao}</p></div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
              <div><h2 className="font-semibold text-lg">Últimos cálculos</h2><p className="text-xs text-muted-foreground mt-1">Fichas mais recentes do seu histórico.</p></div>
              <Button variant="ghost" size="sm" asChild><Link to="/custos/historico">Ver histórico <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
            </div>
            {loadingCalculos ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Carregando cálculos...</div>
            ) : ultimosCalculos.length === 0 ? (
              <div className="p-8 text-center">
                <History className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="font-medium mt-3">Nenhuma ficha gerada ainda</p>
                <p className="text-sm text-muted-foreground mt-1">Seu primeiro cálculo aparecerá aqui.</p>
              </div>
            ) : (
              <>
                <div className="md:hidden divide-y">
                  {ultimosCalculos.map((calculo) => (
                    <Link key={calculo.id} to={`/custos/ficha/${calculo.id}`} className="p-4 flex items-center gap-3 hover:bg-muted/25 transition-colors">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-medium truncate">{calculo.origem_nome_snapshot}</p><Badge variant="outline" className="text-[10px] shrink-0">v{calculo.versao_calculo || 1}</Badge></div><p className="text-xs text-muted-foreground mt-0.5">{dataCurta(calculo.data_calculo || calculo.created_date)} · {numero(calculo.quantidade_produzida)} receita(s)</p></div>
                      <div className="text-right shrink-0"><p className="text-[10px] text-muted-foreground">Custo</p><strong className="text-sm">{money(calculo.custo_unitario)}</strong></div>
                    </Link>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-left"><tr><th className="px-5 py-3 font-medium">Receita</th><th className="px-3 py-3 font-medium">Versão</th><th className="px-3 py-3 font-medium whitespace-nowrap">Data</th><th className="px-3 py-3 font-medium text-right whitespace-nowrap">Produção</th><th className="px-3 py-3 font-medium text-right whitespace-nowrap">Custo/receita</th><th className="px-5 py-3 font-medium text-right whitespace-nowrap">Preço de venda</th></tr></thead>
                    <tbody className="divide-y">
                      {ultimosCalculos.map((calculo) => (
                        <tr key={calculo.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => navigate(`/custos/ficha/${calculo.id}`)}>
                          <td className="px-5 py-3 font-medium max-w-[260px] truncate">{calculo.origem_nome_snapshot}</td>
                          <td className="px-3 py-3"><Badge variant="outline" className="text-[10px]">v{calculo.versao_calculo || 1}</Badge></td>
                          <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{dataCurta(calculo.data_calculo || calculo.created_date)}</td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">{numero(calculo.quantidade_produzida)} receita(s)</td>
                          <td className="px-3 py-3 text-right font-semibold text-primary whitespace-nowrap">{money(calculo.custo_unitario)}</td>
                          <td className="px-5 py-3 text-right font-medium whitespace-nowrap">{Number(calculo.preco_venda_informado || 0) > 0 ? money(calculo.preco_venda_informado) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20">
          <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/[0.08] to-lime-100/40">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><proximaAcao.Icon className="w-5 h-5" /></div>
            <p className="text-xs font-semibold text-primary mt-4">PRÓXIMA AÇÃO</p>
            <h2 className="font-semibold text-lg mt-1">{proximaAcao.titulo}</h2>
            <p className="text-sm text-muted-foreground mt-2">{proximaAcao.texto}</p>
            <Button className="w-full mt-4" asChild><Link to={proximaAcao.to}>{proximaAcao.botao}</Link></Button>
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold">Acesso rápido</h2>
            <div className="divide-y mt-2">
              <Link to="/custos/despesas" className="flex items-center justify-between gap-3 text-sm py-3 hover:text-primary"><span className="inline-flex items-center gap-2"><WalletCards className="w-4 h-4" /> Minhas Despesas</span><ArrowRight className="w-4 h-4" /></Link>
              <Link to="/custos/configuracoes" className="flex items-center justify-between gap-3 text-sm py-3 hover:text-primary"><span className="inline-flex items-center gap-2"><Settings2 className="w-4 h-4" /> Configurações de Rateio</span><ArrowRight className="w-4 h-4" /></Link>
              <Link to="/custos/historico" className="flex items-center justify-between gap-3 text-sm py-3 hover:text-primary"><span className="inline-flex items-center gap-2"><History className="w-4 h-4" /> Histórico</span><ArrowRight className="w-4 h-4" /></Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
