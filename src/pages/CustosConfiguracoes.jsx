import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CircleHelp, Save, Settings2, WalletCards } from "lucide-react";
import { toast } from "sonner";

const num = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

export default function CustosConfiguracoes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [markup, setMarkup] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const { data: configuracoes = [], isLoading } = useQuery({
    queryKey: ["custos-config", user?.id],
    queryFn: () => base44.entities.ConfiguracaoCustosUsuario.filter({ user_id: user.id }, "-updated_date", 10),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const config = configuracoes[0] || null;
  const markupEfetivo = markup ?? String(config?.markup_padrao ?? 3);

  const salvar = async () => {
    if (!user?.id) return;
    const valor = num(markupEfetivo);
    if (valor <= 0) return toast.error("O markup padrão deve ser maior que zero.");
    setSalvando(true);
    try {
      const payload = {
        user_id: user.id,
        ...(config || {}),
        markup_padrao: valor,
        ativo: true,
      };
      delete payload.id;
      delete payload.created_date;
      delete payload.updated_date;
      delete payload.created_by_id;
      if (config?.id) await base44.entities.ConfiguracaoCustosUsuario.update(config.id, payload);
      else await base44.entities.ConfiguracaoCustosUsuario.create(payload);
      setMarkup(null);
      await qc.invalidateQueries({ queryKey: ["custos-config", user.id] });
      toast.success("Configurações salvas.");
    } catch (err) {
      toast.error("Não foi possível salvar: " + (err?.message || "erro inesperado"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">Defina padrões gerais usados ao iniciar novos cálculos.</p>
        </div>
        <Button onClick={salvar} disabled={salvando || isLoading}><Save className="w-4 h-4 mr-2" />{salvando ? "Salvando..." : "Salvar configurações"}</Button>
      </div>

      <Card className="p-5 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <WalletCards className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="font-semibold">Custo do Negócio</h2>
            <p className="text-sm text-muted-foreground mt-1">A distribuição por Dia/Mês, os grupos de despesas e o Custo médio de comercialização agora são configurados diretamente em Minhas Despesas.</p>
            <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/custos/despesas">Abrir Minhas Despesas</Link></Button>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-start gap-3"><Settings2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><h2 className="font-semibold">Padrão para formação do preço</h2><p className="text-xs text-muted-foreground mt-1">Este valor é apenas o ponto de partida e pode ser alterado em cada receita.</p></div></div>
        <div className="max-w-sm">
          <div className="flex items-center gap-1.5"><label className="text-sm font-medium">Markup padrão (x)</label><Popover><PopoverTrigger asChild><button type="button" className="text-muted-foreground hover:text-foreground" aria-label="O que é markup?"><CircleHelp className="w-3.5 h-3.5" /></button></PopoverTrigger><PopoverContent className="w-80 text-sm" align="start"><p className="font-medium">Markup é um multiplicador, não uma porcentagem.</p><p className="text-muted-foreground mt-2">Exemplo: custo de R$ 100,00 com markup de 2,50x gera preço-base de R$ 250,00.</p></PopoverContent></Popover></div>
          <Input className="mt-1" type="number" min="0.01" step="0.01" value={markupEfetivo} onChange={(e) => setMarkup(e.target.value)} placeholder="Ex.: 2,50" />
          <p className="text-[11px] text-muted-foreground mt-1">Informe o multiplicador. Ex.: 2,50x — não use %.</p>
        </div>
      </Card>
    </div>
  );
}
