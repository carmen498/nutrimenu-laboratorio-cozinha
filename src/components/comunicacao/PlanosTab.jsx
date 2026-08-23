import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Pencil, RefreshCw, Star } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import ConfiguracaoPlanoDialog from "./ConfiguracaoPlanoDialog";

const formatarPreco = (plano) => {
  const valor = (plano.preco_exibido || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sufixo = plano.periodo_exibido === "mes" ? "/mês" : plano.periodo_exibido === "ano" ? "/ano" : "";
  return `R$ ${valor}${sufixo}`;
};

export default function PlanosTab() {
  const [planoEdicao, setPlanoEdicao] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);

  const { data: planos = [], isLoading, refetch } = useQuery({
    queryKey: ["configuracao-planos"],
    queryFn: () => base44.entities.ConfiguracaoPlano.list("ordem"),
  });

  const renovacoes = planos.filter((p) => p.plano_id === "renovacao");
  const renovacao = renovacoes[0];
  const renovacaoInvalida =
    renovacoes.length !== 1 ||
    !(Number(renovacao?.valor_cobranca) > 0) ||
    !(Number(renovacao?.preco_exibido) >= 0) ||
    !String(renovacao?.nome || "").trim();

  const sincronizarRenovacao = async () => {
    setSincronizando(true);
    try {
      const corrigirValor = renovacoes.length === 1 && !(Number(renovacao?.valor_cobranca) > 0);
      const resposta = await base44.functions.invoke("sincronizarConfiguracaoPlanos", {
        corrigir_valor_cobranca: corrigirValor,
      });
      toast({ title: "Configuração de Renovação sincronizada", description: `Ação: ${resposta.data?.acao || "concluída"}.` });
      await refetch();
    } catch (err) {
      toast({
        title: "Não foi possível sincronizar Renovação",
        description: err?.response?.data?.error || err.message || "Revise a configuração e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSincronizando(false);
    }
  };

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

      {renovacaoInvalida && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <div className="flex gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Configuração de Renovação precisa de atenção</p>
              <p className="text-sm">
                {renovacoes.length > 1
                  ? `Existem ${renovacoes.length} registros de Renovação. Remova a duplicidade antes de sincronizar.`
                  : "Crie ou corrija a configuração de Renovação para liberar o checkout e o preflight."}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={sincronizando || renovacoes.length > 1} onClick={sincronizarRenovacao}>
            {sincronizando ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            Sincronizar Renovação
          </Button>
        </div>
      )}

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