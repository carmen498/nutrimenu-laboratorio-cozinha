import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { montarFichaCardapio } from "@/lib/fichaCardapioCalc";
import { gerarFichaCardapioPDF } from "@/lib/fichaCardapioPDF";
import { abrirUrlHttpsSegura } from "@/lib/securityHardening";

// Tela de pré-visualização da Ficha da Refeição (produção) — mesmo padrão visual
// da tela "Exportar Receita" / "Ficha Técnica". Conteúdo idêntico ao PDF exportado
// (ambos usam montarFichaCardapio como fonte única de dados).
export default function FichaCardapio() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  const { data: cardapioTags = [] } = useQuery({
    queryKey: ["cardapio-tags", id],
    queryFn: () => base44.entities.CardapioTag.filter({ cardapio_id: id }, "created_date", 200),
  });

  const num = cardapio ? Number(cardapio.num_unidades) || 1 : 1;

  const ficha = useMemo(() => {
    if (!cardapio) return null;
    return montarFichaCardapio({
      cardapio,
      num,
      receitasView: receitas,
      insumos,
      tagNomes: cardapioTags.map((ct) => ct.tag_nome).filter(Boolean),
    });
  }, [cardapio, num, receitas, insumos, cardapioTags]);

  if (!cardapio || !ficha) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const handleExportar = () => {
    gerarFichaCardapioPDF({
      cardapio,
      num,
      receitasView: receitas,
      insumos,
      tagNomes: cardapioTags.map((ct) => ct.tag_nome).filter(Boolean),
    });
  };

  const handleShare = () => {
    let text = `📋 Ficha da Refeição — ${cardapio.nome}\n${ficha.numPessoas} pessoas\n\n`;
    ficha.linhas.forEach((l) => { text += `• ${l.nome} — ${l.kgFmt}\n`; });
    text += `\nTotal de comida: ${ficha.totalKgFmt} (≈ ${ficha.gPorPessoaFmt} por pessoa)\n`;
    if (ficha.insumos.length > 0) {
      text += `\nInsumos e Embalagens:\n`;
      ficha.insumos.forEach((i) => { text += `• ${i.nome} (${i.qtdLabel})\n`; });
    }
    if (ficha.observacoes) text += `\nObservações: ${ficha.observacoes}\n`;

    if (navigator.share) {
      navigator.share({ text });
    } else {
      abrirUrlHttpsSegura(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/cardapio/${id}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1">Ficha da Refeição</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportar}>
            <Download className="w-4 h-4 mr-1" /> Exportar PDF
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1" /> Compartilhar
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        {/* Cabeçalho timbrado */}
        <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm">Laboratório de Cozinha · Gastronomia Planejada · por Carmen Reinstein</p>
          <p className="font-display text-sm text-right">FICHA DO CARDÁPIO · emitida em {ficha.dataEmissao}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Identificação */}
          <div>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h2 className="font-display text-2xl font-bold">{ficha.nome}</h2>
              <p className="font-display text-xl font-bold text-primary shrink-0">{ficha.numPessoas} pessoas</p>
            </div>
            {ficha.linhaDiscreta && (
              <p className="text-sm text-muted-foreground mt-1">{ficha.linhaDiscreta}</p>
            )}
          </div>

          {/* Tabela de produção */}
          <div>
            <div className="flex font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b-2 border-border pb-1.5 mb-1 px-1">
              <span className="w-6"></span>
              <span className="flex-1">Receita</span>
              <span className="w-20 text-right">PC (g/p)</span>
              <span className="w-20 text-right">Porções</span>
              <span className="w-24 text-right">Quantidade</span>
            </div>
            {ficha.linhas.map((linha) => (
              <div key={linha.id} className="flex items-center py-1.5 border-b border-border/50 px-1">
                <span className="w-6">
                  <span className="inline-block w-3.5 h-3.5 border border-foreground/60 rounded-sm" />
                </span>
                <span className="flex-1 text-sm">{linha.nome}</span>
                <span className="w-20 text-right text-sm">{linha.pcGFmt}</span>
                <span className="w-20 text-right text-sm">{linha.porcoes}</span>
                <span className="w-24 text-right text-sm font-medium">{linha.kgFmt}</span>
              </div>
            ))}
            <div className="flex justify-end mt-3">
              <div className="text-right">
                <p className="font-semibold">Total de comida {ficha.totalKgFmt}</p>
                <p className="text-xs text-muted-foreground">≈ {ficha.gPorPessoaFmt} de comida por pessoa</p>
              </div>
            </div>
          </div>

          {/* Insumos e Embalagens */}
          {ficha.insumos.length > 0 && (
            <div>
              <h3 className="font-display text-base font-bold mb-2">Insumos e Embalagens</h3>
              <div className="space-y-1">
                {ficha.insumos.map((ins) => (
                  <div key={ins.id} className="flex items-center gap-2 text-sm">
                    <span className="inline-block w-3.5 h-3.5 border border-foreground/60 rounded-sm shrink-0" />
                    <span>{ins.nome} ({ins.qtdLabel})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <h3 className="font-display text-base font-bold mb-2">Observações</h3>
            {ficha.observacoes && (
              <p className="text-sm leading-relaxed whitespace-pre-line mb-3">{ficha.observacoes}</p>
            )}
            <div className="space-y-5">
              <div className="border-b border-border/60" />
              <div className="border-b border-border/60" />
            </div>
          </div>

          {/* Rodapé */}
          <p className="text-[11px] text-muted-foreground text-center pt-4 border-t border-border">
            Laboratório de Cozinha · Gastronomia Planejada · ficha de produção — sem valores comerciais
          </p>
        </div>
      </div>
    </div>
  );
}