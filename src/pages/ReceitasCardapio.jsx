import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Download, ChefHat } from "lucide-react";
import CabecalhoRelatorio from "@/components/relatorios/CabecalhoRelatorio";
import { carregarDadosReceitasCardapio, montarReceitasCardapio } from "@/lib/receitasCardapioCalc";
import { gerarReceitasCardapioPDF } from "@/lib/receitasCardapioPDF";

// Tela de pré-visualização do caderno de produção "Receitas do Cardápio" —
// mesmo padrão de tela-primeiro dos demais relatórios. Uma receita por bloco,
// espelhando a quebra de página do PDF (uma receita por página).
export default function ReceitasCardapio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incluirMedidaCaseira, setIncluirMedidaCaseira] = useState(false);

  const { data: cardapio } = useQuery({
    queryKey: ["cardapio", id],
    queryFn: () => base44.entities.Cardapio.filter({ id }),
    select: (d) => d[0],
  });

  const { data: dados } = useQuery({
    queryKey: ["receitas-cardapio-dados", id],
    queryFn: () => carregarDadosReceitasCardapio(id),
    enabled: !!cardapio,
  });

  const relatorio = useMemo(() => {
    if (!cardapio || !dados) return null;
    return montarReceitasCardapio(cardapio, dados, { incluirMedidaCaseira });
  }, [cardapio, dados, incluirMedidaCaseira]);

  if (!cardapio || !relatorio) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const handleExportar = () => gerarReceitasCardapioPDF(cardapio, relatorio);

  return (
    <div className="space-y-4 pb-24 md:pb-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 no-print flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/cardapio/${id}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1">Receitas do Cardápio</h1>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <Checkbox checked={incluirMedidaCaseira} onCheckedChange={(v) => setIncluirMedidaCaseira(!!v)} />
          Incluir medidas caseiras
        </label>
        <Button onClick={handleExportar}>
          <Download className="w-4 h-4 mr-1" /> Exportar PDF
        </Button>
      </div>

      <CabecalhoRelatorio
        titulo="Receitas do Cardápio"
        nome={cardapio.nome}
        data={relatorio.dataEvento}
        numPessoas={relatorio.numPessoas}
      />

      {/* Sumário */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide mb-3">Sumário</h3>
        <div className="space-y-1.5">
          {relatorio.sumario.map((s, i) => (
            <div key={i} className="flex justify-between text-sm border-b border-border/40 pb-1.5">
              <span>{s.nome}</span>
              <span className="text-muted-foreground">{s.pagina}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Uma receita por bloco (espelha a quebra de página do PDF) */}
      {relatorio.receitas.map((r) => (
        <div key={r.id} className="bg-white border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary shrink-0" />
              {r.nome}
            </h2>
            {r.indisponivel ? (
              <p className="text-sm text-muted-foreground mt-1">{r.categoria} · receita indisponível</p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                {r.categoria} · {r.porcoesLabel} · PC {r.pcFmt} · total {r.totalKgFmt}
              </p>
            )}
          </div>

          {!r.indisponivel && (
            <>
              <div>
                <div className="flex font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b-2 border-border pb-1.5 mb-1 px-1">
                  <span className="flex-1">Ingrediente</span>
                  <span className="flex-1">Pré-preparo</span>
                  <span className="w-24 text-right">Quantidade</span>
                  {incluirMedidaCaseira && <span className="w-32 text-right">Medida caseira</span>}
                </div>
                {r.linhas.map((linha) => {
                  if (linha.tipo === "grupo") {
                    return (
                      <p key={linha.id} className="font-display text-sm font-bold text-primary uppercase tracking-wide mt-3 mb-1 px-1">
                        {linha.titulo}
                      </p>
                    );
                  }
                  if (linha.tipo === "subreceita") {
                    return (
                      <div key={linha.id} className="flex items-center py-1.5 px-1 bg-amber-50 border-b border-border/50">
                        <span className="flex-1 text-sm font-semibold text-primary">▸ {linha.nome}</span>
                        <span className="flex-1 text-xs italic text-muted-foreground">{linha.nota}</span>
                        <span className="w-24 text-right text-sm font-medium">{linha.qtdFmt}</span>
                        {incluirMedidaCaseira && <span className="w-32" />}
                      </div>
                    );
                  }
                  return (
                    <div key={linha.id} className="flex items-center py-1.5 px-1 border-b border-border/50">
                      <span className="flex-1 text-sm">{linha.nome}</span>
                      <span className="flex-1 text-xs italic text-muted-foreground">{linha.prePreparo}</span>
                      <span className="w-24 text-right text-sm font-medium">{linha.qtdFmt}</span>
                      {incluirMedidaCaseira && (
                        <span className="w-32 text-right text-xs text-muted-foreground">{linha.medidaTexto || "—"}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wide mb-2">Modo de preparo</h3>
                <ol className="space-y-1.5 list-none">
                  {r.passos.map((passo, i) => (
                    <li key={i} className="text-sm">
                      {/^\d+[.\-)]\s/.test(passo) ? passo : `${i + 1}. ${passo}`}
                    </li>
                  ))}
                </ol>
              </div>

              <p className="text-xs text-muted-foreground italic pt-2 border-t border-border/50">{r.rendimentoLinha}</p>
            </>
          )}
        </div>
      ))}

      <p className="text-[11px] text-muted-foreground text-center pt-2">
        Laboratório de Cozinha · {cardapio.nome}
      </p>
    </div>
  );
}