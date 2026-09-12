import React, { useEffect, useState } from "react";
import { Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const restante = (iso) => {
  const ms = Date.parse(iso) - Date.now();
  if (!(ms > 0)) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m} min`;
};

export default function OfertaConversaoCard({ expiraEm, descontos = {}, onEscolher }) {
  const [tempo, setTempo] = useState(() => restante(expiraEm));

  useEffect(() => {
    setTempo(restante(expiraEm));
    const id = setInterval(() => setTempo(restante(expiraEm)), 30000);
    return () => clearInterval(id);
  }, [expiraEm]);

  if (!tempo) return null;
  const planos = [["mensal", "Mensal"], ["anual", "Anual"]].filter(([id]) => Number(descontos[id]) > 0);

  return (
    <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />
          <div>
            <p className="font-heading font-semibold text-base">Oferta de primeira assinatura</p>
            <p className="text-sm mt-0.5">
              Seu teste está no fim. Assine agora com{" "}
              {planos.map(([id, nome], i) => (
                <span key={id}><strong>{descontos[id]}% de desconto no {nome}</strong>{i < planos.length - 1 ? " ou " : ""}</span>
              ))}. Válida uma única vez por conta.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
          <Clock className="w-4 h-4" /> Termina em {tempo}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {planos.map(([id, nome]) => (
          <Button key={id} size="sm" className="bg-amber-700 hover:bg-amber-800 text-white" onClick={() => onEscolher(id)}>
            Assinar {nome} com {descontos[id]}% off
          </Button>
        ))}
      </div>
    </div>
  );
}