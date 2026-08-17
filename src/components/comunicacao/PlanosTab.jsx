import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Star } from "lucide-react";
import ConfiguracaoPlanoDialog from "./ConfiguracaoPlanoDialog";

const formatarPreco = (plano) => {
  const valor = (plano.preco_exibido || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sufixo = plano.periodo_exibido === "mes" ? "/mês" : plano.periodo_exibido === "ano" ? "/ano" : "";
  return `R$ ${valor}${sufixo}`;
};

export default function PlanosTab() {
  const [planoEdicao, setPlanoEdicao] = useState(null);

  const { data: planos = [], isLoading, refetch } = useQuery({
    queryKey: ["configuracao-planos"],
    queryFn: () => base44.entities.ConfiguracaoPlano.list("ordem"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Edite aqui os valores e textos exibidos na tela pública de Planos. O valor "cobrado no checkout" é o que
        efetivamente será debitado no Mercado Pago.
      </p>

      {planos.map((plano) => (
        <div key={plano.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">{plano.nome}</p>
              {plano.mais_popular && (
                <Badge className="gap-1">
                  <Star className="w-3 h-3" /> Mais popular
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{plano.subtitulo}</p>
            <p className="text-sm mt-1">
              <span className="font-medium">{formatarPreco(plano)}</span>
              {plano.preco_detalhe && <span className="text-muted-foreground"> · {plano.preco_detalhe}</span>}
              <span className="text-muted-foreground"> · cobrado: R$ {(plano.valor_cobranca || 0).toFixed(2)}</span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPlanoEdicao(plano)}>
            <Pencil className="w-4 h-4 mr-1.5" /> Editar
          </Button>
        </div>
      ))}

      {planoEdicao && (
        <ConfiguracaoPlanoDialog
          open={!!planoEdicao}
          onOpenChange={(v) => !v && setPlanoEdicao(null)}
          plano={planoEdicao}
          onSaved={refetch}
        />
      )}
    </div>
  );
}