import React from "react";
import { ShieldCheck } from "lucide-react";
import { AVISO_DESISTENCIA_7_DIAS } from "@/lib/guiaZRPlanos";

// Direito de arrependimento: informação obrigatória, sempre visível antes do pagamento.
// Nunca em link e nunca escondida em Termos de Uso.
export default function AvisoDesistencia({ compacto = false }) {
  if (compacto) {
    return (
      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
        <span>7 dias para desistir e receber tudo de volta, sem justificar.</span>
      </p>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs leading-snug text-foreground">
      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
      <p>{AVISO_DESISTENCIA_7_DIAS}</p>
    </div>
  );
}