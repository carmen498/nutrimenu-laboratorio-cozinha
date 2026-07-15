import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calculator } from "lucide-react";
import CalculadoraCusto from "@/components/CalculadoraCusto";

export default function CompraCustoCard({ ingrediente }) {
  const [showCalc, setShowCalc] = useState(false);

  const linhas = [
    ["Unidade de compra", ingrediente.unidade_compra || "—"],
    ["Embalagem (g)", ingrediente.peso_embalagem_g != null ? `${ingrediente.peso_embalagem_g} g` : "—"],
    ["Preço da embalagem", ingrediente.preco_embalagem_rs != null ? `R$ ${ingrediente.preco_embalagem_rs.toFixed(2).replace(".", ",")}` : "—"],
    ["Fornecedor", ingrediente.fornecedor || "—"],
    ["Fator de correção", ingrediente.fator_correcao != null ? String(ingrediente.fator_correcao).replace(".", ",") : "1,0"],
  ];

  return (
    <Card className="p-4">
      <h3 className="font-display font-bold mb-3">Compra e custo</h3>
      <div className="space-y-2">
        {linhas.map(([label, valor]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{valor}</span>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setShowCalc(true)}>
        <Calculator className="w-4 h-4 mr-1" /> Calculadora de custo
      </Button>

      <Dialog open={showCalc} onOpenChange={setShowCalc}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Calculadora de custo</DialogTitle>
          </DialogHeader>
          <CalculadoraCusto
            initialQuantidade={ingrediente.peso_embalagem_g || ""}
            initialPrecoTotal={ingrediente.preco_embalagem_rs || ""}
            onChange={() => {}}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}