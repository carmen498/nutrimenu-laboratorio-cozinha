import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import CabecalhoRelatorio from "@/components/relatorios/CabecalhoRelatorio";
import { carregarDadosPrePreparosCardapio, montarPrePreparosCardapio } from "@/lib/prePreparosCalcCardapio";
import { gerarPrePreparosPDF } from "@/lib/prePreparosPDF";
import { abrirUrlHttpsSegura } from "@/lib/securityHardening";

// Tela de pré-visualização do Relatório de Pré-preparos (mise en place) do
// Cardápio avulso — mesmo padrão visual da versão do Evento (PrePreparosPlanejamento.jsx),
// porém lendo diretamente de CardapioReceita (via prePreparosCalcCardapio.js).
export default function PrePreparosCardapio() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: cardapio } = useQuery({
    queryKey: ["cardapio", id],
    queryFn: () => base44.entities.Cardapio.filter({ id }),
    select: (d) => d[0],
  });

  const { data: dados } = useQuery({
    queryKey: ["pre-preparos-cardapio-dados", id],
    queryFn: () => carregarDadosPrePreparosCardapio(id),
    enabled: !!cardapio,
  });

  const relatorio = useMemo(() => {
    if (!cardapio || !dados) return null;
    return montarPrePreparosCardapio(cardapio, dados);
  }, [cardapio, dados]);

  if (!cardapio || !relatorio) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const handleExportar = () => gerarPrePreparosPDF(cardapio, relatorio);

  const handleShare = () => {
    let text = `🔪 Pré-preparos — ${cardapio.nome}\n${relatorio.numReceitas} receitas\n\n`;
    if (relatorio.subReceitas.length > 0) {
      text += "SUB-RECEITAS (preparar antes):\n";
      relatorio.subReceitas.forEach((s) => { text += `• ${s.nome} — ${s.totalFmt}\n`; });
      text += "\n";
    }
    if (relatorio.ingredientes.length > 0) {
      text += "INGREDIENTES COM PRÉ-PREPARO:\n";
      relatorio.ingredientes.forEach((i) => {
        text += `• ${i.nome} (${i.prePreparo}) — ${i.totalFmt}${i.brutoTexto ? " " + i.brutoTexto : ""}\n`;
      });
    }
    if (navigator.share) navigator.share({ text });
    else abrirUrlHttpsSegura(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const isBuffet = cardapio.tipo === "buffet";
  const dataStr = cardapio.data ? cardapio.data.split("-").reverse().join("/") : null;

  return (
    <div className="space-y-4 pb-24 md:pb-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/cardapio/${id}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1">Pré-preparos</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportar}>
            <Download className="w-4 h-4 mr-1" /> Exportar PDF
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1" /> Compartilhar
          </Button>
        </div>
      </div>

      <CabecalhoRelatorio
        titulo="Pré-preparos"
        nome={cardapio.nome}
        data={dataStr}
        tipoLabel={cardapio.tipo}
        numPessoas={isBuffet ? null : relatorio.totalPessoas}
      />

      <div className="bg-white border rounded-xl p-6 space-y-6">
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>{relatorio.numReceitas} receita{relatorio.numReceitas !== 1 ? "s" : ""} · quantidades já escaladas para o cardápio</p>
          <p className="italic">{relatorio.diagnosticoTexto}</p>
        </div>

        {relatorio.vazio ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum pré-preparo encontrado nas receitas deste cardápio.</p>
        ) : (
          <>
            {relatorio.subReceitas.length > 0 && (
              <div>
                <h3 className="font-display text-base font-bold mb-2">Sub-receitas (preparar antes)</h3>
                <div className="space-y-2">
                  {relatorio.subReceitas.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-2 py-1.5 border-b border-border/50">
                      <span className="inline-block w-3.5 h-3.5 border border-foreground/60 rounded-sm shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <span className="text-sm font-medium">{s.nome}</span>
                          <span className="text-sm font-semibold shrink-0">{s.totalFmt}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.usadoEmTexto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {relatorio.ingredientes.length > 0 && (
              <div>
                <h3 className="font-display text-base font-bold mb-2">Ingredientes com pré-preparo</h3>
                <div className="flex font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b-2 border-border pb-1.5 mb-1 px-1">
                  <span className="w-6"></span>
                  <span className="flex-[2]">Ingrediente</span>
                  <span className="flex-1">Receita</span>
                  <span className="w-24 text-right">Qtd. Total</span>
                </div>
                {relatorio.ingredientes.map((i, idx) => (
                  <div key={idx} className="flex items-start py-1.5 border-b border-border/50 px-1 gap-1">
                    <span className="w-6 pt-0.5">
                      <span className="inline-block w-3.5 h-3.5 border border-foreground/60 rounded-sm" />
                    </span>
                    <div className="flex-[2] min-w-0">
                      <p className="text-sm">{i.nome}</p>
                      <p className="text-xs italic text-muted-foreground">{i.prePreparo}</p>
                    </div>
                    <div className="flex-1 min-w-0 text-xs text-muted-foreground">
                      <p>{i.receitaLabel}</p>
                      {i.usadoEmTexto && <p className="mt-0.5">{i.usadoEmTexto}</p>}
                    </div>
                    <div className="w-24 text-right">
                      <p className="text-sm font-medium">{i.totalFmt}</p>
                      {i.brutoTexto && <p className="text-[10px] text-muted-foreground">{i.brutoTexto}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <p className="text-[11px] text-muted-foreground text-center pt-4 border-t border-border">
          Quantidades em peso líquido escalado · bruto indicado quando há fator de correção
        </p>
      </div>
    </div>
  );
}