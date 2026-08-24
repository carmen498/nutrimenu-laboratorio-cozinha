import { Calculator, LockKeyhole } from "lucide-react";
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

      <Card className="p-6 border-dashed">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold">Módulo isolado e pronto para a próxima fase</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              As próximas etapas serão implementadas somente dentro do namespace /custos, consumindo dados do Laboratório de Cozinha sem criar dependência inversa.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
