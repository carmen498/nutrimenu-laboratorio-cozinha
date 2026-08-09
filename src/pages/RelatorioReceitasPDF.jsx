import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { getCategorias } from "@/lib/categoriasHelper";
import { CATEGORIAS as CATEGORIAS_RECEITA } from "@/components/receita/CategoriaPicker";
import { printarElementoIsolado } from "@/lib/printIsolado";

function formatarPC(r) {
  const pc = r.per_capita_g;
  return pc != null && pc > 0 ? `${pc.toLocaleString("pt-BR")} g` : "—";
}
function formatarRendimento(r) {
  const v = r.rendimento_total;
  if (v == null || v <= 0) return "—";
  return `${(v / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}
function formatarCusto(r) {
  const c = r.custo_por_porcao;
  return c != null && c > 0
    ? `R$ ${c.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";
}

// Tela de pré-visualização do PDF de Receitas (Todas as receitas / Categoria atual).
// Mesmo padrão da Ficha Técnica: pré-visualiza renderizado antes de exportar; o botão
// "Exportar PDF" usa impressão isolada (não afeta a navegação/histórico da tela por trás).
export default function RelatorioReceitasPDF() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const categoriaFiltro = urlParams.get("categoria") || null;

  const { data: receitas = [], isLoading } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "-nome"),
  });

  const grupos = useMemo(() => {
    const lista = categoriaFiltro
      ? receitas.filter((r) => getCategorias(r).includes(categoriaFiltro))
      : receitas;
    const nomesGrupos = categoriaFiltro ? [categoriaFiltro] : CATEGORIAS_RECEITA;
    return nomesGrupos
      .map((grupo) => ({
        nome: grupo,
        itens: lista
          .filter((r) => getCategorias(r).includes(grupo))
          .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")),
      }))
      .filter((g) => g.itens.length > 0);
  }, [receitas, categoriaFiltro]);

  const totalReceitas = categoriaFiltro
    ? receitas.filter((r) => getCategorias(r).includes(categoriaFiltro)).length
    : receitas.length;

  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  const escopoLabel = categoriaFiltro || "Todas as categorias";

  const handleExportar = () => {
    printarElementoIsolado(
      "relatorio-receitas-print-area",
      `@page { margin: 14mm 12mm; }
       table { border-collapse: collapse; width: 100%; }
       thead { display: table-header-group; }
       tr { break-inside: avoid; }
       .receita-grupo-titulo { break-after: avoid; break-inside: avoid; }`
    );
  };

  const handleShare = () => {
    let text = `📋 Receitas — ${escopoLabel} (${totalReceitas})\n\n`;
    grupos.forEach((g) => {
      text += `${g.nome.toUpperCase()} (${g.itens.length})\n`;
      g.itens.forEach((r) => { text += `• ${r.nome}\n`; });
      text += `\n`;
    });
    if (navigator.share) {
      navigator.share({ text });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center gap-2 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1">PDF de Receitas</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportar}>
            <Printer className="w-4 h-4 mr-1" /> Exportar PDF
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1" /> Compartilhar
          </Button>
        </div>
      </div>

      <div id="relatorio-receitas-print-area" className="bg-white border rounded-xl overflow-hidden print:border-0 print:rounded-none">
        <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm">Laboratório de Cozinha · Receitas que se Multiplicam · por Carmen Reinstein</p>
          <p className="font-display text-sm text-right">RECEITAS · emitido em {dataEmissao}</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold">{escopoLabel}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {totalReceitas} receita{totalReceitas !== 1 ? "s" : ""} · emitido em {dataEmissao}
            </p>
          </div>

          {grupos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma receita encontrada para este escopo.</p>
          ) : (
            grupos.map((g) => (
              <div key={g.nome} className="receita-grupo space-y-2">
                <h3 className="receita-grupo-titulo font-display text-base font-bold text-primary">
                  {g.nome.toUpperCase()} — {g.itens.length} receita{g.itens.length !== 1 ? "s" : ""}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b-2 border-border">
                      <th className="py-1.5 font-semibold">Nome</th>
                      <th className="py-1.5 font-semibold text-right">PC recomendado</th>
                      <th className="py-1.5 font-semibold text-right">Rendimento</th>
                      <th className="py-1.5 font-semibold text-right">Custo/porção</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.itens.map((r) => (
                      <tr key={r.id} className="border-b border-border/40">
                        <td className="py-1.5">{r.nome}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{formatarPC(r)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{formatarRendimento(r)}</td>
                        <td className="py-1.5 text-right font-medium">{formatarCusto(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}

          <p className="text-[11px] text-muted-foreground text-center pt-4 border-t border-border">
            Laboratório de Cozinha · Gastronomia Planejada · valores na data de emissão · {dataEmissao}
          </p>
        </div>
      </div>
    </div>
  );
}