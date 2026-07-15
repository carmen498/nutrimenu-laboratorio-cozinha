import { Check, AlertTriangle } from "lucide-react";
import { CATEGORIAS } from "@/components/receita/CategoriaPicker";

// Detail panel for one parsed recipe — reused both for the single-recipe
// preview and for each expandable row in the batch preview list.
export default function ImportarReceitaTextoItemDetail({ item }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Nome</p>
          <p className="font-semibold">{item.nome}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Categoria</p>
          <p className="font-semibold">{CATEGORIAS.includes(item.categoria) ? item.categoria : (item.categoria || "— (Revisar)")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">PC</p>
          <p className="font-semibold">{item.porcao ? `${item.porcao}g` : "—"}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold mb-1.5">Ingredientes</p>
        <div className="space-y-1 max-h-56 overflow-y-auto border rounded-lg p-2">
          {item.ingredientes.map((ing, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-1.5 rounded text-sm ${ing.resolvido ? "bg-green-50" : "bg-amber-50 border border-amber-200"}`}
            >
              {ing.resolvido ? <Check className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
              <span className="flex-1">
                {ing.resolvido ? (
                  <>
                    <span className="font-medium">{ing.ingrediente_nome}</span>
                    {ing.ingrediente_nome.toLowerCase() !== ing.nome_texto.toLowerCase() && (
                      <span className="text-xs text-muted-foreground"> (de "{ing.nome_texto}"{ing.via_sinonimo ? " · via sinônimo" : ""})</span>
                    )}
                  </>
                ) : (
                  <span className="font-medium text-amber-800">{ing.nome_texto} — não encontrado</span>
                )}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{ing.quantidade_g}g</span>
              {ing.pre_preparo && <span className="text-xs text-muted-foreground italic shrink-0">({ing.pre_preparo})</span>}
            </div>
          ))}
        </div>
      </div>

      {item.modo_preparo && (
        <div>
          <p className="text-sm font-semibold mb-1">Modo de preparo</p>
          <p className="text-xs text-muted-foreground whitespace-pre-line bg-muted/40 p-2 rounded-lg">{item.modo_preparo}</p>
        </div>
      )}

      {item.nota && (
        <div>
          <p className="text-sm font-semibold mb-1">Nota</p>
          <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg">{item.nota}</p>
        </div>
      )}
    </div>
  );
}