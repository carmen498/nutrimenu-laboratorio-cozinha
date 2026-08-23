import { Link } from "react-router-dom";
import { FolderHeart } from "lucide-react";

export default function MeusIngredientesCard({ count = 0 }) {
  return (
    <Link
      to="/meus-ingredientes"
      className="relative rounded-xl overflow-hidden px-3 py-2.5 flex flex-col gap-1 text-white transition-all hover:shadow-md"
      style={{ background: "linear-gradient(135deg, #6B46C1 0%, #553C9A 100%)" }}
    >
      <div
        className="absolute top-0 right-0 w-0 h-0"
        style={{ borderStyle: "solid", borderWidth: "0 28px 28px 0", borderColor: "transparent rgba(255,255,255,0.25) transparent transparent" }}
      />
      <div className="flex items-center gap-2">
        <FolderHeart className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-sm font-bold uppercase tracking-wide truncate">Meus Ingredientes</span>
        <span className="text-[10px] font-bold bg-white/20 rounded-full px-1.5 h-5 flex items-center justify-center shrink-0">{count}</span>
      </div>
      <p className="text-xs text-white/80 leading-snug">
        Seus dados de compra, preços e fornecedores personalizados. →
      </p>
    </Link>
  );
}
