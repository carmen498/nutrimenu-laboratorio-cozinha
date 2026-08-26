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
  Circle,
  FileText,
  History,
  Settings2,
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
    { label: "Despesas cadastradas", concluido: temDespesas, to: "/custos/despesas" },
    { label: "Rateio configurado", concluido: rateioConfigurado, to: "/custos/configuracoes" },
    { label: "Cálculo realizado", concluido: temCalculos, to: "/custos/calcular" },
    { label: "Ficha disponível", concluido: temCalculos, to: "/custos/historico" },
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
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Laboratório de Custos</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe seus custos e avance do cadastro das despesas até a Ficha de Custo.</p>
        </div>
        <Button onClick={() => navigate("/custos/calcular")} className="gap-2">
          <Calculator className="w-4 h-4" /> Calcular custo
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs text-muted-foreground">Despesas mensais ativas</p><p className="text-2xl font-bold mt-1">{loading ? "—" : money(totalDespesasAtivas)}</p></div>
            <WalletCards className="w-5 h-5 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs text-muted-foreground">Rateio por receita</p><p className="text-2xl font-bold mt-1">{loading ? "—" : rateioConfigurado ? money(custoRateadoPorReceita) : "—"}</p><p className="text-[11px] text-muted-foreground mt-1">{rateioConfigurado ? `${numero(volumeMensal)} receita(s)/mês` : "Quantidade mensal não configurada"}</p></div>
            <Settings2 className="w-5 h-5 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs text-muted-foreground">Fichas salvas</p><p className="text-2xl font-bold mt-1">{loading ? "—" : calculos.length}</p><p className="text-[11px] text-muted-foreground mt-1">Histórico preservado por versão</p></div>
            <FileText className="w-5 h-5 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs text-muted-foreground">Último custo por receita</p><p className="text-2xl font-bold mt-1">{loading ? "—" : ultimoCalculo ? money(ultimoCalculo.custo_unitario) : "—"}</p><p className="text-[11px] text-muted-foreground mt-1 truncate max-w-[210px]">{ultimoCalculo ? ultimoCalculo.origem_nome_snapshot : "Nenhum cálculo realizado"}</p></div>
            <Calculator className="w-5 h-5 text-primary" />
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="font-semibold">Fluxo do Laboratório</h2>
            <p className="text-xs text-muted-foreground mt-1">Cada etapa alimenta a próxima sem sobrescrever o histórico.</p>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 flex-1 lg:max-w-3xl">
            {fluxo.map((etapa, index) => (
              <Link key={etapa.label} to={etapa.to} className="rounded-lg border px-3 py-2.5 flex items-center gap-2 hover:bg-muted/30 transition-colors">
                {etapa.concluido ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                <div className="min-w-0"><p className="text-[10px] text-muted-foreground">Etapa {index + 1}</p><p className="text-xs font-medium leading-snug">{etapa.label}</p></div>
              </Link>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
            <div><h2 className="font-semibold">Últimos cálculos</h2><p className="text-xs text-muted-foreground mt-1">Fichas mais recentes do seu histórico.</p></div>
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
            <div className="divide-y">
              {ultimosCalculos.map((calculo) => (
                <Link key={calculo.id} to={`/custos/ficha/${calculo.id}`} className="px-5 py-3 flex items-center gap-4 hover:bg-muted/25 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><p className="text-sm font-medium truncate">{calculo.origem_nome_snapshot}</p><Badge variant="outline" className="text-[10px] shrink-0">v{calculo.versao_calculo || 1}</Badge></div>
                    <p className="text-xs text-muted-foreground mt-0.5">{dataCurta(calculo.data_calculo || calculo.created_date)} · {numero(calculo.quantidade_produzida)} receita(s)</p>
                  </div>
                  <div className="text-right shrink-0"><p className="text-[10px] text-muted-foreground">Custo/receita</p><p className="text-sm font-semibold">{money(calculo.custo_unitario)}</p></div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5 border-primary/20 bg-primary/[0.03]">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><proximaAcao.Icon className="w-5 h-5" /></div>
            <p className="text-xs font-semibold text-primary mt-4">PRÓXIMA AÇÃO</p>
            <h2 className="font-semibold text-lg mt-1">{proximaAcao.titulo}</h2>
            <p className="text-sm text-muted-foreground mt-2">{proximaAcao.texto}</p>
            <Button className="w-full mt-4" asChild><Link to={proximaAcao.to}>{proximaAcao.botao}</Link></Button>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">Acesso rápido</h2>
            <Link to="/custos/despesas" className="flex items-center justify-between gap-3 text-sm py-1.5 hover:text-primary"><span className="inline-flex items-center gap-2"><WalletCards className="w-4 h-4" /> Minhas Despesas</span><ArrowRight className="w-4 h-4" /></Link>
            <Link to="/custos/configuracoes" className="flex items-center justify-between gap-3 text-sm py-1.5 hover:text-primary"><span className="inline-flex items-center gap-2"><Settings2 className="w-4 h-4" /> Configurações de Rateio</span><ArrowRight className="w-4 h-4" /></Link>
            <Link to="/custos/historico" className="flex items-center justify-between gap-3 text-sm py-1.5 hover:text-primary"><span className="inline-flex items-center gap-2"><History className="w-4 h-4" /> Histórico</span><ArrowRight className="w-4 h-4" /></Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
