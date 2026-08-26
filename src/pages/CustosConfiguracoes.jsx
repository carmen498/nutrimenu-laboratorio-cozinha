import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, Calculator, CheckCircle2, CircleHelp, Info, Save, Settings2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { somarDespesasAtivas } from "@/lib/custos/motorCustos";

const GRUPOS_RATEAVEIS = [
  { value: "gastos_negocio", label: "Gastos do negócio", descricao: "Aluguel, internet, contabilidade e outros custos do negócio." },
  { value: "producao", label: "Despesas operacionais", descricao: "Energia, gás, água e demais despesas mensais de funcionamento." },
  { value: "embalagem_outros", label: "Embalagem e outros", descricao: "Materiais e despesas gerais mensais não vinculados a uma receita específica." },
];

const PADRAO_GRUPOS = GRUPOS_RATEAVEIS.map((g) => g.value);
const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? Math.max(0, n) : 0; };

export default function CustosConfiguracoes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [salvando, setSalvando] = useState(false);
  const [volume, setVolume] = useState(null);
  const [valorHora, setValorHora] = useState(null);
  const [markup, setMarkup] = useState(null);
  const [gruposLocal, setGruposLocal] = useState(null);

  const { data: configuracoes = [], isLoading: loadingConfig } = useQuery({
    queryKey: ["custos-config", user?.id],
    queryFn: () => base44.entities.ConfiguracaoCustosUsuario.filter({ user_id: user.id }, "-updated_date", 10),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const { data: despesas = [], isLoading: loadingDespesas } = useQuery({
    queryKey: ["custos-despesas", user?.id],
    queryFn: () => base44.entities.DespesaCustoUsuario.filter({ user_id: user.id }, "ordem", 500),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const config = configuracoes[0] || null;
  const gruposPersistidos = Array.isArray(config?.grupos_rateio_incluidos)
    ? config.grupos_rateio_incluidos.filter((g) => PADRAO_GRUPOS.includes(g))
    : PADRAO_GRUPOS;
  const grupos = gruposLocal ?? gruposPersistidos;
  const volumeEfetivo = volume ?? String(config?.volume_mensal_estimado ?? "");
  const valorHoraEfetivo = valorHora ?? String(config?.valor_hora_padrao ?? "");
  const markupEfetivo = markup ?? String(config?.markup_padrao ?? 3);

  const totaisPorGrupo = useMemo(() => Object.fromEntries(GRUPOS_RATEAVEIS.map((g) => [g.value, somarDespesasAtivas(despesas, [g.value])])), [despesas]);
  const totalIncluido = useMemo(() => somarDespesasAtivas(despesas, grupos), [despesas, grupos]);
  const custoRateado = num(volumeEfetivo) > 0 ? totalIncluido / num(volumeEfetivo) : 0;
  const totalTrabalho = useMemo(() => somarDespesasAtivas(despesas, ["trabalho_ajudantes"]), [despesas]);

  const toggleGrupo = (grupo, ativo) => {
    setGruposLocal((atual) => {
      const base = atual ?? gruposPersistidos;
      if (ativo) return [...new Set([...base, grupo])];
      return base.filter((g) => g !== grupo);
    });
  };

  const salvar = async () => {
    if (!user?.id) return;
    const volumeN = num(volumeEfetivo);
    const valorHoraN = num(valorHoraEfetivo);
    const markupN = num(markupEfetivo);
    if (markupN <= 0) return toast.error("O markup padrão deve ser maior que zero.");

    setSalvando(true);
    try {
      const payload = {
        user_id: user.id,
        metodo_rateio_padrao: "lote_produzido",
        volume_mensal_estimado: volumeN,
        unidade_volume: "lotes_mes",
        grupos_rateio_incluidos: grupos,
        valor_hora_padrao: valorHoraN,
        markup_padrao: markupN,
        ativo: true,
      };
      if (config?.id) await base44.entities.ConfiguracaoCustosUsuario.update(config.id, payload);
      else await base44.entities.ConfiguracaoCustosUsuario.create(payload);
      setVolume(null);
      setValorHora(null);
      setMarkup(null);
      setGruposLocal(null);
      await qc.invalidateQueries({ queryKey: ["custos-config", user.id] });
      toast.success("Configurações de rateio salvas.");
    } catch (err) {
      toast.error("Não foi possível salvar as configurações: " + (err?.message || "erro inesperado"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Configurações de Rateio</h1>
          <p className="text-sm text-muted-foreground mt-1">Escolha quais despesas mensais entram no rateio e informe quantas receitas completas você produz por mês.</p>
        </div>
        <Button onClick={salvar} disabled={salvando || loadingConfig}><Save className="w-4 h-4 mr-2" /> {salvando ? "Salvando..." : "Salvar configurações"}</Button>
      </div>

      <Card className="px-4 py-3 bg-primary/5 border-primary/20">
        <div className="flex gap-3 text-sm"><Info className="w-4 h-4 text-primary shrink-0 mt-0.5" /><div><p><span className="font-medium">Como funciona:</span> somamos apenas os grupos selecionados e dividimos esse total pela quantidade mensal de receitas.</p><p className="text-muted-foreground mt-0.5">Despesas com pessoal ficam fora do rateio automático para não duplicar a mão de obra direta informada no cálculo da receita.</p></div></div>
      </Card>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div><p className="text-xs font-semibold text-primary">PASSO 1</p><h2 className="font-semibold text-lg">Quais despesas entram no rateio?</h2><p className="text-xs text-muted-foreground mt-1">Ative somente os grupos que devem compor o custo mensal distribuído entre suas receitas.</p></div>
            <div className="space-y-2">
              {GRUPOS_RATEAVEIS.map((g) => {
                const ativo = grupos.includes(g.value);
                return <div key={g.value} className={`rounded-lg border p-4 flex items-start gap-3 ${ativo ? "bg-primary/5 border-primary/20" : ""}`}><Switch checked={ativo} onCheckedChange={(v) => toggleGrupo(g.value, v)} /><div className="flex-1 min-w-0"><div className="flex justify-between gap-3"><p className="text-sm font-medium">{g.label}</p><strong className="text-sm">{money(totaisPorGrupo[g.value])}</strong></div><p className="text-xs text-muted-foreground mt-1">{g.descricao}</p></div></div>;
              })}
            </div>
            <div className="rounded-lg bg-muted/40 p-3 flex justify-between text-sm"><span>Total mensal selecionado</span><strong>{money(totalIncluido)}</strong></div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Calculator className="w-5 h-5" /></div><div><p className="text-xs font-semibold text-primary">PASSO 2</p><h2 className="font-semibold text-lg">Quantas receitas completas você produz por mês?</h2><p className="text-xs text-muted-foreground mt-1">1 receita corresponde a 1 rendimento completo da receita selecionada, não a uma porção.</p></div></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Quantidade mensal de receitas</label><Input className="mt-1" type="number" min="0" step="1" value={volumeEfetivo} onChange={(e) => setVolume(e.target.value)} placeholder="Ex.: 40" /><p className="text-[11px] text-muted-foreground mt-1">Informe a quantidade média de rendimentos completos produzidos no mês.</p></div>
              <div><label className="text-sm font-medium">Método de rateio</label><div className="mt-1 h-9 rounded-md border bg-muted/40 px-3 flex items-center text-sm">Por receita produzida</div><p className="text-[11px] text-muted-foreground mt-1">Total mensal selecionado ÷ quantidade mensal de receitas.</p></div>
            </div>
            {totalIncluido > 0 && num(volumeEfetivo) > 0 && <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-xs text-primary"><strong>{money(totalIncluido)}</strong> ÷ <strong>{num(volumeEfetivo)} receita(s)</strong> = <strong>{money(custoRateado)} por receita</strong>.</div>}
          </Card>

          <Card className="overflow-hidden">
            <Accordion type="single" collapsible>
              <AccordionItem value="complementares" className="border-0"><AccordionTrigger className="px-5 py-4 hover:no-underline"><div className="text-left"><p className="font-semibold">Padrões para novos cálculos</p><p className="text-xs font-normal text-muted-foreground mt-1">Valor da hora de trabalho e markup inicial. Estes campos não alteram o rateio acima.</p></div></AccordionTrigger><AccordionContent className="px-5 pb-5"><div className="grid sm:grid-cols-2 gap-4"><div><label className="text-sm font-medium">Valor padrão da hora de trabalho</label><Input className="mt-1" type="number" min="0" step="0.01" value={valorHoraEfetivo} onChange={(e) => setValorHora(e.target.value)} /><p className="text-[11px] text-muted-foreground mt-1">Usado como valor inicial da mão de obra nos novos cálculos.</p></div><div><div className="flex items-center gap-1.5"><label className="text-sm font-medium">Markup padrão (x)</label><Popover><PopoverTrigger asChild><button type="button" className="text-muted-foreground hover:text-foreground" aria-label="O que é markup?"><CircleHelp className="w-3.5 h-3.5" /></button></PopoverTrigger><PopoverContent className="w-80 text-sm" align="start"><p className="font-medium">Markup é um multiplicador, não uma porcentagem.</p><p className="text-muted-foreground mt-2">Exemplo: custo de R$ 100,00 com markup de <strong className="text-foreground">2,50x</strong> resulta em preço-base de R$ 250,00, antes de outros ajustes.</p><p className="text-muted-foreground mt-2">Este valor é apenas o padrão inicial para novos cálculos e pode ser alterado em cada receita.</p></PopoverContent></Popover></div><Input className="mt-1" type="number" min="0.01" step="0.01" value={markupEfetivo} onChange={(e) => setMarkup(e.target.value)} placeholder="Ex.: 2,50" /><p className="text-[11px] text-muted-foreground mt-1">Informe o multiplicador. Ex.: 2,50x — não use %.</p></div></div></AccordionContent></AccordionItem>
            </Accordion>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20">
          <Card className="p-5">
            <div><p className="text-xs font-semibold text-primary">PASSO 3</p><div className="flex items-center gap-2 mt-0.5"><Settings2 className="w-5 h-5 text-primary" /><h2 className="font-semibold">Resultado do rateio</h2></div></div>
            <div className="space-y-3 mt-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Total mensal selecionado</span><strong>{money(totalIncluido)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Quantidade mensal</span><strong>{num(volumeEfetivo) > 0 ? `${num(volumeEfetivo)} receita(s)` : "—"}</strong></div><div className="border-t pt-3"><p className="text-xs text-muted-foreground">Custo rateado por receita</p><p className="text-3xl font-bold text-primary mt-1">{num(volumeEfetivo) > 0 ? money(custoRateado) : totalIncluido === 0 ? money(0) : "—"}</p></div></div>
            {num(volumeEfetivo) <= 0 && totalIncluido > 0 && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>Informe a quantidade mensal de receitas para calcular o rateio por receita.</span></div>}
            {totalIncluido === 0 && <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground"><span>Nenhuma despesa está sendo rateada. O custo rateado por receita será R$ 0,00.</span></div>}
            {totalIncluido > 0 && num(volumeEfetivo) > 0 && <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{money(totalIncluido)} ÷ {num(volumeEfetivo)} = {money(custoRateado)} por receita.</span></div>}
          </Card>

          <Card className="p-4"><div className="flex gap-3"><WalletCards className="w-5 h-5 text-primary shrink-0" /><div><p className="text-sm font-medium">Despesas com pessoal fora do rateio</p><p className="text-xs text-muted-foreground mt-1">Há {money(totalTrabalho)} cadastrado em “Despesas com pessoal”. Esse grupo não entra no rateio automático.</p></div></div></Card>

          <Card className="p-4"><p className="text-sm font-medium">Gerenciar despesas</p><p className="text-xs text-muted-foreground mt-1">Os valores desta tela vêm de Minhas Despesas.</p><Link to="/custos/despesas" className="text-xs text-primary underline mt-2 inline-block">Abrir Minhas Despesas</Link></Card>
        </div>
      </div>

      {(loadingConfig || loadingDespesas) && <p className="text-sm text-muted-foreground">Carregando configurações...</p>}
    </div>
  );
}
