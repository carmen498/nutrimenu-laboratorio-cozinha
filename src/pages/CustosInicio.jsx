import { Calculator, History, LockKeyhole, Settings2, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CustosInicio() {
  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold">Laboratório de Custos</h1>
          <Badge variant="outline" className="gap-1">
            <LockKeyhole className="w-3 h-3" /> Beta interna
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Fundação técnica do novo complemento. Nesta fase, nenhum cálculo comercial está ativo para clientes.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <WalletCards className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">Minhas Despesas</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">Cadastre seus gastos mensais e defina a base de rateio usada pelo Laboratório de Custos.</p>
          </div>
          <Link to="/custos/despesas" className="inline-flex items-center justify-center h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Abrir Minhas Despesas</Link>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Calculator className="w-5 h-5" /></div>
          <div className="flex-1"><h2 className="font-semibold">Calcular Custo</h2><p className="text-sm text-muted-foreground mt-1">Calcule o custo real de uma produção usando a Receita, suas despesas, mão de obra e custos adicionais.</p></div>
          <Link to="/custos/calcular" className="inline-flex items-center justify-center h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Calcular agora</Link>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><History className="w-5 h-5" /></div>
          <div className="flex-1"><h2 className="font-semibold">Histórico de Cálculos</h2><p className="text-sm text-muted-foreground mt-1">Consulte fichas anteriores, compare resultados e recalcule uma receita sem sobrescrever o histórico.</p></div>
          <Link to="/custos/historico" className="inline-flex items-center justify-center h-9 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">Ver histórico</Link>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Settings2 className="w-5 h-5" /></div>
          <div className="flex-1"><h2 className="font-semibold">Configurações de Rateio</h2><p className="text-sm text-muted-foreground mt-1">Defina volume mensal, grupos incluídos e padrões usados nos cálculos de custo.</p></div>
          <Link to="/custos/configuracoes" className="inline-flex items-center justify-center h-9 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">Configurar rateio</Link>
        </div>
      </Card>
    </div>
  );
}
