import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

export default function AtualizarPrecosDialog({ open, onClose, ingredientes }) {
  const qc = useQueryClient();
  const [step, setStep] = useState("options"); // options | loading | results
  const [resultados, setResultados] = useState([]);
  const [selected, setSelected] = useState({});
  const [atualizando, setAtualizando] = useState(false);
  const [filterDesatualizados, setFilterDesatualizados] = useState(true);

  useEffect(() => {
    if (open) {
      setStep("options");
      setResultados([]);
      setSelected({});
      // Only show ingredients that actually need updating or have prices
      const relevant = ingredientes.filter(i => i.preco_embalagem_rs > 0 || i.preco_por_g_rs > 0);
      const init = {};
      relevant.forEach(i => { init[i.id] = true; });
      setSelected(init);
    }
  }, [open]);

  const handleBuscarIA = async () => {
    setStep("loading");
    try {
      const relevant = ingredientes.filter(i => i.preco_embalagem_rs > 0 || i.preco_por_g_rs > 0);
      const response = await base44.functions.invoke("buscarPrecosIA", {
        ingredientes: relevant.map(i => ({ id: i.id, nome: i.nome, preco_por_g_rs: i.preco_por_g_rs }))
      });
      setResultados(response.data.resultados || []);
      setStep("results");
    } catch (err) {
      toast.error("Erro ao buscar preços: " + err.message);
      setStep("options");
    }
  };

  const handleAplicar = async (aplicarTodos) => {
    setAtualizando(true);
    const now = new Date().toISOString();
    const idsToUpdate = aplicarTodos
      ? resultados.filter(r => r.encontrado).map(r => r.id)
      : resultados.filter(r => r.encontrado && selected[r.id]).map(r => r.id);

    let atualizados = 0;
    const receitasAfetadas = new Set();

    for (const res of resultados) {
      if (!idsToUpdate.includes(res.id) || !res.encontrado || !res.preco_sugerido_por_g) continue;

      const variacao = res.preco_atual > 0
        ? parseFloat((((res.preco_sugerido_por_kg - res.preco_atual) / res.preco_atual) * 100).toFixed(1))
        : 0;

      const preco_embalagem_rs = parseFloat((res.preco_sugerido_por_g * (ingredientes.find(i => i.id === res.id)?.peso_embalagem_g || 1000)).toFixed(2));

      const ing = ingredientes.find(i => i.id === res.id);
      const historico = [...(ing?.historico_precos || [])];
      historico.unshift({
        data: now,
        preco_por_kg: parseFloat(res.preco_sugerido_por_kg.toFixed(2)),
        variacao_percentual: variacao,
        fonte: "IA web"
      });

      await base44.entities.Ingrediente.update(res.id, {
        preco_embalagem_rs,
        preco_por_g_rs: res.preco_sugerido_por_g,
        preco_atualizado_em: now,
        fonte_preco: "IA web",
        preco_medio_nacional: res.preco_sugerido_por_kg,
        variacao_percentual: variacao,
        historico_precos: historico.slice(0, 5)
      });
      atualizados++;
    }

    // Find affected recipes and recalculate
    if (atualizados > 0) {
      const idsSet = new Set(idsToUpdate);
      const allItens = [];
      let skip = 0;
      while (true) {
        const batch = await base44.entities.IngredienteReceita.list("-created_date", 200, skip);
        if (!batch.length) break;
        allItens.push(...batch);
        skip += 200;
      }
      for (const item of allItens) {
        if (idsSet.has(item.ingrediente_id)) receitasAfetadas.add(item.receita_id);
      }

      for (const recId of receitasAfetadas) {
        try {
          const receitas = await base44.entities.Receita.filter({ id: recId });
          const receita = receitas[0];
          if (!receita) continue;
          const recItens = await base44.entities.IngredienteReceita.filter({ receita_id: recId });
          const allIngs = await base44.entities.Ingrediente.list("-nome", 500);
          const ingMap = {};
          allIngs.forEach(i => { ingMap[i.id] = i; });

          let custoIng = 0;
          for (const item of recItens) {
            if (item.tipo !== "ingrediente" || !item.ingrediente_id) continue;
            const ing = ingMap[item.ingrediente_id];
            const qtd = (item.quantidade_por_porcao || 0) * (receita.porcoes_base || 1);
            custoIng += qtd * (ing?.preco_por_g_rs || 0);
          }
          const custoInsumos = receita.custo_insumos || 0;
          const custoTotal = custoIng + custoInsumos;
          const custoPorcao = receita.porcoes_base > 0 ? custoTotal / receita.porcoes_base : 0;

          await base44.entities.Receita.update(recId, {
            custo_total: parseFloat(custoTotal.toFixed(2)),
            custo_por_porcao: parseFloat(custoPorcao.toFixed(2))
          });
        } catch {}
      }
    }

    qc.invalidateQueries({ queryKey: ["ingredientes"] });
    toast.success(`${atualizados} ingredientes atualizados · ${receitasAfetadas.size} receitas recalculadas`);
    setAtualizando(false);
    onClose();
  };

  const formatPrice = (v) => v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "—";
  const formatVariation = (v, sugestao, atual) => {
    if (!atual || atual === 0 || !sugestao) return <span className="text-gray-400">—</span>;
    const pct = ((sugestao - atual) / atual * 100).toFixed(1);
    if (pct > 0) return <span className="text-red-600 font-medium">+{pct}%</span>;
    if (pct < 0) return <span className="text-green-600 font-medium">{pct}%</span>;
    return <span className="text-gray-400">0%</span>;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {step === "options" && "Atualizar preços"}
            {step === "loading" && "Buscando preços..."}
            {step === "results" && "Revisão de preços encontrados"}
          </DialogTitle>
        </DialogHeader>

        {/* Step: Options */}
        {step === "options" && (
          <div className="space-y-4">
            <button
              onClick={handleBuscarIA}
              className="w-full p-4 rounded-lg border-2 border-primary/20 hover:border-primary/50 bg-primary/5 text-left transition-colors flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-primary">🤖 Buscar preços com IA</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A IA consulta preços médios nacionais na web para cada ingrediente cadastrado.
                  Você revisa os valores antes de confirmar.
                </p>
              </div>
            </button>

            <div className="w-full p-4 rounded-lg border-2 border-muted bg-muted/30 text-left opacity-60 cursor-not-allowed flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                <span className="text-lg">📊</span>
              </div>
              <div>
                <p className="font-bold text-muted-foreground">📊 Consultar CONAB/CEASA</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Integração com CONAB e CEASA em desenvolvimento — disponível em breve.
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Preços regionalizados por estado com atualização semanal automática.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Step: Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="font-medium">Consultando preços na web...</p>
            <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
          </div>
        )}

        {/* Step: Results */}
        {step === "results" && (
          <div className="space-y-3">
            {resultados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum resultado encontrado.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2">Ingrediente</th>
                        <th className="py-2 px-2 text-right">Preço atual/kg</th>
                        <th className="py-2 px-2 text-right">Preço sugerido/kg</th>
                        <th className="py-2 px-2 text-center">Variação</th>
                        <th className="py-2 px-2">Fonte</th>
                        <th className="py-2 pl-2 text-center">Aceitar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((res) => (
                        <tr key={res.id} className="border-b hover:bg-muted/30">
                          <td className="py-2 pr-2">
                            <p className="font-medium truncate max-w-[180px]">{res.nome}</p>
                            {res.observacao && <p className="text-xs text-muted-foreground">{res.observacao}</p>}
                          </td>
                          <td className="py-2 px-2 text-right whitespace-nowrap">
                            {formatPrice(res.preco_atual)}
                          </td>
                          <td className="py-2 px-2 text-right whitespace-nowrap">
                            {res.encontrado ? formatPrice(res.preco_sugerido_por_kg) : (
                              <span className="flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="w-3 h-3" /> Não localizado
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            {formatVariation(res.variacao_percentual, res.preco_sugerido_por_kg, res.preco_atual)}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            <Badge variant="secondary" className="text-[10px]">IA web</Badge>
                          </td>
                          <td className="py-2 pl-2 text-center">
                            <Checkbox
                              checked={!!selected[res.id]}
                              onCheckedChange={(v) => setSelected(s => ({ ...s, [res.id]: !!v }))}
                              disabled={!res.encontrado}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={onClose}>Cancelar</Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAplicar(true)}
                    disabled={atualizando || resultados.every(r => !r.encontrado)}
                  >
                    {atualizando ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                    Aceitar todos
                  </Button>
                  <Button
                    onClick={() => handleAplicar(false)}
                    disabled={atualizando || !resultados.some(r => r.encontrado && selected[r.id])}
                  >
                    {atualizando ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                    Aceitar selecionados
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}