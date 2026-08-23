import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { calcularCustoCardapio } from "@/lib/custoCardapio";
import { carregarContextoCustosReceitas } from "@/lib/custoContexto";
import { useAuth } from "@/lib/AuthContext";
import { montarOrcamento } from "@/lib/orcamentoCalc";
import { gerarOrcamentoPDF } from "@/lib/orcamentoPDF";
import { abrirUrlHttpsSegura } from "@/lib/securityHardening";

// Tela de pré-visualização do Orçamento (documento comercial do cliente).
// Regra de segurança: nenhum dado interno (custo, custo por pessoa, markup, %, kg de
// produção) é lido ou exibido aqui — só o preço de venda final calculado.
export default function OrcamentoCardapio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [cardapio, setCardapio] = useState(null);
  const [receitas, setReceitas] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [receitaMap, setReceitaMap] = useState({});
  const [ingredientesPorReceita, setIngredientesPorReceita] = useState({});
  const [ingredienteMap, setIngredienteMap] = useState({});
  const [insumosPorReceita, setInsumosPorReceita] = useState({});
  const [esquecidosPorReceita, setEsquecidosPorReceita] = useState({});
  const [loading, setLoading] = useState(true);
  const [obsComercial, setObsComercial] = useState("");
  const [validadeDias, setValidadeDias] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    const c = await base44.entities.Cardapio.get(id);
    setCardapio(c);
    setObsComercial(c.observacoes_orcamento || "");

    const [recs, ins, todasRec] = await Promise.all([
      base44.entities.CardapioReceita.filter({ cardapio_id: id }, "ordem", 200),
      base44.entities.CardapioInsumo.filter({ cardapio_id: id }, "created_date", 200),
      fetchAllPages(base44.entities.Receita, "nome"),
    ]);
    setReceitas(recs || []);
    setInsumos(ins || []);
    const rMap = {};
    (todasRec || []).forEach((r) => { rMap[r.id] = r; });
    setReceitaMap(rMap);

    const receitaIds = [...new Set((recs || []).map((r) => r.receita_id).filter(Boolean))];
    const contexto = await carregarContextoCustosReceitas({ receitaIds, userId: user?.id, isAdmin });
    setIngredientesPorReceita(contexto.ingredientesPorReceita);
    setIngredienteMap(contexto.ingredienteMap);
    setInsumosPorReceita(contexto.insumosPorReceita);
    setEsquecidosPorReceita(contexto.esquecidosPorReceita);
    setLoading(false);
  }, [id, user?.id, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const num = cardapio ? Number(cardapio.num_unidades) || 1 : 1;
  const markup = cardapio ? Number(cardapio.markup_percentual) || 0 : 0;

  const calcs = useMemo(() => {
    if (!cardapio) return null;
    return calcularCustoCardapio({
      receitas,
      receitaMap,
      ingredientesPorReceita,
      insumos,
      num,
      markup,
      ingredienteMap,
      insumosPorReceita,
      esquecidosPorReceita,
      contextoCanonicoCarregado: true,
    });
  }, [cardapio, receitas, receitaMap, ingredientesPorReceita, insumos, num, markup, ingredienteMap, insumosPorReceita, esquecidosPorReceita]);

  const orc = useMemo(() => {
    if (!cardapio || !calcs) return null;
    return montarOrcamento({
      cardapio,
      num,
      receitasView: calcs.receitasView,
      receitaMap,
      precoPorUnidade: calcs.precoVenda,
      totalVenda: calcs.precoVenda * num,
      validadeDias,
    });
  }, [cardapio, calcs, num, receitaMap, validadeDias]);

  const saveObs = async (value) => {
    setObsComercial(value);
    await base44.entities.Cardapio.update(cardapio.id, { observacoes_orcamento: value });
  };

  if (loading || !cardapio) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  // Sem markup ativo — pedir para ativar "Quanto cobrar" antes de gerar o Orçamento.
  if (!markup || markup <= 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <p className="text-lg font-display font-semibold">Ative "Quanto cobrar se eu vender?" primeiro</p>
        <p className="text-sm text-muted-foreground">
          O Orçamento usa o preço de venda calculado no cardápio. Ative o markup na tela do cardápio antes de gerar este documento.
        </p>
        <Button onClick={() => navigate(`/cardapio/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao cardápio
        </Button>
      </div>
    );
  }

  const handleExportar = () => {
    gerarOrcamentoPDF({
      cardapio: { ...cardapio, observacoes_orcamento: obsComercial },
      num,
      receitasView: calcs.receitasView,
      receitaMap,
      precoPorUnidade: calcs.precoVenda,
      totalVenda: calcs.precoVenda * num,
      validadeDias,
    });
  };

  const handleShare = () => {
    let text = `📋 Orçamento — ${cardapio.nome}\n`;
    if (orc.dataEvento) text += `${orc.dataEvento}\n`;
    text += `${orc.numPessoas} ${orc.unidadeLabel}\n\n`;
    text += `Preço por pessoa: ${orc.precoPorPessoaFmt}\n`;
    text += `Total: ${orc.totalFmt}\n\n`;
    text += `Válido por ${validadeDias} dias · condições de pagamento a combinar.\n`;
    text += `(PDF anexo)`;
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
        <h1 className="font-display text-xl font-bold flex-1">Orçamento</h1>
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
          <div className="flex items-center gap-2">
            <p className="font-display text-sm text-right">ORÇAMENTO · emitido em {orc.dataEmissao} · válido por</p>
            <Input
              type="number"
              min={1}
              className="w-14 h-7 text-black text-center no-print"
              value={validadeDias}
              onChange={(e) => setValidadeDias(Math.max(1, Number(e.target.value) || 1))}
            />
            <p className="font-display text-sm hidden print:block">{orc.validadeDias}</p>
            <p className="font-display text-sm">dias</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Identificação */}
          <div>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h2 className="font-display text-2xl font-bold">{orc.nome}</h2>
              <p className="font-display text-xl font-bold text-primary shrink-0">{orc.numPessoas} {orc.unidadeLabel}</p>
            </div>
            {orc.dataEvento && (
              <p className="text-sm text-muted-foreground mt-1">{orc.dataEvento}</p>
            )}
          </div>

          {/* Cardápio — só nome e descritivo, sem dado técnico */}
          <div>
            <h3 className="font-display text-base font-bold mb-3">Cardápio</h3>
            <div className="space-y-4">
              {orc.pratos.map((prato) => (
                <div key={prato.id}>
                  <p className="text-sm font-semibold">{prato.nome}</p>
                  {prato.descritivo && (
                    <p className="text-sm italic text-muted-foreground mt-0.5">{prato.descritivo}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Observações comerciais — editável */}
          <div>
            <h3 className="font-display text-base font-bold mb-2">Observações</h3>
            <Textarea
              className="text-sm"
              rows={3}
              placeholder="Observações comerciais para o cliente (ex: forma de entrega, itens inclusos)..."
              value={obsComercial}
              onChange={(e) => setObsComercial(e.target.value)}
              onBlur={(e) => saveObs(e.target.value)}
            />
          </div>

          {/* Bloco de preço em destaque */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="font-display text-lg font-bold text-primary">Preço por pessoa {orc.precoPorPessoaFmt}</p>
            <p className="font-display text-base font-semibold text-primary mt-1">
              Total · {orc.numPessoas} {orc.unidadeLabel} {orc.totalFmt}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Condições de pagamento a combinar · confirmação mediante aprovação deste orçamento.
            </p>
          </div>

          {/* Rodapé */}
          <p className="text-[11px] text-muted-foreground text-center pt-4 border-t border-border">
            Laboratório de Cozinha · Gastronomia Planejada · por Carmen Reinstein
          </p>
        </div>
      </div>
    </div>
  );
}