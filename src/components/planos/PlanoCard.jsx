import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Star, CheckCircle2 } from "lucide-react";

export default function PlanoCard({
  planoId,
  nome,
  subtitulo,
  preco,
  precoDetalhe,
  botaoLabel,
  destaque = false,
  loading = false,
  onClick,
  isCurrentPlan = false,
  validadeLabel,
  validadeData,
  diasRestantes,
  bloqueado = false,
  mensagemBloqueio,
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

      <h3 className="font-heading text-lg font-semibold text-foreground text-center mt-2">
        {nome}
      </h3>
      <p className="text-sm text-muted-foreground text-center mt-1">{subtitulo}</p>
      <p className="text-sm text-muted-foreground text-center">Todas funcionalidades</p>

      <div className="flex-1 flex flex-col items-center justify-center py-6">
        <p className="font-heading text-3xl font-bold text-foreground">{preco}</p>
        {precoDetalhe && (
          <p className="text-xs text-muted-foreground mt-1">{precoDetalhe}</p>
        )}
      </div>

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
  );
}