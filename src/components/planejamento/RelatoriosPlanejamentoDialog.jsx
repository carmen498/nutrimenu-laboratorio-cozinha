import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, List, ClipboardList, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  carregarDadosRelatorios,
  gerarRelatorioProducao,
  gerarRelatorioReceitas,
  gerarRelatorioPrePreparos,
  gerarRelatorioFichaCustos,
} from "@/lib/relatoriosPlanejamentoPDF";

const RELATORIOS = [
  {
    id: "producao",
    titulo: "Produção",
    descricao: "Nº de porções, quantidades em kg e nomes das receitas, agrupados por seção.",
    icone: ClipboardList,
    cor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "receitas",
    titulo: "Receitas do Evento",
    descricao: "Lista simples dos nomes das receitas, agrupadas por seção, na ordem do evento.",
    icone: List,
    cor: "bg-green-50 text-green-700 border-green-200",
  },
  {
    id: "pre-preparos",
    titulo: "Pré-preparos",
    descricao: "Sub-receitas e ingredientes com pré-preparo, consolidados entre todas as receitas.",
    icone: FileText,
    cor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "ficha-custos",
    titulo: "Ficha de Custos",
    descricao: "Custo por receita e percentual do total, com subtotais por seção e custo por pessoa.",
    icone: DollarSign,
    cor: "bg-purple-50 text-purple-700 border-purple-200",
  },
];

export default function RelatoriosPlanejamentoDialog({ open, onClose, planejamento }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(null);

  useEffect(() => {
    if (!open || !planejamento) return;

    // Check if cardapio_config exists
    if (!planejamento.cardapio_config) {
      setDados(null);
      return;
    }

    setLoading(true);
    setDados(null);
    carregarDadosRelatorios(planejamento)
      .then(d => setDados(d))
      .catch(() => toast.error("Erro ao carregar dados do evento"))
      .finally(() => setLoading(false));
  }, [open, planejamento]);

  const handleGerar = async (relatorioId) => {
    if (!dados) return;
    setGerando(relatorioId);
    try {
      switch (relatorioId) {
        case "producao":
          gerarRelatorioProducao(planejamento, dados);
          break;
        case "receitas":
          gerarRelatorioReceitas(planejamento, dados);
          break;
        case "pre-preparos":
          gerarRelatorioPrePreparos(planejamento, dados);
          break;
        case "ficha-custos":
          gerarRelatorioFichaCustos(planejamento, dados);
          break;
      }
      toast.success("PDF gerado com sucesso!");
    } catch (e) {
      toast.error("Erro ao gerar PDF: " + (e.message || ""));
    } finally {
      setGerando(null);
    }
  };

  const temCardapio = !!planejamento?.cardapio_config;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Relatórios do Evento</DialogTitle>
        </DialogHeader>

        {!temCardapio ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum cardápio salvo neste evento.
            <br />
            Gere o cardápio na Etapa 3 antes de emitir relatórios.
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando dados do evento...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {RELATORIOS.map(r => {
              const Icon = r.icone;
              return (
                <button
                  key={r.id}
                  onClick={() => handleGerar(r.id)}
                  disabled={gerando !== null}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all hover:shadow-sm disabled:opacity-50 ${r.cor}`}
                >
                  <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{r.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.descricao}</p>
                  </div>
                  {gerando === r.id && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}