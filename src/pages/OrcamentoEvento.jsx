import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, MessageCircle } from "lucide-react";
import { carregarDadosRelatorios } from "@/lib/relatoriosPlanejamentoPDF";
import { montarOrcamentoEvento } from "@/lib/orcamentoEventoCalc";
import { gerarOrcamentoEventoPDF } from "@/lib/orcamentoEventoPDF";
import { abrirUrlHttpsSegura } from "@/lib/securityHardening";

// Tela de pré-visualização do Orçamento do Evento (documento comercial do
// cliente). Regra de segurança: nenhum dado interno (custo, PC, kg, margem,
// quantidades de bebidas) é lido ou exibido aqui — só nomes, descritivos e o
// preço por pessoa digitado pelo usuário.
export default function OrcamentoEvento() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [planejamento, setPlanejamento] = useState(null);
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [obsComercial, setObsComercial] = useState("");
  const [precoFinal, setPrecoFinal] = useState("");
  const [validadeDias, setValidadeDias] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    const p = await base44.entities.Planejamento.get(id);
    setPlanejamento(p);
    setObsComercial(p.observacoes_orcamento || "");
    const totalPessoas = Number(p.total_pessoas) || (Number(p.qtd_homens) || 0) + (Number(p.qtd_mulheres) || 0) + (Number(p.qtd_criancas) || 0);
    const totalLegado = p.preco_pessoa_orcamento != null ? Number(p.preco_pessoa_orcamento) * totalPessoas : null;
    setPrecoFinal(p.preco_final_orcamento != null ? Number(p.preco_final_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : totalLegado != null ? totalLegado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
    const d = await carregarDadosRelatorios(p);
    setDados(d);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const precoFinalNum = Number(String(precoFinal).replace(",", ".")) || 0;

  const orc = useMemo(() => {
    if (!planejamento || !dados) return null;
    return montarOrcamentoEvento({ planejamento, dados, precoFinal: precoFinalNum, validadeDias });
  }, [planejamento, dados, precoFinalNum, validadeDias]);

  const saveObs = async (value) => {
    setObsComercial(value);
    await base44.entities.Planejamento.update(planejamento.id, { observacoes_orcamento: value });
  };

  const savePrecoFinal = async (value) => {
    const num = Math.max(0, Number(String(value).replace(",", ".")) || 0);
    await base44.entities.Planejamento.update(planejamento.id, { preco_final_orcamento: num });
    setPlanejamento((atual) => ({ ...atual, preco_final_orcamento: num }));
  };

  if (loading || !planejamento || !orc) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const handleExportar = () => {
    gerarOrcamentoEventoPDF({
      planejamento: { ...planejamento, observacoes_orcamento: obsComercial },
      dados,
      precoPorPessoa: orc.precoPorPessoa,
      validadeDias,
    });
  };

  const handleWhatsApp = () => {
    let text = `📋 Orçamento — ${orc.nome}\n`;
    text += `${orc.numPessoas} pessoas\n\n`;
    text += `Preço por pessoa: ${orc.precoPorPessoaFmt}\n`;
    text += `Total: ${orc.totalFmt}\n\n`;
    text += `Válido por ${validadeDias} dias · condições de pagamento a combinar.\n`;
    text += `(PDF anexo)`;
    abrirUrlHttpsSegura(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1">Orçamento</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportar}>
            <Download className="w-4 h-4 mr-1" /> Exportar PDF
          </Button>
          <Button variant="outline" onClick={handleWhatsApp}>
            <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        {/* Cabeçalho unificado */}
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
          {/* Identificação — só o total de pessoas, sem per capitas */}
          <div>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h2 className="font-display text-2xl font-bold">{orc.nome}</h2>
              <p className="font-display text-xl font-bold text-primary shrink-0">{orc.numPessoas} pessoas</p>
            </div>
            {orc.tipoLabel && (
              <p className="text-sm text-muted-foreground mt-1">{orc.tipoLabel}</p>
            )}
          </div>

          {/* Menu — só nome e descritivo, sem dado técnico */}
          <div>
            <h3 className="font-display text-base font-bold mb-3">Menu</h3>
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

          {/* Bebidas (e doces) — só os nomes, em linha corrida */}
          {orc.temBebidas && (
            <div>
              <h3 className="font-display text-base font-bold mb-2">Bebidas</h3>
              <p className="text-sm">{orc.bebidasLinha}</p>
            </div>
          )}

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
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display text-lg font-bold text-primary">Preço final R$</p>
              <Input
                type="text"
                inputMode="decimal"
                className="w-32 h-9 bg-white no-print"
                placeholder="0,00"
                value={precoFinal}
                onChange={(e) => setPrecoFinal(e.target.value)}
                onBlur={(e) => savePrecoFinal(e.target.value)}
              />
              <Button type="button" size="sm" className="no-print" onClick={() => savePrecoFinal(precoFinal)}>
                Salvar preço
              </Button>
              <p className="font-display text-lg font-bold text-primary hidden print:block">{orc.totalFmt}</p>
            </div>
            <p className="font-display text-base font-semibold text-primary">
              Equivale a {orc.precoPorPessoaFmt} por pessoa · {orc.numPessoas} pessoas
            </p>
            <p className="text-xs text-muted-foreground pt-1">
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