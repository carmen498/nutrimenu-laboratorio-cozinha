import React from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BannerVencido({ dataVencimento, onRenovar }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row items-center gap-3 justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
      <div className="flex items-center gap-2 text-destructive text-sm font-medium">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          Sua assinatura venceu em {dataVencimento}. Renove para continuar usando o
          Laboratório de Cozinha.
        </span>
      </div>
      <Button size="sm" variant="destructive" onClick={onRenovar} className="shrink-0">
        Renovar agora
      </Button>
    </div>
  );
}

export function BannerTrialExpirando({ diasRestantes, onAssinar }) {
  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="w-4 h-4 shrink-0" />
        <span>Trial expira em {diasRestantes} {diasRestantes === 1 ? "dia" : "dias"}</span>
      </div>
      <button
        onClick={onAssinar}
        className="text-sm font-semibold underline underline-offset-2 hover:text-amber-900"
      >
        Assinar agora
      </button>
    </div>
  );
}