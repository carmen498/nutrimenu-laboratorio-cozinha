import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, FileText, Share2, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { formatarModoPreparo, passosParaTexto } from "@/lib/formatarModoPreparo";

export default function ExportarReceita() {
  const { id } = useParams();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const porcoes = parseInt(params.get("porcoes")) || null;
  const qtdG = parseInt(params.get("qtd")) || null;
  const [ocultarCustos, setOcultarCustos] = useState(false);
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

  const { data: ingredientesDB = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
  });

  const ingMap = useMemo(() => {
    const map = {};
    ingredientesDB.forEach((i) => { map[i.id] = i; });
    return map;
  }, [ingredientesDB]);

  if (!receita) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const porcoesExport = porcoes || receita.porcoes_base || 1;
  const qtdExport = qtdG || receita.rendimento_total || 0;
  const fator = receita.rendimento_total > 0 && qtdG ? qtdG / receita.rendimento_total : (receita.porcoes_base > 0 ? porcoesExport / receita.porcoes_base : 1);
  const formatKgDisplay = (g) => g >= 1000 ? `${(g / 1000).toFixed(1).replace(".", ",")} kg` : `${g} g`;
  const passos = formatarModoPreparo(receita.modo_preparo);
  
  const formatCurrency = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const formatWeight = (g, u) => {
    if (u === "ml") return g >= 1000 ? `${(g / 1000).toFixed(2)} lt` : `${g.toFixed(0)} ml`;
    return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g.toFixed(0)} g`;
  };

  const itensFicha = itens
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    .map((item) => {
      const ing = ingMap[item.ingrediente_id];
      const qtd = item.quantidade_por_porcao * porcoesExport;
      const fc = ing?.fator_correcao || 1;
      const custo = qtd * fc * (ing?.preco_por_g_rs || 0);
      return { ...item, ing, qtd, custo };
    });

  const custoTotal = itensFicha.reduce((s, i) => s + i.custo, 0);
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
    if (passos.length > 0) {
      text += `\nMODO DE PREPARO:\n`;
      text += passosParaTexto(passos);
      text += `\n`;
    }
    if (!ocultarCustos) {
      text += `\n💰 Custo por porção: ${formatCurrency(custoPorcao)}`;
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

      <div className="flex items-center gap-3">
        <Switch checked={ocultarCustos} onCheckedChange={setOcultarCustos} />
        <span className="text-sm">Ocultar custos na exportação</span>
      </div>

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
            {!ocultarCustos && <span className="flex-[2] text-right">Custo</span>}
          </div>
          {itensFicha.map((item) => {
            if (item.tipo === "grupo") {
              return (
                <div key={item.id} className="font-bold text-xs uppercase tracking-wide bg-muted/50 py-1.5 px-1 my-1 rounded">
                  {item.titulo_grupo}
                </div>
              );
            }
            return (
              <div key={item.id} className="flex py-1 border-b border-border/50 px-1 items-center">
                <span className="flex-[4]">
                  {item.ingrediente_nome || item.ing?.nome || item.subreceita_nome}
                  {item.pre_preparo && <span className="text-muted-foreground"> ({item.pre_preparo})</span>}
                </span>
                <span className="flex-[2.5] text-muted-foreground">{item.medida_caseira || ""}</span>
                <span className="flex-[1.5]">{formatWeight(item.qtd, receita.unidade_base)}</span>
                {!ocultarCustos && <span className="flex-[2] text-primary font-medium text-right">{formatCurrency(item.custo)}</span>}
              </div>
            );
          })}
        </div>

        {!ocultarCustos && (
          <div className="mt-4 space-y-2">
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

        {passos.length > 0 && (
          <>
            <h3 className="font-semibold mt-6 mb-2">Modo de Preparo</h3>
            <ol className="space-y-1.5 list-decimal list-inside">
              {passos.map((passo, idx) => (
                <li key={idx} className="text-sm leading-relaxed pl-1">{passo.replace(/^\d+[\.\-\)]\s*/, "")}</li>
              ))}
            </ol>
          </>
        )}

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Gerado por Receita na Medida · {new Date().toLocaleDateString("pt-BR")}
        </p>
      </Card>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={handlePrint}>
          <FileText className="w-4 h-4 mr-1" /> ↓ Exportar PDF — Preparo e Custos
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-1" /> Compartilhar
        </Button>
      </div>
    </div>
  );
}