import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function useSaudeOperacional() {
  const queryClient = useQueryClient();
  const [sincronizando, setSincronizando] = useState(false);
  const query = useQuery({
    queryKey: ["admin-saude-operacional"],
    queryFn: async () => {
      const [pagamentos, webhooks, emails, usuarios] = await Promise.all([
        base44.entities.Pagamento.list("-created_date", 500),
        base44.entities.LogWebhookMercadoPago.list("-created_date", 500),
        base44.entities.LogEmail.list("-enviado_em", 500),
        base44.entities.User.list("-created_date", 500),
      ]);
      return { pagamentos, webhooks, emails, usuarios };
    },
    retry: false,
  });

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const response = await base44.functions.invoke("reprocessarPagamentoPix", { limite: 50 });
      await queryClient.invalidateQueries({ queryKey: ["admin-saude-operacional"] });
      return response.data?.resumo || {};
    } finally {
      setSincronizando(false);
    }
  };

  return { ...query, sincronizando, sincronizar };
}