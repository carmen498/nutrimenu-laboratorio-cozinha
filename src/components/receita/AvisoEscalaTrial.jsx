import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Sparkles, X } from "lucide-react";

const CHAVE_DISPENSA = "aviso_escala_trial_dispensado";

/**
 * Mensagem do "momento aha" (plano 3.4): aparece só para quem está em teste,
 * depois que a receita foi escalada, lembrando que o trabalho fica salvo no plano.
 */
export default function AvisoEscalaTrial({ visivel }) {
  const [dispensado, setDispensado] = useState(() => localStorage.getItem(CHAVE_DISPENSA) === "1");

  const { data: usuario } = useQuery({
    queryKey: ["usuario-atual-aviso-escala"],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  if (!visivel || dispensado) return null;
  if (!usuario || usuario.role === "admin" || usuario.status_assinatura !== "trial") return null;

  const dispensar = () => {
    localStorage.setItem(CHAVE_DISPENSA, "1");
    setDispensado(true);
  };

  return (
    <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
      <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <p className="flex-1 text-foreground">
        Foi isso: a receita inteira recalculada em segundos. Suas receitas, refeições e custos ficam
        salvos ao assinar.{" "}
        <Link to="/planos" className="font-semibold text-primary underline underline-offset-2">
          Ver planos
        </Link>
      </p>
      <button onClick={dispensar} aria-label="Fechar aviso" className="text-muted-foreground hover:text-foreground shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}