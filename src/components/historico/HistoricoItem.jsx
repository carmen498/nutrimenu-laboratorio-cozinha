import { Link } from "react-router-dom";
import moment from "moment";
import { FileEdit } from "lucide-react";

export default function HistoricoItem({ registro }) {
  const dataFormatada = registro.created_date
    ? moment(registro.created_date).format("DD/MM/YYYY HH:mm")
    : "—";

  return (
    <div className="flex items-start gap-3 py-3 px-4 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: "#EAF0EC" }}>
        <FileEdit className="w-4 h-4" style={{ color: "#2A4E3D" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link
            to={`/receita/${registro.receita_id}`}
            className="font-semibold text-sm hover:underline"
            style={{ color: "#2A4E3D" }}
          >
            {registro.receita_nome || "Receita"}
          </Link>
          <span className="text-xs text-muted-foreground">{dataFormatada}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Alterado{registro.usuario_nome ? ` por ${registro.usuario_nome}` : ""}: {(registro.campos_alterados || []).join(", ") || "—"}
        </p>
      </div>
    </div>
  );
}