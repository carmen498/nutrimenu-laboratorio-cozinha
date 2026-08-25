import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calculator, CheckCircle2, Info } from "lucide-react";
import { calcularMarkupMultiplicador, calcularPrecoPorMargem } from "@/lib/custos/motorCustos";

const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numero = (v) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? Math.max(0, x) : 0;
};

export default function FormacaoPrecoDialog({
  open,
  onClose,
  onApply,
  custoUnitario = 0,
  custoPorPorcao = 0,
  custoRateadoUnitario = 0,
  markupPadrao = 3,
}) {
  const margemInicial = useMemo(() => {
    const markup = numero(markupPadrao);
    if (markup > 1) return Math.min(90, (1 - 1 / markup) * 100);
    return 40;
  }, [markupPadrao]);

  const [margem, setMargem] = useState(String(margemInicial.toFixed(1)).replace(".", ","));
  const [taxaCartao, setTaxaCartao] = useState("0");
  const [impostos, setImpostos] = useState("0");
  const [custoFixo, setCustoFixo] = useState("0");

  useEffect(() => {
    if (!open) return;
    setMargem(String(margemInicial.toFixed(1)).replace(".", ","));
    setTaxaCartao("0");
    setImpostos("0");
    setCustoFixo("0");
  }, [open, margemInicial]);

  const margemPct = numero(margem);
  const taxaCartaoPct = numero(taxaCartao);
  const impostosPct = numero(impostos);
  const taxasVariaveisPct = taxaCartaoPct + impostosPct;
  const custoFixoUnitario = numero(custoFixo);

  const formacao = calcularPrecoPorMargem({
    custoUnitario,
    margemDesejadaPct: margemPct,
    taxasVariaveisPct,
    custoFixoAdicionalUnitario: custoFixoUnitario,
  });

  const precoSugerido = formacao.preco || 0;
  const custoBaseFormacao = numero(custoUnitario) + custoFixoUnitario;
  const taxasValor = precoSugerido * taxasVariaveisPct / 100;
  const lucroLiquidoUnitario = Math.max(0, precoSugerido - custoBaseFormacao - taxasValor);
  const markup = calcularMarkupMultiplicador({ custoUnitario: custoBaseFormacao, precoVendaUnitario: precoSugerido });
  const precoPorPorcao = custoUnitario > 0 && custoPorPorcao > 0 ? precoSugerido * (custoPorPorcao / custoUnitario) : 0;

  const aplicar = () => {
    if (!formacao.valido || precoSugerido <= 0) return;
    onApply?.({
      precoSugerido,
      margemDesejadaPct: margemPct,
      margemLiquidaPct: margemPct,
      taxaCartaoPct,
      impostosPct,
      taxasVariaveisPct,
      custoFixoAdicionalUnitario: custoFixoUnitario,
      lucroLiquidoUnitario,
      markup,
    });
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-xl">
            <Calculator className="w-5 h-5 text-primary" />
            Formação do Preço
          </DialogTitle>
          <DialogDescription>
            Informe a margem que deseja obter. O Laboratório calcula o preço necessário para cobrir custos, taxas e lucro.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-[1fr_280px] gap-5">
          <div className="space-y-5">
            <section className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-primary">PASSO 1</p>
                <h3 className="font-semibold">Qual margem você deseja?</h3>
                <p className="text-xs text-muted-foreground mt-1">Margem é o lucro líquido como percentual do preço de venda.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[30, 40, 50, 60, 66.7].map((valor) => (
                  <Button
                    key={valor}
                    type="button"
                    variant={Math.abs(margemPct - valor) < 0.05 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMargem(String(valor).replace(".", ","))}
                  >
                    {String(valor).replace(".", ",")}%
                  </Button>
                ))}
              </div>
              <div className="max-w-xs">
                <Label>Margem desejada (%)</Label>
                <Input type="number" min="0" max="99" step="0.1" value={String(margem).replace(",", ".")} onChange={(e) => setMargem(e.target.value)} />
              </div>
            </section>

            <section className="space-y-3 border-t pt-4">
              <div>
                <p className="text-xs font-semibold text-primary">PASSO 2</p>
                <h3 className="font-semibold">Taxas da venda <span className="font-normal text-muted-foreground">(opcional)</span></h3>
                <p className="text-xs text-muted-foreground mt-1">Preencha somente taxas que incidem sobre o preço de venda.</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label>Cartão / plataforma (%)</Label>
                  <Input type="number" min="0" max="99" step="0.1" value={taxaCartao} onChange={(e) => setTaxaCartao(e.target.value)} />
                </div>
                <div>
                  <Label>Impostos (%)</Label>
                  <Input type="number" min="0" max="99" step="0.1" value={impostos} onChange={(e) => setImpostos(e.target.value)} />
                </div>
                <div>
                  <Label>Outro custo fixo por lote</Label>
                  <Input type="number" min="0" step="0.01" value={custoFixo} onChange={(e) => setCustoFixo(e.target.value)} />
                </div>
              </div>
              {taxasVariaveisPct > 0 && <p className="text-xs text-muted-foreground">Taxas percentuais consideradas: {taxasVariaveisPct.toFixed(1).replace(".", ",")}% do preço.</p>}
            </section>

            {!formacao.valido && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>A soma da margem desejada com as taxas precisa ser menor que 100%.</span>
              </div>
            )}

            <section className="space-y-3 border-t pt-4">
              <div>
                <p className="text-xs font-semibold text-primary">PASSO 3</p>
                <h3 className="font-semibold">Revisar e aplicar</h3>
              </div>
              <div className="rounded-xl border bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Preço sugerido por lote</p>
                    <p className="text-3xl font-bold text-primary mt-1">{formacao.valido ? money(precoSugerido) : "—"}</p>
                    {precoPorPorcao > 0 && <p className="text-xs text-muted-foreground mt-1">Equivale a aproximadamente {money(precoPorPorcao)} por porção.</p>}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-3">
            <div className="rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Resumo da formação</h3>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custo por lote</span><strong>{money(custoUnitario)}</strong></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Rateio incluído</span><strong>{money(custoRateadoUnitario)}</strong></div>
              {custoFixoUnitario > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custo fixo de venda</span><strong>{money(custoFixoUnitario)}</strong></div>}
              <div className="border-t pt-3 flex justify-between text-sm"><span className="text-muted-foreground">Margem desejada</span><strong>{margemPct.toFixed(1).replace(".", ",")}%</strong></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxas variáveis</span><strong>{taxasVariaveisPct.toFixed(1).replace(".", ",")}%</strong></div>
            </div>

            <div className="rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Resultado</h3>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Preço sugerido</span><strong>{formacao.valido ? money(precoSugerido) : "—"}</strong></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Lucro líquido por lote</span><strong>{formacao.valido ? money(lucroLiquidoUnitario) : "—"}</strong></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Margem líquida</span><strong>{formacao.valido ? `${margemPct.toFixed(1).replace(".", ",")}%` : "—"}</strong></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Markup</span><strong>{formacao.valido ? `${markup.toFixed(2).replace(".", ",")}x` : "—"}</strong></div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Margem ≠ markup.</strong> A margem é calculada sobre o preço de venda; o markup é a relação entre preço e custo.
            </div>
          </aside>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={aplicar} disabled={!formacao.valido || precoSugerido <= 0}>Aplicar e continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
