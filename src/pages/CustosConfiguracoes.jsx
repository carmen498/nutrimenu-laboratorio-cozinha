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
import { AlertCircle, Calculator, CheckCircle2, Info, Save, Settings2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { somarDespesasAtivas } from "@/lib/custos/motorCustos";

const GRUPOS_RATEAVEIS = [
  { value: "gastos_negocio", label: "Gastos do negócio", descricao: "Aluguel, internet, contabilidade e outros custos do negócio." },
  { value: "producao", label: "Produção", descricao: "Energia, gás, água e demais custos mensais de produção." },
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
          <p className="text-sm text-muted-foreground mt-1">Defina como as despesas mensais serão distribuídas entre suas produções.</p>
        </div>
        <Button onClick={salvar} disabled={salvando || loadingConfig}><Save className="w-4 h-4 mr-2" /> {salvando ? "Salvando..." : "Salvar configurações"}</Button>
      </div>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex gap-3 text-sm"><Info className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><p className="font-medium">O rateio usa apenas os grupos marcados abaixo.</p><p className="text-muted-foreground mt-1">“Seu trabalho / ajudantes” fica fora do rateio automático porque a mão de obra direta é calculada por horas na produção, evitando dupla contagem.</p></div></div>
      </Card>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Calculator className="w-5 h-5" /></div><div><h2 className="font-semibold text-lg">Base do rateio</h2><p className="text-xs text-muted-foreground mt-1">As despesas são divididas pelo número estimado de lotes/rendimentos completos produzidos no mês.</p></div></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Volume mensal estimado</label><Input className="mt-1" type="number" min="0" step="1" value={volumeEfetivo} onChange={(e) => setVolume(e.target.value)} placeholder="Ex.: 40" /><p className="text-[11px] text-muted-foreground mt-1">lotes/rendimentos completos por mês</p></div>
              <div><label className="text-sm font-medium">Método de rateio</label><div className="mt-1 h-9 rounded-md border bg-muted/40 px-3 flex items-center text-sm">Por lote produzido</div><p className="text-[11px] text-muted-foreground mt-1">Cada lote corresponde a um rendimento completo da receita.</p></div>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div><h2 className="font-semibold text-lg">Despesas incluídas no rateio</h2><p className="text-xs text-muted-foreground mt-1">Ative somente os grupos que devem compor o custo mensal rateado.</p></div>
            <div className="space-y-2">
              {GRUPOS_RATEAVEIS.map((g) => {
                const ativo = grupos.includes(g.value);
                return <div key={g.value} className={`rounded-lg border p-4 flex items-start gap-3 ${ativo ? "bg-primary/5 border-primary/20" : ""}`}><Switch checked={ativo} onCheckedChange={(v) => toggleGrupo(g.value, v)} /><div className="flex-1 min-w-0"><div className="flex justify-between gap-3"><p className="text-sm font-medium">{g.label}</p><strong className="text-sm">{money(totaisPorGrupo[g.value])}</strong></div><p className="text-xs text-muted-foreground mt-1">{g.descricao}</p></div></div>;
              })}
            </div>
            <div className="rounded-lg bg-muted/40 p-3 flex justify-between text-sm"><span>Total mensal incluído no rateio</span><strong>{money(totalIncluido)}</strong></div>
          </Card>

          <Card className="overflow-hidden">
            <Accordion type="single" collapsible>
              <AccordionItem value="complementares" className="border-0"><AccordionTrigger className="px-5 py-4 hover:no-underline"><div className="text-left"><p className="font-semibold">Informações complementares</p><p className="text-xs font-normal text-muted-foreground mt-1">Padrões usados em mão de obra e formação do preço.</p></div></AccordionTrigger><AccordionContent className="px-5 pb-5"><div className="grid sm:grid-cols-2 gap-4"><div><label className="text-sm font-medium">Valor padrão da hora de trabalho</label><Input className="mt-1" type="number" min="0" step="0.01" value={valorHoraEfetivo} onChange={(e) => setValorHora(e.target.value)} /><p className="text-[11px] text-muted-foreground mt-1">Usado como valor inicial da mão de obra nos novos cálculos.</p></div><div><label className="text-sm font-medium">Markup padrão</label><Input className="mt-1" type="number" min="0.01" step="0.01" value={markupEfetivo} onChange={(e) => setMarkup(e.target.value)} /><p className="text-[11px] text-muted-foreground mt-1">Usado como referência inicial na Formação do Preço.</p></div></div></AccordionContent></AccordionItem>
            </Accordion>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4">
          <Card className="p-5">
            <div className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-primary" /><h2 className="font-semibold">Resumo do rateio</h2></div>
            <div className="space-y-3 mt-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Despesas incluídas</span><strong>{money(totalIncluido)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Volume mensal</span><strong>{num(volumeEfetivo) > 0 ? `${num(volumeEfetivo)} lote(s)` : "—"}</strong></div><div className="border-t pt-3"><p className="text-xs text-muted-foreground">Custo rateado por lote</p><p className="text-3xl font-bold text-primary mt-1">{num(volumeEfetivo) > 0 ? money(custoRateado) : "—"}</p></div></div>
            {num(volumeEfetivo) <= 0 && totalIncluido > 0 && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>Informe o volume mensal para calcular o rateio por lote.</span></div>}
            {num(volumeEfetivo) > 0 && <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>Resumo consistente: {money(totalIncluido)} ÷ {num(volumeEfetivo)} = {money(custoRateado)} por lote.</span></div>}
          </Card>

          <Card className="p-4"><div className="flex gap-3"><WalletCards className="w-5 h-5 text-primary shrink-0" /><div><p className="text-sm font-medium">Trabalho mensal fora do rateio</p><p className="text-xs text-muted-foreground mt-1">Há {money(totalTrabalho)} cadastrado em “Seu trabalho / ajudantes”. Esse grupo não entra no rateio automático.</p></div></div></Card>

          <Card className="p-4"><p className="text-sm font-medium">Gerenciar despesas</p><p className="text-xs text-muted-foreground mt-1">Os valores desta tela vêm de Minhas Despesas.</p><Link to="/custos/despesas" className="text-xs text-primary underline mt-2 inline-block">Abrir Minhas Despesas</Link></Card>
        </div>
      </div>

      {(loadingConfig || loadingDespesas) && <p className="text-sm text-muted-foreground">Carregando configurações...</p>}
    </div>
  );
}
