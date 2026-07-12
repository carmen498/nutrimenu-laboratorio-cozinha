import { ChefHat, Layers } from "lucide-react";

function PassosList({ passos }) {
  if (!passos || passos.length === 0) {
    return <p className="text-sm italic text-muted-foreground">(sem modo de preparo cadastrado)</p>;
  }
  if (passos.length === 1) {
    return <p className="text-sm leading-relaxed whitespace-pre-line">{passos[0].replace(/^\d+[\.\-\)]\s*/, "")}</p>;
  }
  return (
    <ol className="space-y-2 list-decimal list-inside">
      {passos.map((passo, idx) => (
        <li key={idx} className="text-sm leading-relaxed pl-1">{passo.replace(/^\d+[\.\-\)]\s*/, "")}</li>
      ))}
    </ol>
  );
}

export default function ModoPreparoComposto({ blocos }) {
  return (
    <div className="space-y-4">
      {blocos.map((bloco, idx) => (
        <div key={idx} className={idx > 0 ? "pt-3 border-t border-border/50" : ""}>
          <h3 className="font-display text-sm font-bold mb-2 flex items-center gap-1.5">
            {bloco.tipo === "subreceita" ? (
              <>
                <ChefHat className="w-4 h-4 text-amber-600 shrink-0" />
                Modo de preparo — {bloco.nome}
              </>
            ) : (
              <>
                <Layers className="w-4 h-4 text-primary shrink-0" />
                Montagem
              </>
            )}
          </h3>
          <div className={bloco.tipo === "subreceita" ? "pl-6" : ""}>
            <PassosList passos={bloco.passos} />
          </div>
        </div>
      ))}
    </div>
  );
}