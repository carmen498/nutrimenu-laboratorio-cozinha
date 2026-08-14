import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ArrowRight, Lightbulb } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";

export default function DicasCarmenCarousel() {
  const [indice, setIndice] = useState(0);

  const { data: dicas = [] } = useQuery({
    queryKey: ["dicas-carmen-destaque-home"],
    queryFn: () => base44.entities.DicaCarmen.filter({ status: "publicado", destaque: true }, "-data_publicacao", 20),
  });

  const { data: configs = [] } = useQuery({
    queryKey: ["configuracao-carmen"],
    queryFn: () => base44.entities.ConfiguracaoCarmen.list("", 1),
  });
  const fotoCarmen = configs[0]?.foto_url;

  if (dicas.length === 0) return null;

  const dicaAtual = dicas[indice] || dicas[0];
  const resumo = dicaAtual.conteudo?.slice(0, 140) + (dicaAtual.conteudo?.length > 140 ? "..." : "");

  const irPara = (i) => setIndice((i + dicas.length) % dicas.length);

  return (
    <Card className="p-5 bg-white border" style={{ borderColor: "#E8E0D5" }}>
      {/* Header: lâmpada + título à esquerda, "Ver todas" à direita */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" style={{ color: "#B8860B" }} />
          <h3 className="font-display text-sm font-bold uppercase tracking-wide" style={{ color: "#2A4E3D" }}>
            Dicas da Carmen
          </h3>
        </div>
        <Link to="/dicas-carmen" className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: "#2A4E3D" }}>
          Ver todas as dicas <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Conteúdo: foto da Carmen | texto | imagem do tema */}
      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_200px] gap-5 items-start">
        {/* Foto da Carmen + assinatura */}
        <div className="flex flex-col items-center md:items-start">
          <div
            className="w-full max-w-[140px] aspect-[3/5] rounded-lg overflow-hidden shrink-0"
            style={{ background: "#EFE9DC" }}
          >
            {fotoCarmen ? (
              <img src={fotoCarmen} alt="Carmen Reinstein" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-display text-2xl font-bold" style={{ color: "#C9A24B" }}>CR</span>
              </div>
            )}
          </div>
          <div className="mt-2 text-center md:text-left">
            <p className="text-sm font-semibold" style={{ color: "#2A4E3D" }}>Carmen Reinstein</p>
            <p className="text-xs text-muted-foreground">Nutricionista</p>
          </div>
        </div>

        {/* Texto */}
        <div className="min-w-0">
          <span
            className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wide"
            style={{ background: "#FFF3CD", color: "#B8860B" }}
          >
            Em destaque
          </span>
          <p className="font-display text-lg font-bold mb-1.5" style={{ color: "#2A4E3D" }}>{dicaAtual.titulo}</p>
          <p className="text-sm text-muted-foreground mb-3">{resumo}</p>
          <Link
            to={`/dicas-carmen/${dicaAtual.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-md transition-colors hover:opacity-90"
            style={{ background: "#2A4E3D" }}
          >
            Ler dica completa <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Imagem do tema */}
        <div className="aspect-[4/3] w-full rounded-lg overflow-hidden hidden md:block" style={{ background: "#EFE9DC" }}>
          {dicaAtual.imagem_capa ? (
            <img src={dicaAtual.imagem_capa} alt={dicaAtual.titulo} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-display text-2xl font-bold" style={{ color: "#C9A24B" }}>LC</span>
            </div>
          )}
        </div>
      </div>

      {/* Paginação: bolinhas + setas */}
      {dicas.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
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