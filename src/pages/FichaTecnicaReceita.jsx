import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import { formatarModoPreparo } from "@/lib/formatarModoPreparo";
import { converterGramasParaMedida } from "@/lib/conversorMedidas";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { montarFichaTecnica } from "@/lib/fichaTecnicaCalc";
import { montarTextoCompartilhamentoFicha } from "@/lib/fichaTecnicaShare";
import { getCorHex, getCorLabelCompleto } from "@/lib/coresReceita";
import TabelaFichaTecnica from "@/components/fichaTecnica/TabelaFichaTecnica";
import TagBadge from "@/components/tags/TagBadge";

export default function FichaTecnicaReceita() {
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

  const { data: receitaTags = [] } = useQuery({
    queryKey: ["receita-tags", id],
    queryFn: () => base44.entities.ReceitaTag.filter({ receita_id: id }, "created_date", 200),
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => base44.entities.Tag.list("nome", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: medidasCaseiras = [] } = useQuery({
    queryKey: ["medidas-caseiras"],
    queryFn: () => base44.entities.MedidaCaseira.list("-created_date", 500),
    staleTime: 60 * 1000,
  });

  const { data: utensiliosPadrao = [] } = useQuery({
    queryKey: ["utensilios-padrao"],
    queryFn: () => base44.entities.UtensilioPadrao.list("simbolo", 200),
    staleTime: 60 * 1000,
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

  const uteMap = useMemo(() => {
    const map = {};
    utensiliosPadrao.forEach((u) => { map[u.id] = u; });
    return map;
  }, [utensiliosPadrao]);

  const medidaByIngrediente = useMemo(() => {
    const map = {};
    medidasCaseiras.forEach((mc) => {
      if (mc.alimento && !map[mc.alimento]) map[mc.alimento] = mc;
    });
    return map;
  }, [medidasCaseiras]);

  const ficha = useMemo(() => {
    if (!receita) return null;
    return montarFichaTecnica({ receita, itens, ingMap, receitasBasicasMap, insumosReceita, esquecidos });
  }, [receita, itens, ingMap, receitasBasicasMap, insumosReceita, esquecidos]);

  const medidaDisplayMap = useMemo(() => {
    const map = {};
    if (!ficha) return map;
    ficha.itensFichaAgrupada.forEach((item) => {
      if (item.ing && !item.isSubreceita) {
        const mc = medidaByIngrediente[item.ing.id];
        if (mc) {
          const ute = uteMap[mc.utensilio];
          const result = converterGramasParaMedida(item.qtdNova, mc, ute);
          if (result?.texto) map[item.id] = result.texto;
        }
      }
    });
    return map;
  }, [ficha, medidaByIngrediente, uteMap]);

  if (!receita || !ficha) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const passos = formatarModoPreparo(receita.modo_preparo);
  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  const formatCurrency = (v) => `R$ ${(v || 0).toFixed(2).replace(".", ",")}`;
  const formatKg = (g) => `${((g || 0) / 1000).toFixed(2).replace(".", ",")} kg`;

  const handleShare = () => {
    const text = montarTextoCompartilhamentoFicha({ receita, ficha, passos });
    if (navigator.share) {
      navigator.share({ text });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center gap-2 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/receita/${id}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1">Ficha Técnica</h1>
        <div className="flex gap-2">
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> ↓ Exportar PDF
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1" /> Compartilhar
          </Button>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 16mm 12mm; }
        }
      `}</style>

      <div className="bg-white border rounded-xl overflow-hidden print:border-0 print:rounded-none">
        {/* Cabeçalho timbrado */}
        <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm">Laboratório de Cozinha · Receitas que se Multiplicam · por Carmen Reinstein</p>
          <p className="font-display text-sm text-right">FICHA TÉCNICA · emitida em {dataEmissao}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Identificação */}
          <div>
            <div className="flex items-center gap-2">
              {receita.cor_predominante && (
                <span
                  className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                  style={{ backgroundColor: getCorHex(receita.cor_predominante) }}
                  title={getCorLabelCompleto(receita.cor_predominante)}
                />
              )}
              <h2 className="font-display text-2xl font-bold">{receita.nome}</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1.5 text-sm text-muted-foreground">
              {(receita.categorias || []).length > 0 && <span>{receita.categorias.join(", ")}</span>}
              {receitaTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {receitaTags.map((rt) => {
                    const tag = allTags.find((t) => t.id === rt.tag_id);
                    if (!tag) return null;
                    return <TagBadge key={rt.id} nome={tag.nome} cor={tag.cor} grupo={tag.grupo} />;
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Indicadores */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-border bg-muted/30 text-center">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">PC Recomendado</p>
              <p className="text-lg font-bold mt-1">{ficha.pcRecomendado} g/porção</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/30 text-center">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Rendimento PDP</p>
              <p className="text-lg font-bold mt-1">{formatKg(ficha.rendimentoTotal)}</p>
              <p className="text-xs text-muted-foreground">{ficha.nPorcoes} porções</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/30 text-center">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Custo Total</p>
              <p className="text-lg font-bold mt-1">{formatCurrency(ficha.custoTotal)}</p>
            </div>
            <div className="p-3 rounded-lg border-2 border-primary bg-primary/10 text-center">
              <p className="text-[10px] uppercase text-primary tracking-wide font-semibold">Custo por Porção</p>
              <p className="text-lg font-bold mt-1 text-primary">{formatCurrency(ficha.custoPorPorcao)}</p>
            </div>
          </div>

          {/* Tabela de ingredientes */}
          <div>
            <h3 className="font-display text-base font-bold mb-2">Ingredientes</h3>
            <TabelaFichaTecnica
              itens={ficha.itensFichaAgrupada}
              unidadeBase={receita.unidade_base}
              medidaDisplayMap={medidaDisplayMap}
            />
            <p className="text-xs text-muted-foreground mt-2">
              bruto {formatKg(ficha.pesoBruto)} · rendimento (PDP) {formatKg(ficha.rendimentoTotal)}
              {ficha.perda && (
                <> · {ficha.perda.tipo === "ganho" ? "ganho" : "perda"} {ficha.perda.pct.toFixed(1).replace(".", ",")}%</>
              )}
            </p>
          </div>

          {/* Modo de preparo */}
          {(passos.length > 0 || ficha.temSubreceitas) && (
            <div style={{ breakInside: "avoid" }}>
              <h3 className="font-display text-base font-bold mb-2">Modo de Preparo</h3>
              {ficha.temSubreceitas ? (
                <div className="space-y-3">
                  {ficha.blocosCompostos.map((bloco, idx) => (
                    <div key={idx} className={idx > 0 ? "pt-2 border-t border-border/50" : ""}>
                      <p className="font-semibold text-sm mb-1">
                        {bloco.tipo === "subreceita" ? `Modo de preparo — ${bloco.nome}` : "Montagem"}
                      </p>
                      {bloco.passos.length === 0 ? (
                        <p className="text-sm italic text-muted-foreground pl-5">(sem modo de preparo cadastrado)</p>
                      ) : bloco.passos.length === 1 ? (
                        <p className="text-sm leading-relaxed whitespace-pre-line pl-5">{bloco.passos[0].replace(/^\d+[\.\-\)]\s*/, "")}</p>
                      ) : (
                        <ol className="space-y-1 list-decimal list-inside pl-5">
                          {bloco.passos.map((passo, pi) => (
                            <li key={pi} className="text-sm leading-relaxed">{passo.replace(/^\d+[\.\-\)]\s*/, "")}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ))}
                </div>
              ) : passos.length === 1 ? (
                <p className="text-sm leading-relaxed whitespace-pre-line">{passos[0].replace(/^\d+[\.\-\)]\s*/, "")}</p>
              ) : (
                <ol className="space-y-1.5 list-decimal list-inside">
                  {passos.map((passo, idx) => (
                    <li key={idx} className="text-sm leading-relaxed pl-1">{passo.replace(/^\d+[\.\-\)]\s*/, "")}</li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Descritivo (menu) */}
          {receita.descritivo_menu && (
            <div style={{ breakInside: "avoid" }}>
              <h3 className="font-display text-base font-bold mb-2">Descritivo (Menu)</h3>
              <p className="text-sm leading-relaxed italic whitespace-pre-line">{receita.descritivo_menu}</p>
            </div>
          )}

          {/* Insumos e Embalagens */}
          {insumosReceita.length > 0 && ficha.custoInsumos > 0 && (
            <div style={{ breakInside: "avoid" }}>
              <h3 className="font-display text-base font-bold mb-2">Insumos e Embalagens</h3>
              <table className="w-full text-sm">
                <tbody>
                  {insumosReceita.map((item) => (
                    <tr key={item.id} className="border-b border-border/40">
                      <td className="py-1">{item.insumo_nome}</td>
                      <td className="py-1 text-right">{formatCurrency(item.custo_total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="py-1.5">Custo total de produção</td>
                    <td className="py-1.5 text-right text-primary">{formatCurrency(ficha.custoInsumos)}</td>
                  </tr>
                </tfoot>
              </table>
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