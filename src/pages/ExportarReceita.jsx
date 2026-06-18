import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Share2, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { formatarModoPreparo, passosParaTexto } from "@/lib/formatarModoPreparo";

export default function ExportarReceita() {
  const { id } = useParams();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const porcoes = parseInt(params.get("porcoes")) || null;
  const qtdG = parseInt(params.get("qtd")) || null;
  const [aba, setAba] = useState("preparo");
  const printRef = useRef();

  const { data: receita } = useQuery({
    queryKey: ["receita", id],
    queryFn: () => base44.entities.Receita.filter({ id }),
    select: (d) => d[0],
  });

  const { data: itens = [] } = useQuery({
    queryKey: ["itens-receita", id],
    queryFn: () => base44.entities.IngredienteReceita.filter({ receita_id: id }),
  });

  const { data: todasReceitas = [] } = useQuery({
    queryKey: ["todas-receitas"],
    queryFn: () => base44.entities.Receita.list("-nome", 500),
  });

  const { data: insumosReceita = [] } = useQuery({
    queryKey: ["insumos-receita", id],
    queryFn: () => base44.entities.InsumoReceita.filter({ receita_id: id }),
  });

  const { data: esquecidos = [] } = useQuery({
    queryKey: ["esquecidos-receita", id],
    queryFn: () => base44.entities.IngredienteEsquecidoReceita.filter({ receita_id: id }),
  });

  const { data: ingredientesDB = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
  });

  const ingMap = useMemo(() => {
    const map = {};
    ingredientesDB.forEach((i) => { map[i.id] = i; });
    return map;
  }, [ingredientesDB]);

  const recMap = useMemo(() => {
    const map = {};
    todasReceitas.forEach((r) => { map[r.id] = r; });
    return map;
  }, [todasReceitas]);

  if (!receita) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const porcoesExport = porcoes || receita.porcoes_base || 1;
  const qtdExport = qtdG || receita.rendimento_total || 0;
  const fator = receita.rendimento_total > 0 && qtdG ? qtdG / receita.rendimento_total : (receita.porcoes_base > 0 ? porcoesExport / receita.porcoes_base : 1);
  const passos = formatarModoPreparo(receita.modo_preparo);
  
  const formatCurrency = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const formatWeight = (g, u) => {
    if (u === "ml") return g >= 1000 ? `${(g / 1000).toFixed(2)} lt` : `${g.toFixed(0)} ml`;
    return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g.toFixed(0)} g`;
  };

  const itensFicha = itens
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    .map((item) => {
      if (item.tipo === "subreceita") {
        const subRec = recMap[item.subreceita_id];
        const qtd = item.quantidade_por_porcao * porcoesExport;
        const custo = subRec && subRec.rendimento_total > 0
          ? (qtd / subRec.rendimento_total) * (subRec.custo_total || 0)
          : 0;
        return { ...item, qtd, custo, isSubreceita: true, subreceitaNome: item.subreceita_nome || subRec?.nome };
      }
      const ing = ingMap[item.ingrediente_id];
      const qtd = item.quantidade_por_porcao * porcoesExport;
      const fc = ing?.fator_correcao || 1;
      const custo = qtd * fc * (ing?.preco_por_g_rs || 0);
      return { ...item, ing, qtd, custo, isSubreceita: false };
    });

  const custoIngredientes = itensFicha.reduce((s, i) => s + i.custo, 0);
  const custoInsumos = insumosReceita.reduce((s, i) => s + (i.custo_total || 0), 0);
  const custoEsquecidos = esquecidos.reduce((s, i) => s + ((i.custo_total || 0) * fator), 0);
  const custoTotal = custoIngredientes + custoInsumos + custoEsquecidos;
  const custoPorcao = custoTotal / porcoesExport;

  const handlePrint = () => window.print();

  const handleShare = () => {
    let text = `🍽 ${receita.nome}\n`;
    text += `📋 ${porcoesExport} porções\n\n`;
    text += `INGREDIENTES:\n`;
    itensFicha.forEach(item => {
      text += `• ${item.ingrediente_nome || item.ing?.nome} — ${formatWeight(item.qtd, receita.unidade_base)}`;
      if (item.pre_preparo) text += ` (${item.pre_preparo})`;
      text += `\n`;
    });
    if (esquecidos.length > 0) {
      text += `\nINGREDIENTES ESQUECIDOS:\n`;
      esquecidos.forEach(item => {
        text += `• ${item.nome} — ${item.quantidade_g || 0} g`;
        if (aba === "custos") text += ` (${formatCurrency((item.custo_total || 0) * fator)})`;
        text += `\n`;
      });
    }
    if (insumosReceita.length > 0) {
      text += `\nINSUMOS E EMBALAGENS:\n`;
      insumosReceita.forEach(item => {
        text += `• ${item.insumo_nome} — ${item.quantidade} ${item.unidade}`;
        if (aba === "custos") text += ` (${formatCurrency(item.custo_total || 0)})`;
        text += `\n`;
      });
    }
    if (passos.length > 0) {
      text += `\nMODO DE PREPARO:\n`;
      text += passosParaTexto(passos);
      text += `\n`;
    }
    if (aba === "custos") {
      text += `\n💰 Ingredientes: ${formatCurrency(custoIngredientes)}`;
      if (custoInsumos > 0) text += ` · Insumos: ${formatCurrency(custoInsumos)}`;
      if (custoEsquecidos > 0) text += ` · Esquecidos: ${formatCurrency(custoEsquecidos)}`;
      text += `\n💰 Total: ${formatCurrency(custoTotal)} · Por porção: ${formatCurrency(custoPorcao)}`;
    }

    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Receita copiada!");
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/receita/${id}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1">Exportar Receita</h1>
      </div>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="w-full">
          <TabsTrigger value="preparo" className="flex-1">📋 Preparo</TabsTrigger>
          <TabsTrigger value="custos" className="flex-1">💰 Custos</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Preview */}
      <Card className="p-6 print:shadow-none print:border-0" ref={printRef}>
        {receita.foto_url && (
          <img src={receita.foto_url} alt={receita.nome} className="w-full h-48 object-cover rounded-lg mb-4" />
        )}
        <h2 className="font-display text-2xl font-bold">{receita.nome}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {receita.categoria} · Base: {receita.porcoes_base} porções
          {receita.rendimento_total > 0 && ` · ${receita.rendimento_total.toLocaleString("pt-BR")} ${receita.unidade_base}`}
        </p>

        {/* Bloco de escalonamento */}
        <div className="mt-3 p-3 bg-primary/5 rounded-lg text-sm">
          <p className="font-semibold text-primary">Produção escalonada</p>
          <p className="text-muted-foreground mt-0.5">
            Quantidade: <strong>{qtdExport.toLocaleString("pt-BR")} {receita.unidade_base}</strong>
            {qtdExport >= 1000 && ` (${(qtdExport / 1000).toFixed(1).replace(".", ",")} kg)`}
            {" · "}Porções: <strong>{porcoesExport}</strong>
            {fator !== 1 && <span className="ml-1">· Fator: ×{fator.toFixed(2)}</span>}
          </p>
        </div>

        <h3 className="font-semibold mt-6 mb-2">Ingredientes</h3>
        <div className="text-sm">
          {/* Cabeçalho da tabela */}
          <div className="flex font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b-2 border-border pb-1 mb-1 px-1">
            <span className="flex-[4]">Ingrediente</span>
            <span className="flex-[2.5]">Medida caseira</span>
            <span className="flex-[1.5]">Qtd. (g)</span>
            {aba === "custos" && <span className="flex-[2] text-right">Custo</span>}
          </div>
          {itensFicha.map((item) => {
            if (item.tipo === "grupo") {
              return (
                <div key={item.id} className="font-bold text-xs uppercase tracking-wide bg-muted/50 py-1.5 px-1 my-1 rounded">
                  {item.titulo_grupo}
                </div>
              );
            }
            if (item.isSubreceita) {
              return (
                <div key={item.id} className="flex py-1 border-b border-border/50 px-1 items-center">
                  <span className="flex-[4]">
                    <span className="flex items-center gap-1">
                      <ChefHat className="w-3.5 h-3.5 text-primary shrink-0" />
                      {item.subreceitaNome}
                    </span>
                    <span className="text-xs text-muted-foreground italic"> (ver receita separada)</span>
                  </span>
                  <span className="flex-[2.5] text-muted-foreground"></span>
                  <span className="flex-[1.5]">{formatWeight(item.qtd, receita.unidade_base)}</span>
                  {aba === "custos" && <span className="flex-[2] text-primary font-medium text-right">{formatCurrency(item.custo)}</span>}
                </div>
              );
            }
            return (
              <div key={item.id} className="flex py-1 border-b border-border/50 px-1 items-center">
                <span className="flex-[4]">
                  {item.ingrediente_nome || item.ing?.nome || item.subreceita_nome}
                  {item.pre_preparo && <span className="text-muted-foreground"> ({item.pre_preparo})</span>}
                  {item.proporcional === false && <span className="text-muted-foreground ml-1">📌</span>}
                </span>
                <span className="flex-[2.5] text-muted-foreground">{item.medida_caseira || ""}</span>
                <span className="flex-[1.5]">{formatWeight(item.qtd, receita.unidade_base)}</span>
                {aba === "custos" && <span className="flex-[2] text-primary font-medium text-right">{formatCurrency(item.custo)}</span>}
              </div>
            );
          })}
        </div>

        {esquecidos.length > 0 && (
          <>
            <h3 className="font-semibold mt-6 mb-2 text-muted-foreground italic text-sm">Ingredientes Esquecidos</h3>
            <div className="text-sm">
              {esquecidos.map((item) => (
                <div key={item.id} className="flex py-1 border-b border-border/50 px-1 items-center">
                  <span className="flex-[5] text-muted-foreground">{item.nome}</span>
                  <span className="flex-[2] text-center text-muted-foreground">{item.quantidade_g || 0} g</span>
                  {aba === "custos" && <span className="flex-[2] text-primary font-medium text-right">{formatCurrency((item.custo_total || 0) * fator)}</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {insumosReceita.length > 0 && (
          <>
            <h3 className="font-semibold mt-6 mb-2">Insumos e Embalagens</h3>
            <div className="text-sm">
              {insumosReceita.map((item) => (
                <div key={item.id} className="flex py-1 border-b border-border/50 px-1 items-center">
                  <span className="flex-[5]">
                    {item.insumo_nome}
                    <span className="text-muted-foreground ml-1 text-xs">({item.categoria})</span>
                  </span>
                  <span className="flex-[2] text-center">{item.quantidade} {item.unidade}</span>
                  {aba === "custos" && <span className="flex-[2] text-primary font-medium text-right">{formatCurrency(item.custo_total || 0)}</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {aba === "custos" && (
          <div className="mt-4 space-y-2">
            <div className="p-3 bg-primary/5 rounded-lg flex justify-between text-sm">
              <span>Ingredientes</span>
              <span className="font-medium">{formatCurrency(custoIngredientes)}</span>
            </div>
            {custoInsumos > 0 && (
              <div className="p-3 bg-primary/5 rounded-lg flex justify-between text-sm">
                <span>Insumos e embalagens</span>
                <span className="font-medium">{formatCurrency(custoInsumos)}</span>
              </div>
            )}
            {custoEsquecidos > 0 && (
              <div className="p-3 bg-primary/5 rounded-lg flex justify-between text-sm">
                <span className="italic text-muted-foreground">Ingredientes esquecidos</span>
                <span className="font-medium">{formatCurrency(custoEsquecidos)}</span>
              </div>
            )}
            <div className="p-3 bg-primary/5 rounded-lg flex justify-between font-semibold">
              <span>Custo total</span>
              <span className="text-primary">{formatCurrency(custoTotal)}</span>
            </div>
            <div className="p-3 bg-primary/5 rounded-lg flex justify-between font-semibold">
              <span>Custo por porção</span>
              <span className="text-primary">{formatCurrency(custoPorcao)}</span>
            </div>
          </div>
        )}

        {aba === "preparo" && passos.length > 0 && (
          <>
            <h3 className="font-semibold mt-6 mb-2">Modo de Preparo</h3>
            <ol className="space-y-1.5 list-decimal list-inside">
              {passos.map((passo, idx) => (
                <li key={idx} className="text-sm leading-relaxed pl-1">{passo.replace(/^\d+[\.\-\)]\s*/, "")}</li>
              ))}
            </ol>
          </>
        )}

        {itensFicha.some(i => i.proporcional === false) && aba !== "custos" && (
          <p className="text-xs text-muted-foreground mt-3 italic">📌 Ingredientes 'a gosto' — quantidade fixa, não variam com o escalonamento.</p>
        )}
        <p className="text-xs text-muted-foreground mt-6 text-center">
          Gerado por Laboratório de Cozinha · Gastronomia Planejada · {new Date().toLocaleDateString("pt-BR")}
        </p>
      </Card>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={handlePrint}>
          <FileText className="w-4 h-4 mr-1" /> ↓ Exportar PDF
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-1" /> Compartilhar
        </Button>
      </div>
    </div>
  );
}