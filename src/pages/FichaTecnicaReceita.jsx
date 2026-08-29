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
import { printarElementoIsolado } from "@/lib/printIsolado";
import { getCorHex, getCorLabelCompleto } from "@/lib/coresReceita";
import { formatarStatusRendimento } from "@/lib/rendimentoReceita";
import TabelaFichaTecnica from "@/components/fichaTecnica/TabelaFichaTecnica";
import TagBadge from "@/components/tags/TagBadge";
import { useAuth } from "@/lib/AuthContext";
import { buscarPrecosPersonalizados, aplicarPrecosPersonalizados } from "@/lib/precoIngredienteCliente";
import { abrirUrlHttpsSegura } from "@/lib/securityHardening";
import {
  buscarPreferenciasIngredientes,
  aplicarPreferenciasIngredientes,
} from "@/lib/preferenciaIngredienteUsuario";
import {
  getMedidaIngredienteId,
  getMedidaPesoG,
  getMedidaUtensilioId,
  resolverMedidaCaseiraItem,
} from "@/lib/ingredienteReceitaCalc";

export default function FichaTecnicaReceita() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

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

  const { data: precosPersonalizados = {} } = useQuery({
    queryKey: ["precos-personalizados", user?.id],
    queryFn: () => buscarPrecosPersonalizados(user.id),
    enabled: !isAdmin && !!user?.id,
  });

  const { data: preferenciasIngredientes = {} } = useQuery({
    queryKey: ["preferencias-ingredientes", user?.id],
    queryFn: () => buscarPreferenciasIngredientes(user.id),
    enabled: !!user?.id,
  });

  const ingredientesEfetivos = useMemo(() => {
    const comPrecoLegado = isAdmin
      ? ingredientesDB
      : aplicarPrecosPersonalizados(ingredientesDB, precosPersonalizados);
    return aplicarPreferenciasIngredientes(
      comPrecoLegado,
      preferenciasIngredientes,
      { usarFavoritoLegado: isAdmin }
    );
  }, [ingredientesDB, isAdmin, precosPersonalizados, preferenciasIngredientes]);

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

  const { data: perCapitasUsuario = [] } = useQuery({
    queryKey: ["per-capita-usuario-ficha", user?.id],
    queryFn: () => base44.entities.PerCapitaUsuario.filter({ created_by_id: user.id }, "-updated_date", 500),
    enabled: !!user?.id,
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
    ingredientesEfetivos.forEach((i) => { map[i.id] = i; });
    return map;
  }, [ingredientesEfetivos]);

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

  const medidaById = useMemo(() => {
    const map = {};
    medidasCaseiras.forEach((mc) => {
      if (mc.id) map[mc.id] = mc;
    });
    return map;
  }, [medidasCaseiras]);

  const medidaByIngrediente = useMemo(() => {
    const map = {};
    medidasCaseiras.forEach((mc) => {
      const ingredienteId = getMedidaIngredienteId(mc);
      if (ingredienteId && !map[ingredienteId]) map[ingredienteId] = mc;
    });
    return map;
  }, [medidasCaseiras]);

  const perCapitaUsuario = useMemo(() => {
    const nome = String(receita?.nome || "").trim().toLocaleLowerCase("pt-BR");
    const registro = perCapitasUsuario.find((item) => String(item.prep_nome || "").trim().toLocaleLowerCase("pt-BR") === nome);
    return Number(registro?.per_capita_g) || 0;
  }, [receita?.nome, perCapitasUsuario]);

  const ficha = useMemo(() => {
    if (!receita) return null;
    return montarFichaTecnica({ receita, itens, ingMap, receitasBasicasMap, insumosReceita, esquecidos, perCapitaUsuario });
  }, [receita, itens, ingMap, receitasBasicasMap, insumosReceita, esquecidos, perCapitaUsuario]);

  const medidaDisplayMap = useMemo(() => {
    const map = {};
    if (!ficha) return map;
    ficha.itensFichaAgrupada.forEach((item) => {
      if (item.ing && !item.isSubreceita) {
        const mc = resolverMedidaCaseiraItem(item, item.ing, medidaById, medidaByIngrediente);
        if (mc) {
          const ute = uteMap[getMedidaUtensilioId(mc)];
          const refG = getMedidaPesoG(mc);
          const medidaCompat = mc.referencia_g || !refG ? mc : { ...mc, referencia_g: refG };
          const result = converterGramasParaMedida(item.qtdNova, medidaCompat, ute);
          if (result?.texto) map[item.id] = result.texto;
        }
      }
    });
    return map;
  }, [ficha, medidaById, medidaByIngrediente, uteMap]);

  if (!receita || !ficha) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const passos = formatarModoPreparo(receita.modo_preparo);
  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  const formatCurrency = (v) => v == null ? "—" : `R$ ${(Number(v) || 0).toFixed(2).replace(".", ",")}`;
  const formatPorcoes = (v) => v > 0 ? Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—";
  const formatKg = (g) => `${((g || 0) / 1000).toFixed(2).replace(".", ",")} kg`;
  const formatFator = (v) => v == null ? "—" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

  const handleShare = () => {
    const text = montarTextoCompartilhamentoFicha({ receita, ficha, passos });
    if (navigator.share) {
      navigator.share({ text });
    } else {
      abrirUrlHttpsSegura(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex flex-wrap items-center gap-2 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1 min-w-[12rem]">Ficha Técnica</h1>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button className="min-w-0 px-2 text-xs sm:px-4 sm:text-sm" onClick={() => printarElementoIsolado("ficha-tecnica-print-area", "@page { margin: 16mm 12mm; }")}>
            <Printer className="w-4 h-4 mr-1" /> ↓ Exportar PDF
          </Button>
          <Button className="min-w-0 px-2 text-xs sm:px-4 sm:text-sm" variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1" /> Compartilhar
          </Button>
        </div>
      </div>

      <div id="ficha-tecnica-print-area" className="bg-white border rounded-xl overflow-hidden print:border-0 print:rounded-none">
        <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm">Laboratório de Cozinha · Receitas que se Multiplicam · por Carmen Reinstein</p>
          <p className="font-display text-sm text-right">FICHA TÉCNICA · emitida em {dataEmissao}</p>
        </div>

        <div className="p-6 space-y-6">
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

          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-border bg-muted/30 text-center">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">PC</p>
              <p className="text-lg font-bold mt-1">{ficha.pcStatus === "a_validar" ? "A validar" : `${ficha.pcRecomendado} g/porção`}</p>
              <p className="text-xs text-muted-foreground">{ficha.pcOrigem === "personalizado" ? "personalizado" : ficha.pcOrigem === "sugerido" ? `sugestão: ${ficha.pcSugerido} g` : "cadastrado"}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/30 text-center">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Quantidade total (PDP)</p>
              <p className="text-lg font-bold mt-1">{formatKg(ficha.rendimentoTotal)}</p>
              <p className="text-xs text-muted-foreground">{formatPorcoes(ficha.nPorcoes)} porções</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/30 text-center">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Custo Total</p>
              <p className="text-lg font-bold mt-1">{formatCurrency(ficha.custoTotal)}</p>
              {!ficha.custoCompleto && <p className="text-xs text-amber-700">parcial</p>}
            </div>
            <div className="p-3 rounded-lg border-2 border-primary bg-primary/10 text-center">
              <p className="text-[10px] uppercase text-primary tracking-wide font-semibold">Custo por Porção</p>
              <p className="text-lg font-bold mt-1 text-primary">{formatCurrency(ficha.custoPorPorcao)}</p>
            </div>
          </div>

          {(ficha.pcStatus !== "valido" || !ficha.custoCompleto) && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {ficha.pcStatus === "a_validar" && <p><strong>PC a validar:</strong> o valor legado coincide com o rendimento e não será usado no custo por porção.</p>}
              {ficha.pcStatus === "pendente" && <p><strong>PC pendente:</strong> a sugestão é apenas referência e não será usada no custo por porção.</p>}
              {!ficha.custoCompleto && <p><strong>Custo incompleto:</strong> {ficha.itensSemPreco || "há"} item(ns) sem preço válido. O custo por porção fica suspenso.</p>}
            </div>
          )}

          <div>
            <h3 className="font-display text-base font-bold mb-2">Ingredientes</h3>
            <TabelaFichaTecnica
              itens={ficha.itensFichaAgrupada}
              unidadeBase={receita.unidade_base}
              medidaDisplayMap={medidaDisplayMap}
            />
            <div className="mt-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground" style={{ breakInside: "avoid" }}>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span><strong className="text-foreground">Pré-preparo:</strong> {formatKg(ficha.pesoPrePreparo)}</span>
                <span><strong className="text-foreground">PB compra:</strong> {formatKg(ficha.pesoBruto)}</span>
                <span><strong className="text-foreground">PDP:</strong> {formatKg(ficha.rendimentoTotal)}{ficha.rendimentoEstimado ? " (estimado)" : ""}</span>
                <span><strong className="text-foreground">Fator rendimento:</strong> {formatFator(ficha.fatorRendimento)}</span>
                {ficha.perda && ficha.perda.tipo !== "estavel" && (
                  <span><strong className="text-foreground">{ficha.perda.tipo === "ganho" ? "Ganho" : "Perda"}:</strong> {ficha.perda.pct.toFixed(1).replace(".", ",")}%</span>
                )}
                <span><strong className="text-foreground">Status:</strong> {formatarStatusRendimento(ficha.rendimentoStatus)}</span>
              </div>
              <p className="mt-1 text-[10px]">Fator de rendimento = PDP ÷ peso líquido pré-preparo. O PB com FC é referência de compra/custo e não entra na perda de cocção.</p>
            </div>
          </div>

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

          {receita.descritivo_menu && (
            <div style={{ breakInside: "avoid" }}>
              <h3 className="font-display text-base font-bold mb-2">Descritivo (Menu)</h3>
              <p className="text-sm leading-relaxed italic whitespace-pre-line">{receita.descritivo_menu}</p>
            </div>
          )}

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

          <p className="text-[11px] text-muted-foreground text-center pt-4 border-t border-border">
            Laboratório de Cozinha · Gastronomia Planejada · custos na data de emissão · {dataEmissao}
          </p>
        </div>
      </div>
    </div>
  );
}