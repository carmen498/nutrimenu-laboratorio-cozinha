import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

function formatarDiasAtras(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "Atualizada hoje";
  if (diff === 1) return "Atualizada há 1 dia";
  return `Atualizada há ${diff} dias`;
}

export default function ReceitaDestaqueCard({ receita }) {
  const categoria = receita.categorias?.[0] || "";

  return (
    <Link
      to={`/receita/${receita.id}`}
      className="flex flex-col rounded-lg overflow-hidden border bg-white hover:shadow-md transition-shadow group"
      style={{ borderColor: "#E8E0D5" }}
    >
      <div className="aspect-[4/3] w-full overflow-hidden" style={{ background: "#EFE9DC" }}>
        {receita.foto_url ? (
          <img
            src={receita.foto_url}
            alt={receita.nome}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-display text-2xl font-bold" style={{ color: "#C9A24B" }}>LC</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-semibold truncate">{receita.nome?.toUpperCase?.() || receita.nome}</p>
        {categoria && <p className="text-xs text-muted-foreground truncate">{categoria}</p>}
        <p className="text-[11px] text-muted-foreground mt-0.5">{formatarDiasAtras(receita.updated_date)}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#2A4E3D" }}>
          Abrir <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}