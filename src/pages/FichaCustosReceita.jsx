import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { montarFichaTecnica } from "@/lib/fichaTecnicaCalc";
import { printarElementoIsolado } from "@/lib/printIsolado";
import TabelaComposicaoCusto from "@/components/fichaCustos/TabelaComposicaoCusto";

export default function FichaCustosReceita() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: receita } = useQuery({
    queryKey: ["receita", id],
    queryFn: () => base44.entities.Receita.filter({ id }),
    select: (d) => d[0],
  });

  const { data: itens = [] } = useQuery({
    queryKey: ["itens-receita", id],
    queryFn: () => base44.entities.IngredienteReceita.filter({ receita_id: id }),
  });

  const { data: ingredientesDB = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
  });

  const { data: receitasBasicas = [] } = useQuery({
    queryKey: ["receitas-basicas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "-nome"),
  });

  const { data: insumosReceita = [] } = useQuery({
    queryKey: ["insumos-receita", id],
    queryFn: () => base44.entities.InsumoReceita.filter({ receita_id: id }),
  });

  const { data: esquecidos = [] } = useQuery({
    queryKey: ["esquecidos-receita", id],
    queryFn: () => base44.entities.IngredienteEsquecidoReceita.filter({ receita_id: id }),
  });

  const ingMap = useMemo(() => {
    const map = {};
    ingredientesDB.forEach((i) => { map[i.id] = i; });
    return map;
  }, [ingredientesDB]);

  const receitasBasicasMap = useMemo(() => {
    const map = {};
    receitasBasicas.forEach((r) => { map[r.id] = r; });
    return map;
  }, [receitasBasicas]);

  const ficha = useMemo(() => {
    if (!receita) return null;
    return montarFichaTecnica({ receita, itens, ingMap, receitasBasicasMap, insumosReceita, esquecidos });
  }, [receita, itens, ingMap, receitasBasicasMap, insumosReceita, esquecidos]);

  // Composição do custo: apenas itens com custo próprio (ingredientes reais e filhos
  // explodidos de sub-receita) — sem grupos e sem o marcador de sub-receita (custo 0).
  const { itensOrdenados, custoComposicao, concentracao } = useMemo(() => {
    if (!ficha) return { itensOrdenados: [], custoComposicao: 0, concentracao: null };
    const base = ficha.itensFichaAgrupada.filter((i) => !i.isGrupo && !i.isSubreceita);
    const ordenados = [...base].sort((a, b) => (b.custo || 0) - (a.custo || 0));
    const total = ordenados.reduce((s, i) => s + (i.custo || 0), 0);

    let acumulado = 0;
    let n = 0;
    for (const item of ordenados) {
      acumulado += item.custo || 0;
      n++;
      if (total > 0 && (acumulado / total) * 100 >= 70) break;
    }
    const pctAcumulado = total > 0 ? (acumulado / total) * 100 : 0;

    return { itensOrdenados: ordenados, custoComposicao: total, concentracao: total > 0 ? { n, pct: pctAcumulado } : null };
  }, [ficha]);

  if (!receita || !ficha) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  const formatCurrency = (v) => `R$ ${(v || 0).toFixed(2).replace(".", ",")}`;
  const formatKg = (g) => `${((g || 0) / 1000).toFixed(2).replace(".", ",")} kg`;
  const rendimentoKg = (ficha.rendimentoTotal || 0) / 1000;
  const custoPorKgPronto = rendimentoKg > 0 ? ficha.custoTotal / rendimentoKg : 0;
  const temInsumos = insumosReceita.length > 0 && ficha.custoInsumos > 0;

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center gap-2 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1">Ficha de Custos</h1>
        <Button onClick={() => printarElementoIsolado("ficha-custos-print-area", "@page { margin: 16mm 12mm; }")}>
          <Printer className="w-4 h-4 mr-1" /> ↓ Exportar PDF
        </Button>
      </div>

      <div id="ficha-custos-print-area" className="bg-white border rounded-xl overflow-hidden print:border-0 print:rounded-none">
        {/* Cabeçalho timbrado */}
        <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm">Laboratório de Cozinha · Receitas que se Multiplicam · por Carmen Reinstein</p>
          <p className="font-display text-sm text-right">FICHA DE CUSTOS · emitida em {dataEmissao}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Identificação */}
          <div>
            <h2 className="font-display text-2xl font-bold">{receita.nome}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {(receita.categorias || []).length > 0 ? receita.categorias.join(", ") + " · " : ""}
              PC {ficha.pcRecomendado} g · rende {formatKg(ficha.rendimentoTotal)} ({ficha.nPorcoes} porções)
            </p>
          </div>

          {/* Indicadores */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border bg-muted/30 text-center">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Custo Total</p>
              <p className="text-lg font-bold mt-1">{formatCurrency(ficha.custoTotal)}</p>
            </div>
            <div className="p-3 rounded-lg border-2 border-primary bg-primary/10 text-center">
              <p className="text-[10px] uppercase text-primary tracking-wide font-semibold">Custo por Porção</p>
              <p className="text-lg font-bold mt-1 text-primary">{formatCurrency(ficha.custoPorPorcao)}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/30 text-center">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Custo por Kg Pronto</p>
              <p className="text-lg font-bold mt-1">{formatCurrency(custoPorKgPronto)}</p>
            </div>
          </div>

          {/* Tabela de composição do custo */}
          <div>
            <h3 className="font-display text-base font-bold mb-2">Composição do Custo</h3>
            <TabelaComposicaoCusto itensOrdenados={itensOrdenados} totalCusto={custoComposicao} />
          </div>

          {/* Caixa de leitura */}
          {concentracao && (
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-sm">
              <p>
                <span className="font-semibold">Concentração:</span> os {concentracao.n} maiores ingredientes respondem por{" "}
                {concentracao.pct.toFixed(1).replace(".", ",")}% do custo
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Pesos: bruto {formatKg(ficha.pesoBruto)} · pronto {formatKg(ficha.rendimentoTotal)}
                {ficha.perda && (
                  <> · {ficha.perda.tipo === "ganho" ? "ganho" : "perda"} {ficha.perda.pct.toFixed(1).replace(".", ",")}%</>
                )}
              </p>
            </div>
          )}

          {/* Insumos e Embalagens */}
          {temInsumos && (
            <div style={{ breakInside: "avoid" }} className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Insumos e embalagens</span>
                <span className="font-medium">{formatCurrency(ficha.custoInsumos)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Custo total de produção</span>
                <span className="text-primary">{formatCurrency(ficha.custoTotal)}</span>
              </div>
            </div>
          )}

          {/* Rodapé */}
          <p className="text-[11px] text-muted-foreground text-center pt-4 border-t border-border">
            Laboratório de Cozinha · Gastronomia Planejada · custos na data de emissão · {dataEmissao}
          </p>
        </div>
      </div>
    </div>
  );
}