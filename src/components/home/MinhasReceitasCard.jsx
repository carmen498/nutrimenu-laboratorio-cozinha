import { Link } from "react-router-dom";
import { FolderHeart, ArrowRight } from "lucide-react";

export default function MinhasReceitasCard({ count = 0 }) {
  return (
    <Link
      to="/minhas-receitas"
      className="relative rounded-xl overflow-hidden p-4 flex flex-col gap-2 text-white transition-all hover:shadow-md"
      style={{ background: "linear-gradient(135deg, #6B46C1 0%, #553C9A 100%)" }}
    >
      {/* Fitinha/marcador no canto superior direito */}
      <div
        className="absolute top-0 right-0 w-0 h-0"
        style={{ borderStyle: "solid", borderWidth: "0 28px 28px 0", borderColor: "transparent rgba(255,255,255,0.25) transparent transparent" }}
      />
      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/15">
        <FolderHeart className="w-5 h-5 stroke-[1.5]" />
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold uppercase tracking-wide">Minhas Receitas</p>
        <span className="text-xs font-bold bg-white/20 rounded-full px-2 py-0.5 shrink-0">{count}</span>
      </div>
      <p className="text-xs text-white/80">Suas receitas personalizadas e adaptadas para seu dia a dia.</p>
      <span className="inline-flex items-center gap-1 text-xs font-semibold mt-1">
        Ver minhas receitas <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}