import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Download } from "lucide-react";
import CabecalhoRelatorio from "@/components/relatorios/CabecalhoRelatorio";
import { calcularCustoCardapio } from "@/lib/custoCardapio";
import { montarFichaCustos } from "@/lib/fichaCustosCalc";
import { gerarFichaCustosPDF } from "@/lib/fichaCustosPDF";

// Tela de pré-visualização da Ficha de Custos do Cardápio (uso interno) — mesmo
// padrão de tela-primeiro da Ficha do Cardápio / Orçamento. Cálculo sempre ao vivo
// via calcularCustoCardapio (mesma fonte usada em CardapioAberto e no Orçamento).
export default function FichaCustosCardapio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [abrirIngredientes, setAbrirIngredientes] = useState(false);

  const { data: cardapio } = useQuery({
    queryKey: ["cardapio", id],
    queryFn: () => base44.entities.Cardapio.filter({ id }),
    select: (d) => d[0],
  });

  const { data: receitas = [] } = useQuery({
    queryKey: ["cardapio-receitas", id],
    queryFn: () => base44.entities.CardapioReceita.filter({ cardapio_id: id }, "ordem", 200),
  });

  const { data: insumos = [] } = useQuery({
    queryKey: ["cardapio-insumos", id],
    queryFn: () => base44.entities.CardapioInsumo.filter({ cardapio_id: id }, "created_date", 200),
  });

  const receitaIds = useMemo(() => [...new Set(receitas.map((r) => r.receita_id).filter(Boolean))], [receitas]);

  const { data: receitaMap = {} } = useQuery({
    queryKey: ["ficha-custos-receita-map", receitaIds],
    queryFn: async () => {
      const recs = await Promise.all(receitaIds.map((rid) => base44.entities.Receita.get(rid)));
      const map = {};
      recs.forEach((r) => { if (r) map[r.id] = r; });
      return map;
    },
    enabled: receitaIds.length > 0,
  });

  const { data: ingredientesPorReceita = {} } = useQuery({
    queryKey: ["ficha-custos-ingredientes", receitaIds],
    queryFn: async () => {
      const arrays = await Promise.all(receitaIds.map((rid) => base44.entities.IngredienteReceita.filter({ receita_id: rid }, "ordem", 200)));
      const map = {};
      receitaIds.forEach((rid, i) => { map[rid] = arrays[i] || []; });
      return map;
    },
    enabled: receitaIds.length > 0,
  });

  const ingredienteIds = useMemo(() => {
    const set = new Set();
    Object.values(ingredientesPorReceita).forEach((arr) => (arr || []).forEach((i) => { if (i.tipo === "ingrediente" && i.ingrediente_id) set.add(i.ingrediente_id); }));
    return [...set];
  }, [ingredientesPorReceita]);

  const { data: ingredienteMap = {} } = useQuery({
    queryKey: ["ficha-custos-ingrediente-map", ingredienteIds],
    queryFn: async () => {
      const ings = await Promise.all(ingredienteIds.map((iid) => base44.entities.Ingrediente.get(iid)));
      const map = {};
      ings.forEach((i) => { if (i) map[i.id] = i; });
      return map;
    },
    enabled: ingredienteIds.length > 0,
  });

  const num = cardapio ? Number(cardapio.num_unidades) || 1 : 1;

  const calcs = useMemo(() => {
    if (!cardapio) return null;
    return calcularCustoCardapio({ receitas, receitaMap, ingredientesPorReceita, insumos, num, markup: 0 });
  }, [cardapio, receitas, receitaMap, ingredientesPorReceita, insumos, num]);

  const relatorio = useMemo(() => {
    if (!cardapio || !calcs) return null;
    return montarFichaCustos({
      cardapio, num, receitasView: calcs.receitasView, receitaMap, ingredientesPorReceita, ingredienteMap,
      custoInsumos: calcs.custoInsumos, abrirIngredientes,
    });
  }, [cardapio, num, calcs, receitaMap, ingredientesPorReceita, ingredienteMap, abrirIngredientes]);

  if (!cardapio || !relatorio) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const handleExportar = () => gerarFichaCustosPDF(cardapio, relatorio);

  return (
    <div className="space-y-4 pb-24 md:pb-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 no-print flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/cardapio/${id}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1">Ficha de Custos</h1>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <Checkbox checked={abrirIngredientes} onCheckedChange={(v) => setAbrirIngredientes(!!v)} />
          Abrir ingredientes
        </label>
        <Button onClick={handleExportar}>
          <Download className="w-4 h-4 mr-1" /> Exportar PDF
        </Button>
      </div>

      <CabecalhoRelatorio
        titulo="Ficha de Custos"
        nome={cardapio.nome}
        data={relatorio.dataEvento}
        numPessoas={relatorio.numPessoas}
      />

      <div className="bg-white border rounded-xl p-6 space-y-6">
        {/* Indicadores */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded-lg p-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">Total de comida</p>
            <p className="font-semibold">{relatorio.totalComidaKgFmt} kg</p>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">Custo total</p>
            <p className="font-semibold">{relatorio.custoTotalFmt}</p>
          </div>
          <div className="border-2 border-primary rounded-lg p-3 text-center bg-primary/5">
            <p className="text-[11px] text-muted-foreground mb-1">Custo por pessoa</p>
            <p className="font-bold text-primary">{relatorio.custoPorPessoaFmt}</p>
          </div>
        </div>

        {/* Tabela por categoria */}
        {relatorio.grupos.map((g, gi) => (
          <div key={gi}>
            <h3 className="font-display text-sm font-bold uppercase tracking-wide mb-2">{g.categoria}</h3>
            <div className="flex font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b-2 border-border pb-1.5 mb-1 px-1">
              <span className="flex-1">Receita</span>
              <span className="w-16 text-right">Porções</span>
              <span className="w-20 text-right">Qtd. (kg)</span>
              <span className="w-24 text-right">Custo</span>
              <span className="w-16 text-right">%</span>
            </div>
            {g.itens.map((item) => (
              <div key={item.id}>
                <div className={`flex items-center py-1.5 border-b border-border/50 px-1 ${item.destaque ? "bg-amber-50" : ""}`}>
                  <span className="flex-1 text-sm">{item.nome}</span>
                  <span className="w-16 text-right text-sm">{item.porcoes}</span>
                  <span className="w-20 text-right text-sm">{item.qtdKgFmt}</span>
                  <span className="w-24 text-right text-sm font-medium">{item.custoFmt}</span>
                  <span className={`w-16 text-right text-sm ${item.destaque ? "font-bold text-primary" : ""}`}>{item.pctFmt}</span>
                </div>
                {item.ingredientes && (
                  <div className="pl-4 py-1 space-y-0.5">
                    {item.ingredientes.mostrados.map((ing, ii) => (
                      <p key={ii} className="text-xs text-muted-foreground italic">
                        ↳ {ing.nome} · {ing.qtdFmt} · {ing.custoFmt}
                      </p>
                    ))}
                    {item.ingredientes.resumoRestante && (
                      <p className="text-xs text-muted-foreground italic">
                        (+ {item.ingredientes.resumoRestante.qtd} ingredientes menores · {item.ingredientes.resumoRestante.custoFmt})
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {g.mostrarSubtotal && (
              <div className="flex justify-end gap-4 mt-1 text-xs font-semibold text-muted-foreground">
                <span>Subtotal: {g.subtotalKgFmt} kg · {g.subtotalCustoFmt}</span>
              </div>
            )}
          </div>
        ))}

        {/* Total */}
        <div className="flex items-center pt-2 border-t-2 border-border px-1">
          <span className="flex-1 font-display font-bold">TOTAL</span>
          <span className="w-16 text-right font-semibold">{relatorio.totalPorcoes}</span>
          <span className="w-20 text-right font-semibold">{relatorio.totalKgFmt}</span>
          <span className="w-24 text-right font-semibold">{relatorio.totalCustoFmt}</span>
          <span className="w-16 text-right font-bold text-primary">100,0%</span>
        </div>

        {/* Insumos */}
        {relatorio.temInsumos && (
          <div className="text-sm space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Insumos e embalagens</span>
              <span>{relatorio.custoInsumosFmt}</span>
            </div>
            <div className="flex justify-between font-bold text-primary">
              <span>Custo total de produção</span>
              <span>{relatorio.custoProducaoTotalFmt}</span>
            </div>
          </div>
        )}

        {/* Caixa de leitura */}
        {relatorio.leitura && (
          <div className="bg-secondary/40 rounded-lg p-3 text-xs italic text-muted-foreground">
            {relatorio.leitura}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center pt-4 border-t border-border">
          Laboratório de Cozinha · documento de uso interno — não enviar ao cliente
        </p>
      </div>
    </div>
  );
}