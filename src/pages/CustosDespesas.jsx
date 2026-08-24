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
import { AlertCircle, Calculator, MoreHorizontal, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import AdicionarDespesaDialog, { GRUPOS_DESPESA_CUSTO } from "@/components/custos/AdicionarDespesaDialog";

const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CustosDespesas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [grupoInicial, setGrupoInicial] = useState("");
  const [editando, setEditando] = useState(null);
  const [volumeLocal, setVolumeLocal] = useState("");

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
  const volume = volumeLocal !== "" ? Number(volumeLocal) : Number(config?.volume_mensal_estimado || 0);

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

  const gruposRateio = Array.isArray(config?.grupos_rateio_incluidos) && config.grupos_rateio_incluidos.length > 0
    ? config.grupos_rateio_incluidos
    : ["gastos_negocio", "producao", "embalagem_outros"];
  const totalRateio = gruposRateio.reduce((s, grupo) => s + Number(totais.porGrupo[grupo] || 0), 0);
  const custoRateado = volume > 0 ? totalRateio / volume : 0;

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

  const salvarVolume = async () => {
    if (!user?.id) return;
    const valor = Number(volumeLocal === "" ? config?.volume_mensal_estimado || 0 : volumeLocal);
    if (!Number.isFinite(valor) || valor < 0) return toast.error("Informe um volume mensal válido.");
    const payload = { user_id: user.id, volume_mensal_estimado: valor, unidade_volume: "unidades_mes", metodo_rateio_padrao: "unidade_produzida" };
    if (config?.id) await base44.entities.ConfiguracaoCustosUsuario.update(config.id, payload);
    else await base44.entities.ConfiguracaoCustosUsuario.create(payload);
    setVolumeLocal("");
    await qc.invalidateQueries({ queryKey: ["custos-config", user.id] });
    toast.success("Volume mensal salvo.");
  };

  const abrirNovo = (grupo = "") => { setEditando(null); setGrupoInicial(grupo); setDialogOpen(true); };
  const abrirEditar = (despesa) => { setEditando(despesa); setGrupoInicial(""); setDialogOpen(true); };

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">2. Minhas Despesas</h1>
          <p className="text-sm text-muted-foreground mt-1">Informe seus gastos mensais para ratearmos entre suas produções.</p>
          <p className="text-sm text-muted-foreground">Esses valores serão usados nos seus cálculos de custo.</p>
        </div>
        <Button onClick={() => abrirNovo()} className="gap-2"><Plus className="w-4 h-4" /> Adicionar despesa</Button>
      </div>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div><p className="font-medium">As despesas ativas dos grupos selecionados serão rateadas entre suas produções.</p><p className="text-muted-foreground mt-0.5">“Seu trabalho / ajudantes” fica separado da mão de obra direta. Revise os grupos em Configurações de Rateio.</p></div>
        </div>
      </Card>

      <div className="grid xl:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="grid md:grid-cols-2 gap-4">
          {GRUPOS_DESPESA_CUSTO.map((grupo, index) => {
            const Icon = grupo.icon;
            const itens = despesas.filter((d) => d.grupo === grupo.value);
            return (
              <Card key={grupo.value} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${grupo.bg} ${grupo.accent}`}><Icon className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0"><h2 className={`font-semibold ${grupo.accent}`}>{index + 1}. {grupo.label}</h2><p className="text-xs text-muted-foreground mt-0.5">{itens.length ? `${itens.length} despesa${itens.length > 1 ? "s" : ""}` : "Nenhuma despesa cadastrada"}</p></div>
                  <div className="text-right"><p className="text-[10px] text-muted-foreground">Total do grupo</p><p className="font-semibold text-sm">{money(totais.porGrupo[grupo.value])}</p></div>
                </div>

                <div className="divide-y rounded-lg border min-h-[72px]">
                  {itens.length === 0 ? <div className="p-4 text-center text-xs text-muted-foreground">Adicione sua primeira despesa deste grupo.</div> : itens.map((d) => (
                    <div key={d.id} className={`flex items-center gap-2 px-3 py-2 ${d.ativo === false ? "opacity-50" : ""}`}>
                      <Switch checked={d.ativo !== false} onCheckedChange={(ativo) => toggleMut.mutate({ id: d.id, ativo })} />
                      <span className="flex-1 min-w-0 text-sm truncate">{d.nome}</span>
                      <span className="text-sm font-medium">{money(d.valor_mensal)}</span>
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => abrirEditar(d)}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => excluirMut.mutate(d.id)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full gap-2" onClick={() => abrirNovo(grupo.value)}><Plus className="w-4 h-4" /> Adicionar item</Button>
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

          <Card className="p-5 space-y-3">
            <div><h2 className="font-semibold">Como será o rateio?</h2><p className="text-xs text-muted-foreground mt-1">{money(totalRateio)} dos grupos selecionados serão divididos pelo volume mensal estimado.</p><Link to="/custos/configuracoes" className="text-[11px] text-primary underline mt-1 inline-block">Revisar grupos incluídos</Link></div>
            <div><label className="text-xs font-medium">Volume mensal estimado</label><div className="flex gap-2 mt-1"><Input type="number" min="0" value={volumeLocal !== "" ? volumeLocal : config?.volume_mensal_estimado ?? ""} onChange={(e) => setVolumeLocal(e.target.value)} placeholder="Ex.: 200" /><Button variant="outline" size="icon" onClick={salvarVolume}><Save className="w-4 h-4" /></Button></div><p className="text-[11px] text-muted-foreground mt-1">unidades/mês</p></div>
            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3"><p className="text-xs text-muted-foreground">Custo rateado por unidade</p><p className="text-2xl font-bold text-primary mt-1">{volume > 0 ? money(custoRateado) : "—"}</p>{volume <= 0 && <p className="text-[11px] text-muted-foreground mt-1">Informe o volume mensal para calcular.</p>}</div>
          </Card>

          <Card className="p-4"><div className="flex gap-3"><Calculator className="w-5 h-5 text-primary shrink-0" /><div><p className="text-sm font-medium">Pronto para calcular?</p><p className="text-xs text-muted-foreground mt-1">Use estas despesas junto com uma receita do Laboratório de Cozinha.</p><Link to="/custos/calcular" className="text-xs font-medium text-primary underline mt-2 inline-block">Ir para Calcular Custo</Link></div></div></Card>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando despesas...</p>}

      <AdicionarDespesaDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditando(null); }} userId={user?.id} grupoInicial={grupoInicial} despesa={editando} />
    </div>
  );
}
