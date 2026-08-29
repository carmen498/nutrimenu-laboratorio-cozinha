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
  bloqueado = false,
  mensagemBloqueio = "",
  complemento = null,
  complementoActionLabel = "",
  onComplementoAction,
  complementoActionDisabled = false,
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

      <div className="min-h-[150px] flex flex-col items-center">
        <h3 className="font-heading text-lg font-semibold text-foreground text-center mt-2">
          {nome}
        </h3>
        <p className="text-sm text-muted-foreground text-center mt-1">{subtitulo}</p>
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

      <div className="min-h-[140px] border-t border-border flex flex-col items-center justify-center py-5">
        <p className="font-heading text-3xl font-bold leading-tight text-center text-foreground">{preco}</p>
        {precoDetalhe && (
          <p className="text-xs text-muted-foreground mt-1 text-center">{precoDetalhe}</p>
        )}
      </div>

      <div className="min-h-[132px] border-t border-border pt-4 flex items-start">
        {complemento}
      </div>

      <div className="mt-auto min-h-[112px] flex flex-col justify-end">
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
            {diasRestantes != null && (
              <p className="text-xs font-medium text-primary">
                {diasRestantes} {diasRestantes === 1 ? "dia restante" : "dias restantes"}
              </p>
            )}
            {complementoActionLabel && (
              <Button
                className="w-full h-10 mt-2"
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