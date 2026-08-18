import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Pencil, AlertTriangle, FileText, Merge, HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const isWeightUnit = (u) => ["G", "KG"].includes(u?.toUpperCase());
const isLiquidUnit = (u) => ["ML", "LT"].includes(u?.toUpperCase());

function diasDesde(dataIso) {
  if (!dataIso) return null;
  return Math.floor((new Date() - new Date(dataIso)) / (1000 * 60 * 60 * 24));
}

export default function IngredienteFichaHeader({ ingrediente, onEditar, onToggleFavorito, favoritando, onFundir }) {
  const navigate = useNavigate();
  const u = ingrediente.unidade_compra?.toUpperCase();
  const pricePerKg = (ingrediente.preco_por_g_rs || 0) * 1000;
  const dias = diasDesde(ingrediente.preco_atualizado_em);
  const precoDesatualizado = dias === null || dias > 90;

  const precoDestaque = isWeightUnit(u) || isLiquidUnit(u)
    ? `R$ ${pricePerKg.toFixed(2).replace(".", ",")} /kg${isLiquidUnit(u) ? "" : ""}`
    : `R$ ${(ingrediente.preco_embalagem_rs || 0).toFixed(2).replace(".", ",")} /${(u || "un").toLowerCase()}`;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ingredientes")} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl font-bold truncate">{ingrediente.nome}</h1>
            <button
              onClick={onToggleFavorito}
              disabled={favoritando}
              title={ingrediente.favorito ? "Remover dos favoritos" : "Marcar como favorito"}
              className="p-1 rounded-full hover:bg-muted shrink-0"
            >
              <Star className={`w-5 h-5 ${ingrediente.favorito ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <Badge variant="secondary" className="text-xs">{ingrediente.categoria || "Sem categoria"}</Badge>
            {ingrediente.fator_correcao && ingrediente.fator_correcao !== 1.0 && (
              <Badge variant="secondary" className="text-xs">FC {String(ingrediente.fator_correcao).replace(".", ",")}</Badge>
            )}
            <Badge
              className={`text-xs flex items-center gap-1 ${precoDesatualizado ? "bg-red-100 text-red-700 border-red-200" : "bg-secondary text-secondary-foreground"}`}
            >
              {precoDesatualizado && <AlertTriangle className="w-3 h-3" />}
              {dias === null ? "Preço nunca atualizado" : `Preço há ${dias} dia${dias === 1 ? "" : "s"}`}
            </Badge>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate(`/ingrediente/${ingrediente.id}/dossie`)} className="shrink-0">
          <FileText className="w-4 h-4 mr-1" /> Exportar PDF
        </Button>
        <Button variant="outline" onClick={onFundir} className="shrink-0">
          <Merge className="w-4 h-4 mr-1" /> Fundir com outro ingrediente
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground shrink-0" title="Como funciona fundir ingredientes?">
              <HelpCircle className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 text-sm" align="end">
            <p className="text-muted-foreground">
              Permite unificar dois cadastros de ingredientes que representam o mesmo item. Selecione o ingrediente que vai permanecer ativo e o ingrediente que será substituído — por exemplo, mantendo "Amido de milho" e substituindo "Maisena". Ao confirmar, "Maisena" é excluída do cadastro e automaticamente trocada por "Amido de milho" em todas as receitas onde era usada.
            </p>
          </PopoverContent>
        </Popover>
        <Button onClick={onEditar} className="shrink-0">
          <Pencil className="w-4 h-4 mr-1" /> Editar
        </Button>
      </div>

      <div className="flex justify-end">
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Preço atual</p>
          <p className="text-2xl font-bold text-primary">{precoDestaque}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            R$ {(ingrediente.preco_por_g_rs || 0).toFixed(4).replace(".", ",")}/g
            {ingrediente.fonte_preco && ` · ${ingrediente.fonte_preco}`}
            {ingrediente.fornecedor && ` · ${ingrediente.fornecedor}`}
          </p>
        </div>
      </div>
    </div>
  );
}