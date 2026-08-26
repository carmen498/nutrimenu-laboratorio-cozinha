import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// Fallback de Suspense das rotas carregadas sob demanda (React.lazy).
// Após 15 segundos, troca o spinner por uma saída clara para evitar espera infinita.
export default function RouteFallback({ fullScreen = false }) {
  const [demorando, setDemorando] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDemorando(true), 15000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-label="Carregando página"
      className={
        fullScreen
          ? "fixed inset-0 flex items-center justify-center bg-background"
          : "flex items-center justify-center py-24"
      }
    >
      {demorando ? (
        <div className="max-w-sm space-y-3 text-center">
          <p className="font-medium text-foreground">Esta página está demorando para carregar.</p>
          <p className="text-sm text-muted-foreground">Atualize para tentar novamente.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Atualizar página</Button>
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      )}
    </div>
  );
}