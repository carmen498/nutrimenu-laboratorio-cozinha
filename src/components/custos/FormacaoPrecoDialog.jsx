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
  margemPadrao = 20,
  dadosIniciais = null,
  custoComercializacaoPct = 0,
  aplicarCustoComercializacao = false,
}) {
  const margemInicial = useMemo(() => Math.min(90, numero(margemPadrao) || 20), [margemPadrao]);

  const [margem, setMargem] = useState(String(margemInicial.toFixed(1)).replace(".", ","));

  useEffect(() => {
    if (!open) return;
    setMargem(String(Number(dadosIniciais?.margemDesejadaPct ?? margemInicial).toFixed(1)).replace(".", ","));
  }, [open, margemInicial, dadosIniciais]);

  const margemPct = numero(margem);
  const taxasVariaveisPct = aplicarCustoComercializacao ? numero(custoComercializacaoPct) : 0;
  const custoFixoUnitario = 0;

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
      taxaCartaoPct: 0,
      impostosPct: 0,
      taxasVariaveisPct,
      custoFixoAdicionalUnitario: 0,
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
            Formação avançada do preço
          </DialogTitle>
          <DialogDescription>
            Informe a margem desejada. Se o Custo de Comercialização estiver ativado em Minhas Despesas, ele será considerado automaticamente.
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
                {[10, 15, 20, 25, 30].map((valor) => (
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
                <h3 className="font-semibold">Custo de comercialização</h3>
                <p className="text-xs text-muted-foreground mt-1">Este percentual é configurado uma única vez em Minhas Despesas e representa uma estimativa global dos custos que incidem sobre a venda.</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Percentual aplicado</p><p className="text-xs text-muted-foreground mt-1">{aplicarCustoComercializacao ? "Ativado em Minhas Despesas" : "Não aplicado neste cálculo"}</p></div><strong className="text-lg">{aplicarCustoComercializacao ? `${taxasVariaveisPct.toFixed(1).replace(".", ",")}%` : "0,0%"}</strong></div>
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
                    <p className="text-sm font-medium">Preço sugerido por receita</p>
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
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custo por receita</span><strong>{money(custoUnitario)}</strong></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Rateio incluído</span><strong>{money(custoRateadoUnitario)}</strong></div>
              <div className="border-t pt-3 flex justify-between text-sm"><span className="text-muted-foreground">Margem desejada</span><strong>{margemPct.toFixed(1).replace(".", ",")}%</strong></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custo médio de comercialização</span><strong>{taxasVariaveisPct.toFixed(1).replace(".", ",")}%</strong></div>
            </div>

            <div className="rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold">Resultado</h3>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Preço sugerido</span><strong>{formacao.valido ? money(precoSugerido) : "—"}</strong></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custos de comercialização</span><strong>{formacao.valido ? money(taxasValor + custoFixoUnitario) : "—"}</strong></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Lucro líquido por receita</span><strong>{formacao.valido ? money(lucroLiquidoUnitario) : "—"}</strong></div>
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
