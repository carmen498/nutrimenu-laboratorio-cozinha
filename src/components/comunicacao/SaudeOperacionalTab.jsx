import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import SaudeMetricCard from "@/components/admin/SaudeMetricCard";
import useSaudeOperacional from "@/hooks/useSaudeOperacional";
import { calcularSaudeOperacional } from "@/lib/saudeOperacional";
import { calcularConversaoTrial } from "@/lib/conversaoTrial";
import ConversaoTrialCard from "@/components/admin/ConversaoTrialCard";

export default function SaudeOperacionalTab() {
  const { data, isLoading, isError, sincronizando, sincronizar } = useSaudeOperacional();
  const metricas = useMemo(() => calcularSaudeOperacional(data || {}), [data]);
  const conversao = useMemo(() => calcularConversaoTrial(data || {}), [data]);

  const handleSincronizar = async () => {
    try {
      const resumo = await sincronizar();
      toast.success("Conciliação concluída", {
        description: `${resumo.consultados || 0} consultados · ${resumo.atualizados || 0} atualizados`,
      });
    } catch (error) {
      toast.error("Não foi possível executar a conciliação", { description: error.message });
    }
  };

  if (isLoading) return <p role="status" className="text-sm text-muted-foreground">Carregando saúde operacional...</p>;
  if (isError) return <p role="alert" className="text-sm text-destructive">Não foi possível carregar os indicadores.</p>;

  return (
    <div className="space-y-4">
      <ConversaoTrialCard {...conversao} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricas.map((metrica) => <SaudeMetricCard key={metrica.titulo} {...metrica} />)}
      </div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleSincronizar} disabled={sincronizando}>
          <RefreshCw className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} />
          {sincronizando ? "Conciliando..." : "Executar conciliação"}
        </Button>
      </div>
    </div>
  );
}