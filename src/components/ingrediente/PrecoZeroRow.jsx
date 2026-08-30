import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PrecoZeroRow({ ingrediente, onSave, saving }) {
  const [quantidade, setQuantidade] = useState(String(ingrediente.peso_embalagem_g || 1000));
  const [preco, setPreco] = useState("");
  const quantidadeValida = Number(quantidade) > 0;
  const precoValido = Number(preco) > 0;

  return (
    <div className="grid gap-2 border-b border-border/60 p-3 last:border-0 md:grid-cols-[minmax(180px,1fr)_140px_140px_auto] md:items-end">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{ingrediente.nome}</p>
        <p className="text-xs text-muted-foreground">{ingrediente.categoria || "Sem categoria"} · {ingrediente.unidade_compra || "KG"}</p>
      </div>
      <label className="space-y-1 text-xs text-muted-foreground">
        Quantidade (g/ml)
        <Input aria-label={`Quantidade de ${ingrediente.nome}`} type="number" min="0.01" step="0.01" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        Preço da embalagem
        <Input aria-label={`Preço de ${ingrediente.nome}`} type="number" min="0.01" step="0.01" placeholder="R$ 0,00" value={preco} onChange={(e) => setPreco(e.target.value)} />
      </label>
      <Button disabled={saving || !quantidadeValida || !precoValido} onClick={() => onSave(ingrediente, Number(quantidade), Number(preco))}>
        {saving ? "Salvando..." : "Salvar preço"}
      </Button>
    </div>
  );
}