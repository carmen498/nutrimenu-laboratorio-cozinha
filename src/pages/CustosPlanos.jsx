import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, CreditCard, FlaskConical, LockKeyhole, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const dinheiro = (valor) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PlanoCard({ plano }) {
  const trial = plano.plano_id === "custos_trial";
  const anual = plano.plano_id === "custos_anual";
  return (
    <Card className={`p-5 flex flex-col relative ${anual ? "border-primary shadow-sm" : ""}`}>
      {anual && <Badge className="absolute right-4 top-4">Melhor valor</Badge>}
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{trial ? "Experimente" : "Plano"}</p>
      <h3 className="font-display text-xl font-bold mt-2">{plano.nome}</h3>
      <p className="text-sm text-muted-foreground mt-1 min-h-10">{plano.subtitulo}</p>
      <div className="mt-5">
        <span className="text-3xl font-bold">{trial ? "Grátis" : dinheiro(plano.preco_exibido)}</span>
        {!trial && <span className="text-xs text-muted-foreground ml-1">{anual ? "/ano" : "/30 dias"}</span>}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{plano.preco_detalhe}</p>
      <div className="mt-5 pt-4 border-t space-y-2 flex-1">
        {(plano.beneficios || []).map((beneficio) => (
          <div key={beneficio} className="flex gap-2 text-sm"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>{beneficio}</span></div>
        ))}
      </div>
      <Button disabled className="mt-5 w-full" variant={trial || anual ? "default" : "outline"}>
        <LockKeyhole className="w-4 h-4 mr-2" />
        {trial ? "Começar 7 dias grátis" : "Escolher este plano"}
      </Button>
      <p className="text-[11px] text-center text-amber-700 mt-2">Homologação: contratação desativada</p>
    </Card>
  );
}

export default function CustosPlanos() {
  const { user } = useAuth();
  const { data: configs = [] } = useQuery({
    queryKey: ["custos-config-addon-planos"],
    queryFn: () => base44.entities.ConfiguracaoAddonCustos.filter({ chave: "laboratorio_custos" }, "-updated_date", 10),
  });
  const { data: planos = [], isLoading } = useQuery({
    queryKey: ["custos-planos-interno"],
    queryFn: () => base44.entities.ConfiguracaoPlano.filter({ produto: "laboratorio_custos" }, "ordem", 10),
  });

  const config = configs[0] || null;
  const admin = user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Laboratório de Custos</p>
          <h1 className="font-display text-3xl font-bold mt-1">Planos</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">Prévia da oferta que será anexada ao Laboratório de Cozinha. Os valores estão cadastrados, mas trial público, checkout e venda continuam desligados.</p>
        </div>
        <Badge variant="outline" className="w-fit gap-1 border-amber-400 text-amber-900 bg-amber-50"><FlaskConical className="w-3.5 h-3.5" /> Homologação</Badge>
      </div>

      {admin && (
        <Card className="p-4 border-amber-300 bg-amber-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><p className="text-sm font-semibold text-amber-950">Status comercial atual</p><p className="text-xs text-amber-900 mt-1">A administração consegue validar esta tela sem publicar o produto para clientes.</p></div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Trial: {config?.trial_habilitado ? "ligado" : "desligado"}</Badge>
              <Badge variant="outline">Venda: {config?.venda_habilitada ? "ligada" : "desligada"}</Badge>
              <Badge variant="outline">Módulo: {config?.modulo_habilitado ? "liberado" : "restrito"}</Badge>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-sm text-muted-foreground">Carregando planos...</Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">{planos.map((plano) => <PlanoCard key={plano.id} plano={plano} />)}</div>
      )}

      <Card className="p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><CreditCard className="w-5 h-5" /></div>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Fluxo do trial</p><h2 className="font-display text-xl font-bold mt-1">7 dias grátis, sem perder o histórico</h2></div>
        </div>
        <div className="grid md:grid-cols-5 gap-3 mt-5 text-sm">
          {[['1','Ativar teste'],['2','Usar o módulo'],['3','Receber aviso'],['4','Encerrar acesso'],['5','Escolher plano']].map(([n,t]) => <div key={n} className="rounded-xl border p-4"><div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{n}</div><p className="font-semibold mt-3">{t}</p></div>)}
        </div>
      </Card>

      <Card className="p-5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div><h2 className="font-semibold">Nada foi publicado comercialmente</h2><p className="text-sm text-muted-foreground mt-1">Os botões permanecem inativos e a compra ainda não conversa com Mercado Pago. Esta tela existe para validar a experiência e os dados antes da integração final.</p></div>
      </Card>
    </div>
  );
}