import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Star, CheckCircle2, Check } from "lucide-react";

export default function PlanoCard({
  planoId,
  nome,
  subtitulo,
  preco,
  precoDetalhe,
  beneficios,
  botaoLabel,
  destaque = false,
  loading = false,
  onClick,
  isCurrentPlan = false,
  validadeLabel,
  validadeData,
  diasRestantes = null,
  usoTrialLabel = "",
  bloqueado = false,
  mensagemBloqueio = "",
  complemento = null,
  complementoActionLabel = "",
  onComplementoAction = undefined,
  complementoActionDisabled = false,
  selo = "",
}) {
  return (
    <div
      id={`plano-${planoId}`}
      className={`relative flex flex-col h-full rounded-2xl p-6 bg-card transition-opacity ${
        destaque
          ? "border-[3px] border-primary shadow-lg"
          : "border border-border shadow-sm"
      } ${bloqueado ? "opacity-60" : ""}`}
    >
      {destaque && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
          <Star className="w-3 h-3" /> Mais popular
        </span>
      )}

      <div className="min-h-[112px] flex flex-col items-center">
        <h3 className="font-heading text-lg font-semibold text-foreground text-center mt-2">
          {nome}
        </h3>
        <p className="text-sm text-muted-foreground text-center mt-1">{subtitulo}</p>
        {selo && (
          <span className="mt-2 inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
            {selo}
          </span>
        )}
        {beneficios?.length > 0 ? (
          <ul className="mt-3 space-y-1.5 w-full">
            {beneficios.map((b) => (
              <li key={b} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> {b}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center">Todas funcionalidades</p>
        )}
      </div>

      <div className="min-h-[88px] border-t border-border flex flex-col items-center justify-center py-2">
        <p className="font-heading text-xl font-bold leading-none text-center text-foreground whitespace-nowrap">{preco}</p>
        {precoDetalhe && (
          <p className="text-xs text-muted-foreground mt-1 text-center">{precoDetalhe}</p>
        )}
      </div>

      <div className="min-h-[92px] border-t border-border pt-3 flex items-start">
        {complemento}
      </div>

      <div className="mt-auto min-h-[84px] flex flex-col justify-end">
        {isCurrentPlan ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-sm font-semibold px-3 py-2 rounded-lg w-full justify-center">
              <CheckCircle2 className="w-4 h-4" /> Seu plano atual
            </span>
            {validadeData && (
              <p className="text-xs text-muted-foreground">
                {validadeLabel} {validadeData}
              </p>
            )}
            {usoTrialLabel && (
              <p className="text-xs font-medium text-primary">{usoTrialLabel}</p>
            )}
            {complementoActionLabel && (
              <Button
                className="w-full h-9 mt-2 px-2 text-xs leading-tight whitespace-normal"
                variant="outline"
                disabled={complementoActionDisabled}
                onClick={onComplementoAction}
              >
                {complementoActionLabel}
              </Button>
            )}
          </div>
        ) : bloqueado ? (
          <div className="h-11 flex items-center justify-center text-xs text-center text-muted-foreground px-2">
            {mensagemBloqueio}
          </div>
        ) : (
          <Button
            className="w-full h-11 font-medium"
            variant={destaque ? "default" : "outline"}
            disabled={loading}
            onClick={onClick}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {botaoLabel}
          </Button>
        )}
      </div>
    </div>
  );
}