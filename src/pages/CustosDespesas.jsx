import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
const useMutationAny = /** @type {any} */ (useMutation);
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Calculator, CircleHelp, MoreHorizontal, Pencil, Plus, Save, Settings2, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import AdicionarDespesaDialog, { GRUPOS_DESPESA_CUSTO } from "@/components/custos/AdicionarDespesaDialog";

const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CustosDespesas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [grupoInicial, setGrupoInicial] = useState("");
  const [editando, setEditando] = useState(null);
  const [configLocal, setConfigLocal] = useState({});
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  const { data: despesas = [], isLoading } = useQuery({
    queryKey: ["custos-despesas", user?.id],
    queryFn: () => base44.entities.DespesaCustoUsuario.filter({ user_id: user.id }, "ordem", 500),
    enabled: !!user?.id,
  });

  const { data: configuracoes = [] } = useQuery({
    queryKey: ["custos-config", user?.id],
    queryFn: () => base44.entities.ConfiguracaoCustosUsuario.filter({ user_id: user.id }, "-updated_date", 10),
    enabled: !!user?.id,
  });

  const config = configuracoes[0] || null;
  const valorConfig = (campo, fallback) => configLocal[campo] ?? config?.[campo] ?? fallback;
  const baseCustoNegocio = valorConfig("base_custo_negocio", "mes");
  const aplicarCustoNegocio = Boolean(valorConfig("aplicar_custo_negocio", false));
  const diasProducaoMes = Number(valorConfig("dias_producao_mes", 0) || 0);
  const producaoMediaDia = Number(valorConfig("producao_media_dia", 0) || 0);
  const producaoMediaMes = Number(valorConfig("volume_mensal_estimado", 0) || 0);
  const custoComercializacaoPct = Number(valorConfig("custo_comercializacao_pct", 20) || 0);
  const aplicarCustoComercializacao = Boolean(valorConfig("aplicar_custo_comercializacao", false));

  const totais = useMemo(() => {
    const porGrupo = Object.fromEntries(GRUPOS_DESPESA_CUSTO.map((g) => [g.value, 0]));
    let total = 0;
    despesas.forEach((d) => {
      if (d.ativo === false) return;
      const valor = Number(d.valor_mensal || 0);
      total += valor;
      porGrupo[d.grupo] = (porGrupo[d.grupo] || 0) + valor;
    });
    return { porGrupo, total };
  }, [despesas]);

  const todosGrupos = GRUPOS_DESPESA_CUSTO.map((g) => g.value);
  const gruposPersistidos = Array.isArray(config?.grupos_rateio_incluidos) ? config.grupos_rateio_incluidos : todosGrupos;
  const gruposCustoNegocio = configLocal.grupos_rateio_incluidos ?? (config?.aplicar_custo_negocio == null ? todosGrupos : gruposPersistidos);
  const totalCustoNegocio = gruposCustoNegocio.reduce((s, grupo) => s + Number(totais.porGrupo[grupo] || 0), 0);
  const producaoReferencia = baseCustoNegocio === "dia" ? diasProducaoMes * producaoMediaDia : producaoMediaMes;
  const custoNegocioPorDia = diasProducaoMes > 0 ? totalCustoNegocio / diasProducaoMes : 0;
  const custoNegocioPorReceita = producaoReferencia > 0 ? totalCustoNegocio / producaoReferencia : 0;

  const toggleMut = useMutationAny({
    mutationFn: ({ id, ativo }) => base44.entities.DespesaCustoUsuario.update(id, { ativo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custos-despesas", user?.id] }),
  });

  const excluirMut = useMutationAny({
    mutationFn: (id) => base44.entities.DespesaCustoUsuario.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custos-despesas", user?.id] });
      toast.success("Despesa removida.");
    },
  });

  const abrirNovo = (grupo = "") => { setEditando(null); setGrupoInicial(grupo); setDialogOpen(true); };
  const abrirEditar = (despesa) => { setEditando(despesa); setGrupoInicial(""); setDialogOpen(true); };
  const setConfigCampo = (campo, valor) => setConfigLocal((atual) => ({ ...atual, [campo]: valor }));
  const toggleGrupoCusto = (grupo) => setConfigLocal((atual) => {
    const base = atual.grupos_rateio_incluidos ?? gruposCustoNegocio;
    return { ...atual, grupos_rateio_incluidos: base.includes(grupo) ? base.filter((g) => g !== grupo) : [...base, grupo] };
  });
  const salvarConfigCusto = async () => {
    if (!user?.id) return;
    setSalvandoConfig(true);
    try {
      const payload = {
        user_id: user.id,
        metodo_rateio_padrao: "lote_produzido",
        unidade_volume: "lotes_mes",
        volume_mensal_estimado: Math.max(0, producaoMediaMes),
        grupos_rateio_incluidos: gruposCustoNegocio,
        aplicar_custo_negocio: aplicarCustoNegocio,
        base_custo_negocio: baseCustoNegocio,
        dias_producao_mes: Math.max(0, diasProducaoMes),
        producao_media_dia: Math.max(0, producaoMediaDia),
        custo_comercializacao_pct: Math.min(99, Math.max(0, custoComercializacaoPct)),
        aplicar_custo_comercializacao: aplicarCustoComercializacao,
        markup_padrao: Number(config?.markup_padrao || 3),
        ativo: true,
      };
      if (config?.id) await base44.entities.ConfiguracaoCustosUsuario.update(config.id, payload);
      else await base44.entities.ConfiguracaoCustosUsuario.create(payload);
      setConfigLocal({});
      await qc.invalidateQueries({ queryKey: ["custos-config", user.id] });
      toast.success("Custo do Negócio salvo.");
    } catch (err) {
      toast.error("Não foi possível salvar: " + (err?.message || "erro inesperado"));
    } finally {
      setSalvandoConfig(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Minhas Despesas</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastre suas despesas mensais e defina como o Custo do Negócio será distribuído.</p>
          <p className="text-sm text-muted-foreground">Você pode aplicar ou não esse custo aos cálculos das receitas.</p>
        </div>
        <Button onClick={() => abrirNovo()} className="gap-2"><Plus className="w-4 h-4" /> Adicionar despesa</Button>
      </div>

      <div className="grid xl:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="grid md:grid-cols-2 gap-4">
          {GRUPOS_DESPESA_CUSTO.map((grupo) => {
            const Icon = grupo.icon;
            const itens = despesas.filter((d) => d.grupo === grupo.value);
            return (
              <Card key={grupo.value} className="p-4 space-y-3 h-fit">
                <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${grupo.bg} ${grupo.accent}`}><Icon className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-h-5"><h2 className={`font-semibold leading-tight ${grupo.accent}`}>{grupo.label}</h2><Popover><PopoverTrigger asChild><button type="button" className="text-muted-foreground hover:text-foreground shrink-0" aria-label={`O que entra em ${grupo.label}?`}><CircleHelp className="w-3.5 h-3.5" /></button></PopoverTrigger><PopoverContent className="w-80 text-sm" align="start"><p className="font-medium">{grupo.label}</p><p className="text-muted-foreground mt-2">{grupo.descricao}</p><p className="text-xs font-medium mt-3">Exemplos comuns</p><p className="text-xs text-muted-foreground mt-1">{grupo.sugestoes.join(" · ")}</p></PopoverContent></Popover></div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1"><p className="text-xs text-muted-foreground">{itens.length ? `${itens.length} despesa${itens.length > 1 ? "s" : ""}` : "Nenhuma despesa cadastrada"}</p></div>
                  </div>
                  <div className="text-right whitespace-nowrap"><p className="text-[10px] text-muted-foreground">Total do grupo</p><p className="font-semibold text-sm">{money(totais.porGrupo[grupo.value])}</p></div>
                </div>

                {itens.length === 0 ? (
                  <div className="rounded-lg bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground"><span className="font-medium text-foreground/80">Ex.:</span> {grupo.sugestoes.slice(0, 3).join(" · ")}</div>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {itens.map((d) => (
                      <div key={d.id} className={`flex items-center gap-2 px-3 py-2 ${d.ativo === false ? "opacity-50" : ""}`}>
                        <Switch checked={d.ativo !== false} onCheckedChange={(ativo) => toggleMut.mutate({ id: d.id, ativo })} />
                        <span className="flex-1 min-w-0 text-sm truncate">{d.nome}</span>
                        <span className="text-sm font-medium">{money(d.valor_mensal)}</span>
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => abrirEditar(d)}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => excluirMut.mutate(d.id)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="outline" className="w-full gap-2 h-9" onClick={() => abrirNovo(grupo.value)}><Plus className="w-4 h-4" /> Adicionar despesa</Button>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold">Resumo mensal</h2>
            <p className="text-xs text-muted-foreground mt-1">Total das despesas ativas</p>
            <p className="text-3xl font-bold text-primary mt-2">{money(totais.total)}</p>
            <div className="space-y-2 mt-4 pt-4 border-t">{GRUPOS_DESPESA_CUSTO.map((g) => <div key={g.value} className="flex justify-between gap-3 text-xs"><span className="text-muted-foreground">{g.label}</span><strong>{money(totais.porGrupo[g.value])}</strong></div>)}</div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-start gap-3"><Settings2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><div className="flex items-center gap-1.5"><h2 className="font-semibold">Custo do Negócio</h2><Popover><PopoverTrigger asChild><button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Como funciona o Custo do Negócio?"><CircleHelp className="w-3.5 h-3.5" /></button></PopoverTrigger><PopoverContent className="w-80 text-sm" align="start"><p className="font-medium">Custo do Negócio</p><p className="text-muted-foreground mt-2">Escolha abaixo se quer distribuir suas despesas por Dia ou por Mês. Despesas com pessoal também podem fazer parte desse custo.</p></PopoverContent></Popover></div><p className="text-xs text-muted-foreground mt-1">Defina como suas despesas serão distribuídas. O uso nos cálculos é opcional.</p></div></div>
            <div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-medium">Aplicar nos cálculos</p><p className="text-xs text-muted-foreground">Quando desligado, o custo técnico da receita permanece sem rateio do negócio.</p></div><Switch checked={aplicarCustoNegocio} onCheckedChange={(v) => setConfigCampo("aplicar_custo_negocio", v)} /></div>
            <div><p className="text-sm font-medium mb-2">Custo do Negócio</p><div className="grid grid-cols-2 gap-2"><Button type="button" variant={baseCustoNegocio === "dia" ? "default" : "outline"} onClick={() => setConfigCampo("base_custo_negocio", "dia")}>Dia</Button><Button type="button" variant={baseCustoNegocio === "mes" ? "default" : "outline"} onClick={() => setConfigCampo("base_custo_negocio", "mes")}>Mês</Button></div></div>
            {baseCustoNegocio === "dia" ? <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium">Dias de produção no mês</label><Input className="mt-1" type="number" min="0" step="1" value={diasProducaoMes || ""} onChange={(e) => setConfigCampo("dias_producao_mes", e.target.value)} placeholder="Ex.: 25" /></div><div><label className="text-xs font-medium">Produção média por dia</label><Input className="mt-1" type="number" min="0" step="1" value={producaoMediaDia || ""} onChange={(e) => setConfigCampo("producao_media_dia", e.target.value)} placeholder="Ex.: 20" /></div></div> : <div><label className="text-xs font-medium">Produção média no mês</label><Input className="mt-1" type="number" min="0" step="1" value={producaoMediaMes || ""} onChange={(e) => setConfigCampo("volume_mensal_estimado", e.target.value)} placeholder="Ex.: 500" /></div>}
            <div><p className="text-xs font-medium mb-2">Despesas consideradas</p><div className="grid grid-cols-2 gap-2">{GRUPOS_DESPESA_CUSTO.map((g) => <button key={g.value} type="button" onClick={() => toggleGrupoCusto(g.value)} className={`rounded-lg border px-2.5 py-2 text-left text-xs ${gruposCustoNegocio.includes(g.value) ? "bg-primary/5 border-primary/30 text-foreground" : "text-muted-foreground"}`}><span className="font-medium">{g.label}</span><span className="block mt-0.5">{money(totais.porGrupo[g.value])}</span></button>)}</div></div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Despesas consideradas</span><strong>{money(totalCustoNegocio)}</strong></div>{baseCustoNegocio === "dia" && <div className="flex justify-between"><span className="text-muted-foreground">Custo do negócio por dia</span><strong>{diasProducaoMes > 0 ? money(custoNegocioPorDia) : "—"}</strong></div>}<div className="flex justify-between border-t pt-2"><span className="font-medium">Custo do negócio por receita</span><strong className="text-primary">{producaoReferencia > 0 ? money(custoNegocioPorReceita) : "—"}</strong></div></div>
            <div className="border-t pt-4 space-y-3"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Custo médio de comercialização</p><p className="text-xs text-muted-foreground">Estimativa global, editável, de taxas e custos que incidem sobre a venda.</p></div><Switch checked={aplicarCustoComercializacao} onCheckedChange={(v) => setConfigCampo("aplicar_custo_comercializacao", v)} /></div><div className="flex items-center gap-2"><Input type="number" min="0" max="99" step="0.1" value={custoComercializacaoPct} onChange={(e) => setConfigCampo("custo_comercializacao_pct", e.target.value)} /><span className="text-sm font-medium">%</span></div></div>
            <Button onClick={salvarConfigCusto} disabled={salvandoConfig} className="w-full"><Save className="w-4 h-4 mr-2" />{salvandoConfig ? "Salvando..." : "Salvar Custo do Negócio"}</Button>
          </Card>

          <Card className="p-4 bg-muted/20 border-dashed"><div className="flex gap-3"><Calculator className="w-5 h-5 text-muted-foreground shrink-0" /><div><p className="text-sm font-medium">Pronto para calcular?</p><p className="text-xs text-muted-foreground mt-1">Use estas despesas junto com uma receita do Laboratório de Cozinha.</p><Link to="/custos/calcular" className="text-xs font-medium text-primary underline mt-2 inline-block">Ir para Calcular Custo</Link></div></div></Card>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando despesas...</p>}

      <AdicionarDespesaDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditando(null); }} userId={user?.id} grupoInicial={grupoInicial} despesa={editando} />
    </div>
  );
}
