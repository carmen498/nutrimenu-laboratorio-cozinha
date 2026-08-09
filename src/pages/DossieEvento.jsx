import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import CabecalhoRelatorio from "@/components/relatorios/CabecalhoRelatorio";
import { carregarDadosDossie, montarDossie } from "@/lib/dossieEventoCalc";
import { gerarDossiePDF } from "@/lib/dossieEventoPDF";

function fmtKg(v) { return (v || 0).toFixed(1).replace(".", ",") + " kg"; }
function fmtRs(v) { return "R$ " + (v || 0).toFixed(2).replace(".", ","); }
function fmtPct(v) { return (v || 0).toFixed(1).replace(".", ",") + "%"; }

const ANEXOS = [
  { id: "ficha_cardapio", label: "Ficha do Cardápio", disponivel: true },
  { id: "pre_preparos", label: "Pré-preparos", disponivel: true },
  { id: "receitas_cardapio", label: "Receitas escaladas", disponivel: false },
  { id: "lista_compras", label: "Lista de Compras", disponivel: false },
];

export default function DossieEvento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [anexosSelecionados, setAnexosSelecionados] = useState({});
  const [gerando, setGerando] = useState(false);

  const { data: planejamento } = useQuery({
    queryKey: ["planejamento", id],
    queryFn: () => base44.entities.Planejamento.filter({ id }),
    select: (d) => d[0],
  });

  const { data: dadosCardapio } = useQuery({
    queryKey: ["dossie-dados", id],
    queryFn: () => carregarDadosDossie(planejamento),
    enabled: !!planejamento,
  });

  const dossie = useMemo(() => {
    if (!planejamento || !dadosCardapio) return null;
    return montarDossie(planejamento, dadosCardapio);
  }, [planejamento, dadosCardapio]);

  if (!planejamento || !dossie) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const toggleAnexo = (id) => setAnexosSelecionados((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleExportar = async () => {
    setGerando(true);
    try {
      await gerarDossiePDF(planejamento, dossie, anexosSelecionados, dadosCardapio);
      toast.success("PDF gerado com sucesso!");
    } catch (e) {
      toast.error("Erro ao gerar PDF: " + (e?.message || ""));
    } finally {
      setGerando(false);
    }
  };

  const tipoLabel = [
    planejamento.tipo_planejamento,
    planejamento.tipo_servico,
    planejamento.horario_inicio ? `início ${planejamento.horario_inicio}` : null,
    planejamento.duracao_horas ? `${planejamento.duracao_horas}h de duração` : null,
  ].filter(Boolean).join(" · ");
  const dataEvento = planejamento.created_date ? new Date(planejamento.created_date).toLocaleDateString("pt-BR") : null;

  return (
    <div className="space-y-4 pb-24 md:pb-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1">Dossiê do Evento</h1>
        <Button onClick={handleExportar} disabled={gerando}>
          <Download className="w-4 h-4 mr-1" /> {gerando ? "Gerando..." : "Exportar PDF"}
        </Button>
      </div>

      <CabecalhoRelatorio
        titulo="Dossiê do Evento"
        nome={dossie.cabecalho.nome}
        data={dataEvento}
        tipoLabel={tipoLabel}
        numPessoas={dossie.cabecalho.totalPessoas}
      />

      <div className="bg-white border rounded-xl p-6 space-y-6">
        {/* 2. Clientes e per capitas */}
        {dossie.clientes.length > 0 && (
          <div>
            <h3 className="font-display text-base font-bold mb-2">Clientes e Per Capitas</h3>
            <div className="space-y-1">
              {dossie.clientes.map((c) => (
                <div key={c.label} className="flex justify-between text-sm py-1 border-b border-border/50">
                  <span>{c.label}</span>
                  <span className="tabular-nums">{c.n} × {c.pc}g = <span className="font-semibold">{fmtKg(c.kg)}</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Planejamento de comida */}
        <div>
          <h3 className="font-display text-base font-bold mb-2">Planejamento de Comida</h3>
          <div className="grid grid-cols-3 gap-2 text-sm mb-2">
            <div className="p-2 rounded-lg bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground">Base</p>
              <p className="font-semibold tabular-nums">{fmtKg(dossie.planejamentoComida.baseKg)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground">Margem</p>
              <p className="font-semibold tabular-nums">{fmtPct(dossie.planejamentoComida.margemPct)} ({fmtKg(dossie.planejamentoComida.margemKg)})</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground">Planejado</p>
              <p className="font-semibold tabular-nums">{fmtKg(dossie.planejamentoComida.planejadoKg)}</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${dossie.planejamentoComida.alertaPlanejado ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-muted/30"}`}>
            {dossie.planejamentoComida.alertaPlanejado && <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>No cardápio: <span className="font-semibold">{fmtKg(dossie.planejamentoComida.cardapioKg)}</span>
              {dossie.planejamentoComida.alertaPlanejado && " — diverge do planejado em mais de 5%"}
            </span>
          </div>
        </div>

        {/* 4. Tabela cardápio */}
        <div>
          <h3 className="font-display text-base font-bold mb-2">Cardápio</h3>
          <div className="flex text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b-2 border-border pb-1.5 mb-1">
            <span className="flex-1">Receita</span>
            <span className="w-16 text-right">PC local</span>
            <span className="w-20 text-right">Qtd (kg)</span>
            <span className="w-24 text-right">Custo (R$)</span>
            <span className="w-16 text-right">%</span>
          </div>
          {dossie.itensCardapio.map((item, idx) => {
            const destaque = dossie.maxPct > 0 && item.pct === dossie.maxPct;
            return (
              <div key={idx} className={`flex text-sm py-1.5 border-b border-border/50 ${destaque ? "bg-primary/5 font-semibold text-primary" : ""}`}>
                <span className="flex-1 truncate">{item.nome}</span>
                <span className="w-16 text-right tabular-nums">{item.pcG}g</span>
                <span className="w-20 text-right tabular-nums">{fmtKg(item.qtdKg)}</span>
                <span className="w-24 text-right tabular-nums">{item.semCusto ? "sem custo" : fmtRs(item.custo)}</span>
                <span className="w-16 text-right tabular-nums">{fmtPct(item.pct)}</span>
              </div>
            );
          })}
          <div className="flex justify-between text-sm font-bold pt-2">
            <span>Total comida</span>
            <span className="tabular-nums">{fmtKg(dossie.totalKgComida)} · {fmtRs(dossie.custoTotalComida)}</span>
          </div>
        </div>

        {/* 5. Doces & Bebidas */}
        {dossie.temDoces && (
          <div>
            <h3 className="font-display text-base font-bold mb-2">Doces & Bebidas</h3>
            <div className="flex text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b-2 border-border pb-1.5 mb-1">
              <span className="flex-1">Item</span>
              <span className="w-24 text-right">PC médio</span>
              <span className="w-24 text-right">Qtd total</span>
              <span className="w-28 text-right">R$ total</span>
            </div>
            {dossie.itensDoces.map((item, idx) => (
              <div key={idx} className="flex text-sm py-1.5 border-b border-border/50">
                <span className="flex-1 truncate">{item.nome}</span>
                <span className="w-24 text-right tabular-nums">{item.pcMedio != null ? `${item.pcMedio} ${item.unidade || ""}` : "—"}</span>
                <span className="w-24 text-right tabular-nums">{item.qtd != null ? `${item.qtd} ${item.unidadeQtd}` : "—"}</span>
                <span className="w-28 text-right tabular-nums">{item.semCusto ? "sem custo informado" : fmtRs(item.rs)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold pt-2">
              <span>Total Doces & Bebidas</span>
              <span className="tabular-nums">{fmtRs(dossie.custoTotalDoces)}</span>
            </div>
          </div>
        )}

        {/* 6. Indicadores finais */}
        <div>
          <h3 className="font-display text-base font-bold mb-2">Indicadores</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground">Custo comida</p>
              <p className="font-bold tabular-nums flex items-center justify-center gap-1">
                {fmtRs(dossie.custoTotalComida)}
                {dossie.temPratoSemCusto && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground">Custo Doces & Bebidas</p>
              <p className="font-bold tabular-nums">{fmtRs(dossie.custoTotalDoces)}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground">Custo por pessoa (comida)</p>
              <p className="font-bold tabular-nums flex items-center justify-center gap-1">
                {dossie.totalPessoas > 0 ? fmtRs(dossie.custoPorPessoa) : "—"}
                {dossie.totalPessoas === 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
              </p>
            </div>
          </div>
        </div>

        {/* 7. Anexos */}
        <div className="no-print">
          <h3 className="font-display text-base font-bold mb-2">Anexos (opcional)</h3>
          <div className="space-y-1.5">
            {ANEXOS.map((a) => (
              <label key={a.id} className={`flex items-center gap-2 p-2 rounded-lg border ${a.disponivel ? "border-border" : "border-border/50 opacity-60"}`}>
                <Checkbox
                  checked={!!anexosSelecionados[a.id]}
                  onCheckedChange={() => a.disponivel && toggleAnexo(a.id)}
                  disabled={!a.disponivel}
                />
                <span className="text-sm flex-1">{a.label}</span>
                {!a.disponivel && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">em breve</span>
                )}
              </label>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground text-center pt-4 border-t border-border">
          Uso interno · Laboratório de Cozinha
        </p>
      </div>
    </div>
  );
}