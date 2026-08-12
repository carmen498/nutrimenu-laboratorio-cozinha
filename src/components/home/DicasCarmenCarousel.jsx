import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";

export default function DicasCarmenCarousel() {
  const [indice, setIndice] = useState(0);

  const { data: dicas = [] } = useQuery({
    queryKey: ["dicas-carmen-destaque-home"],
    queryFn: () => base44.entities.DicaCarmen.filter({ status: "publicado", destaque: true }, "-data_publicacao", 20),
  });

  if (dicas.length === 0) return null;

  const dicaAtual = dicas[indice] || dicas[0];
  const resumo = dicaAtual.conteudo?.slice(0, 160) + (dicaAtual.conteudo?.length > 160 ? "..." : "");

  const irPara = (i) => setIndice((i + dicas.length) % dicas.length);

  return (
    <Card className="p-5 bg-white border" style={{ borderColor: "#E8E0D5" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg font-bold" style={{ color: "#2A4E3D" }}>
          Dicas da Carmen
        </h3>
        <Link to="/dicas-carmen" className="text-xs font-semibold" style={{ color: "#2A4E3D" }}>
          Ver todas as dicas
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="aspect-[16/9] w-full rounded-lg overflow-hidden" style={{ background: "#EFE9DC" }}>
          {dicaAtual.imagem_capa ? (
            <img src={dicaAtual.imagem_capa} alt={dicaAtual.titulo} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-display text-2xl font-bold" style={{ color: "#C9A24B" }}>LC</span>
            </div>
          )}
        </div>
        <div>
          <span
            className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
            style={{ background: "#E7F0EA", color: "#2A4E3D" }}
          >
            {dicaAtual.tema}
          </span>
          <p className="font-semibold mb-1" style={{ color: "#2A4E3D" }}>{dicaAtual.titulo}</p>
          <p className="text-sm text-muted-foreground mb-3">{resumo}</p>
          <Link
            to={`/dicas-carmen/${dicaAtual.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-md transition-colors hover:opacity-90"
            style={{ background: "#2A4E3D" }}
          >
            Ler dica completa <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {dicas.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => irPara(indice - 1)} aria-label="Dica anterior">
            <ChevronLeft className="w-4 h-4" style={{ color: "#2A4E3D" }} />
          </button>
          <div className="flex items-center gap-1.5">
            {dicas.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndice(i)}
                aria-label={`Ir para dica ${i + 1}`}
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: i === indice ? "#2A4E3D" : "#E8E0D5" }}
              />
            ))}
          </div>
          <button onClick={() => irPara(indice + 1)} aria-label="Próxima dica">
            <ChevronRight className="w-4 h-4" style={{ color: "#2A4E3D" }} />
          </button>
        </div>
      )}
    </Card>
  );
}