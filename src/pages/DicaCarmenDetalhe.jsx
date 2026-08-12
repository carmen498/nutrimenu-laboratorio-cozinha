import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";

export default function DicaCarmenDetalhe() {
  const { id } = useParams();

  const { data: dica, isLoading } = useQuery({
    queryKey: ["dica-carmen", id],
    queryFn: () => base44.entities.DicaCarmen.get(id),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando dica...</p>;
  }

  if (!dica) {
    return <p className="text-sm text-muted-foreground">Dica não encontrada.</p>;
  }

  const dataFormatada = dica.data_publicacao
    ? new Date(dica.data_publicacao).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-8">
      <Link to="/dicas-carmen" className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4" style={{ color: "#2A4E3D" }}>
        <ArrowLeft className="w-4 h-4" /> Ver todas as dicas
      </Link>

      <Card className="bg-white border overflow-hidden" style={{ borderColor: "#E8E0D5" }}>
        {dica.imagem_capa && (
          <div className="w-full aspect-[16/7] overflow-hidden" style={{ background: "#EFE9DC" }}>
            <img src={dica.imagem_capa} alt={dica.titulo} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <span
            className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-3"
            style={{ background: "#E7F0EA", color: "#2A4E3D" }}
          >
            {dica.tema}
          </span>
          <h1 className="font-display text-2xl font-bold mb-2" style={{ color: "#2A4E3D" }}>
            {dica.titulo}
          </h1>
          {dica.pergunta_gatilho && (
            <p className="text-sm italic text-muted-foreground mb-4">"{dica.pergunta_gatilho}"</p>
          )}
          <p className="whitespace-pre-line text-sm leading-relaxed mb-6">{dica.conteudo}</p>
          <div className="pt-4 border-t text-xs text-muted-foreground" style={{ borderColor: "#E8E0D5" }}>
            <p>{dica.autor}</p>
            {dataFormatada && <p>Publicado em {dataFormatada}</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}