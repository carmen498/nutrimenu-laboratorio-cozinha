import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const TEMAS = ["Fritura", "Congelamento", "Per Capita", "Precificação", "Ingredientes", "Rendimento", "Geral"];

export default function DicasCarmen() {
  const [temaAtivo, setTemaAtivo] = useState("Todas");

  const { data: dicas = [], isLoading } = useQuery({
    queryKey: ["dicas-carmen"],
    queryFn: () => base44.entities.DicaCarmen.filter({ status: "publicado" }, "-data_publicacao", 500),
  });

  const dicasFiltradas = temaAtivo === "Todas" ? dicas : dicas.filter((d) => d.tema === temaAtivo);

  return (
    <div className="pb-24 md:pb-8">
      <h1 className="font-display text-2xl font-bold mb-4" style={{ color: "#2A4E3D" }}>
        Dicas da Carmen
      </h1>

      {/* Filtro por tema */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["Todas", ...TEMAS].map((t) => (
          <button
            key={t}
            onClick={() => setTemaAtivo(t)}
            className="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
            style={
              temaAtivo === t
                ? { background: "#2A4E3D", color: "#fff", borderColor: "#2A4E3D" }
                : { background: "#fff", color: "#2A4E3D", borderColor: "#E8E0D5" }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando dicas...</p>
      ) : dicasFiltradas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma dica encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dicasFiltradas.map((dica) => (
            <Link
              key={dica.id}
              to={`/dicas-carmen/${dica.id}`}
              className="flex flex-col rounded-lg overflow-hidden border bg-white hover:shadow-md transition-shadow group"
              style={{ borderColor: "#E8E0D5" }}
            >
              <div className="aspect-[16/9] w-full overflow-hidden" style={{ background: "#EFE9DC" }}>
                {dica.imagem_capa ? (
                  <img
                    src={dica.imagem_capa}
                    alt={dica.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-display text-2xl font-bold" style={{ color: "#C9A24B" }}>LC</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <span
                  className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
                  style={{ background: "#E7F0EA", color: "#2A4E3D" }}
                >
                  {dica.tema}
                </span>
                <p className="font-semibold" style={{ color: "#2A4E3D" }}>{dica.titulo}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}