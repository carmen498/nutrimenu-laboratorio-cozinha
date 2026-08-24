import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calculator, Check, ChefHat, History, LockKeyhole, MessageCircle, Settings2, Sparkles, WalletCards } from "lucide-react";
import { LABORATORIO_CUSTOS_COMERCIAL_ENABLED } from "@/lib/laboratorioCustosAccess";

const BENEFICIOS = [
  { icon: WalletCards, titulo: "Custos reais do negócio", texto: "Some receita, despesas rateadas, mão de obra e custos adicionais sem misturar os dados técnicos da Cozinha." },
  { icon: Calculator, titulo: "Formação do preço", texto: "Descubra quanto cobrar a partir do custo, margem desejada, taxas e impostos informados." },
  { icon: History, titulo: "Histórico preservado", texto: "Mantenha fichas antigas como snapshots e recalcule quando preços ou receitas mudarem." },
  { icon: Settings2, titulo: "Rateio configurável", texto: "Defina volume mensal e quais grupos de despesas entram no rateio automático." },
];

const MENSAGEM_MOTIVO = {
  comercial_indisponivel: "A contratação comercial deste complemento ainda não foi liberada.",
  addon_nao_contratado: "Seu plano atual não inclui o Laboratório de Custos.",
  addon_ainda_nao_iniciado: "Seu acesso ao Laboratório de Custos ainda não iniciou.",
  addon_expirado: "O acesso ao Laboratório de Custos expirou.",
  feature_desligada: "O Laboratório de Custos está temporariamente indisponível.",
};

export default function CustosBloqueado() {
  const { user } = useAuth();
  const location = useLocation();
  const motivo = location.state?.motivo || (LABORATORIO_CUSTOS_COMERCIAL_ENABLED ? "addon_nao_contratado" : "comercial_indisponivel");
  const admin = user?.role === "admin";

  if (admin) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <Card className="p-8 text-center">
          <Sparkles className="w-10 h-10 mx-auto text-primary" />
          <h1 className="font-display text-2xl font-bold mt-4">Laboratório de Custos liberado para a beta interna</h1>
          <p className="text-sm text-muted-foreground mt-2">Administradores continuam com acesso mesmo enquanto a contratação comercial está desligada.</p>
          <Button asChild className="mt-5"><Link to="/custos">Abrir Laboratório de Custos</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-10">
      <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-6 items-stretch">
        <Card className="p-6 sm:p-8 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-primary/5" />
          <div className="relative">
            <Badge variant="outline" className="gap-1"><LockKeyhole className="w-3 h-3" /> Complemento opcional</Badge>
            <h1 className="font-display text-3xl font-bold mt-5">Laboratório de Custos</h1>
            <p className="text-lg text-muted-foreground mt-3 max-w-xl">Transforme o custo técnico das suas receitas em custo de produção, preço de venda e margem — sem sair do mesmo ambiente do Laboratório de Cozinha.</p>

            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-semibold">{MENSAGEM_MOTIVO[motivo] || "Este complemento não está liberado para sua conta."}</p>
              <p className="text-xs text-muted-foreground mt-1">Seu acesso atual ao Laboratório de Cozinha não é alterado por este bloqueio.</p>
            </div>
          </div>

          <div className="relative mt-8 flex flex-wrap gap-2">
            <Button disabled className="min-w-[190px]"><LockKeyhole className="w-4 h-4 mr-2" /> Adicionar ao plano · em breve</Button>
            <Button asChild variant="outline"><Link to="/suporte"><MessageCircle className="w-4 h-4 mr-2" /> Falar com suporte</Link></Button>
            <Button asChild variant="ghost"><Link to="/app"><ChefHat className="w-4 h-4 mr-2" /> Voltar à Cozinha</Link></Button>
          </div>
        </Card>

        <Card className="p-6 sm:p-8 bg-muted/20">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Adicionar ao seu plano</p>
          <h2 className="font-display text-2xl font-bold mt-2">Um complemento, não um novo plano</h2>
          <p className="text-sm text-muted-foreground mt-3">O Laboratório de Custos será contratado como módulo adicional ao seu acesso à Cozinha. Ele não substitui, renova ou muda a validade do plano principal.</p>

          <div className="mt-6 rounded-xl bg-background border p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Valor do complemento</p>
                <p className="text-2xl font-bold mt-1">A definir</p>
              </div>
              <Badge variant="secondary">Venda ainda não habilitada</Badge>
            </div>
            <div className="mt-4 pt-4 border-t space-y-2 text-sm">
              <div className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>Sem alteração automática no seu plano atual</span></div>
              <div className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>Histórico de cálculos preservado mesmo após bloqueio do módulo</span></div>
              <div className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>Reativação futura restaura o acesso às fichas já existentes</span></div>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">O que o complemento inclui</p>
        <h2 className="font-display text-xl font-bold mt-1">Da receita ao preço de venda</h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {BENEFICIOS.map(({ icon: Icon, titulo, texto }) => (
          <Card key={titulo} className="p-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icon className="w-5 h-5" /></div>
            <h3 className="font-semibold mt-4">{titulo}</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{texto}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><ChefHat className="w-5 h-5" /></div>
        <div className="flex-1"><h2 className="font-semibold">O Laboratório de Cozinha continua funcionando normalmente</h2><p className="text-sm text-muted-foreground mt-1">Receitas, ingredientes, cardápios e demais recursos do seu plano-base não dependem da contratação do Laboratório de Custos.</p></div>
        <Button asChild variant="outline"><Link to="/app">Voltar ao Laboratório de Cozinha</Link></Button>
      </Card>
    </div>
  );
}
