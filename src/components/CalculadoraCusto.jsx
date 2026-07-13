import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Calculator, Lightbulb, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EXEMPLOS = [
  {
    desc: "Comprei 300g de queijo com valor total de R$ 6,50",
    itens: 1,
    unidades: 1,
    quantidade: 300,
    precoTotal: 6.5,
    resultado: 21.6667,
    grava: "300g / R$ 6,50",
  },
  {
    desc: "Comprei 5 latas de sardinha de 195g cada com valor total de R$ 21,00",
    itens: 5,
    unidades: 1,
    quantidade: 195,
    precoTotal: 21.0,
    resultado: 21.5385,
    grava: "195g / R$ 4,20",
  },
  {
    desc: "Comprei 3 caixas de 12 ovos de 50g cada com valor total de R$ 18,00",
    itens: 3,
    unidades: 12,
    quantidade: 50,
    precoTotal: 18.0,
    resultado: 10.0,
    grava: "50g / R$ 0,50",
  },
  {
    desc: "Comprei 2 caixas de óleo de soja com 24 unidades de 900ml cada com valor total de R$ 155,00",
    itens: 2,
    unidades: 24,
    quantidade: 900,
    precoTotal: 155.0,
    resultado: 3.588,
    grava: "900ml / R$ 3,23",
  },
];

export default function CalculadoraCusto({
  onChange,
  initialItens = 1,
  initialUnidades = 1,
  initialQuantidade = "",
  initialPrecoTotal = "",
  erroQuantidade = null,
  avisoPreco = null,
}) {
  const [itens, setItens] = useState(initialItens);
  const [unidades, setUnidades] = useState(initialUnidades);
  const [quantidade, setQuantidade] = useState(initialQuantidade);
  const [precoTotal, setPrecoTotal] = useState(initialPrecoTotal);
  const [showExemplos, setShowExemplos] = useState(false);

  const resultado =
    itens > 0 && unidades > 0 && quantidade > 0
      ? (parseFloat(precoTotal) || 0) / (itens * unidades * parseFloat(quantidade)) * 1000
      : null;

  const pesoEmbalagem = parseFloat(quantidade) > 0 ? parseFloat(quantidade) : 0;
  const precoEmbalagem =
    itens > 0 && unidades > 0 ? (parseFloat(precoTotal) || 0) / (itens * unidades) : 0;

  useEffect(() => {
    onChange({
      peso_embalagem_g: pesoEmbalagem,
      preco_embalagem_rs: parseFloat(precoEmbalagem.toFixed(4)),
    });
  }, [pesoEmbalagem, precoEmbalagem]);

  return (
    <>
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Calculadora de custo</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowExemplos(true)}
          >
            <Lightbulb className="w-3.5 h-3.5" /> Exemplos
          </Button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Nº itens</Label>
              <Input
                type="number"
                min={1}
                value={itens}
                onChange={(e) => setItens(parseInt(e.target.value) || 1)}
                className="h-9 text-sm"
                placeholder="Quantas embalagens?"
              />
            </div>
            <div>
              <Label className="text-xs">Nº unidades</Label>
              <Input
                type="number"
                min={1}
                value={unidades}
                onChange={(e) => setUnidades(parseInt(e.target.value) || 1)}
                className="h-9 text-sm"
                placeholder="Unid. por embalagem"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Quantidade (g/ml)</Label>
              <Input
                type="number"
                step="0.1"
                value={quantidade}
                onChange={(e) => setQuantidade(parseFloat(e.target.value) || "")}
                className={`h-9 text-sm ${erroQuantidade ? "border-red-500 ring-1 ring-red-500" : ""}`}
                placeholder="Peso/unidade"
              />
              {erroQuantidade && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" /> {erroQuantidade}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Preço total (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={precoTotal}
                onChange={(e) => setPrecoTotal(parseFloat(e.target.value) || "")}
                className={`h-9 text-sm ${avisoPreco ? "border-amber-500 ring-1 ring-amber-500" : ""}`}
                placeholder="Valor da compra"
              />
              {avisoPreco && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" /> {avisoPreco}
                </p>
              )}
            </div>
          </div>
        </div>

        {resultado !== null && (
          <div className="mt-3 p-3 rounded-lg border-2 border-primary bg-primary/10 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">R$ por kg/L</p>
            <p className="text-xl font-bold text-primary">
              {resultado.toFixed(4).replace(".", ",")}
            </p>
          </div>
        )}

        {pesoEmbalagem > 0 && precoEmbalagem > 0 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Grava: {pesoEmbalagem}g / R$ {precoEmbalagem.toFixed(2).replace(".", ",")} por embalagem
          </p>
        )}
      </Card>

      {/* Exemplos dialog */}
      <Dialog open={showExemplos} onOpenChange={setShowExemplos}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Exemplos de cálculo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {EXEMPLOS.map((ex, idx) => (
              <Card key={idx} className="p-3 text-sm">
                <p className="font-medium mb-1">{ex.desc}</p>
                <p className="text-primary font-bold text-lg">
                  {ex.resultado.toFixed(4).replace(".", ",")} R$ kg/L
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Grava: {ex.grava}
                </p>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}