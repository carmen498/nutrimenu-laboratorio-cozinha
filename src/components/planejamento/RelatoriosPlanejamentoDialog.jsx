import { useState, useEffect } from "react";
import { toast } from "sonner";
import RelatoriosDialog from "@/components/relatorios/RelatoriosDialog";
import {
  carregarDadosRelatorios,
  gerarRelatorioProducao,
  gerarRelatorioReceitas,
  gerarRelatorioPrePreparos,
  gerarRelatorioFichaCustos,
} from "@/lib/relatoriosPlanejamentoPDF";

export default function RelatoriosPlanejamentoDialog({ open, onClose, planejamento }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !planejamento) return;

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

  const temCardapio = !!planejamento?.cardapio_config;
  const totalPessoas = planejamento
    ? (planejamento.total_pessoas ||
        (planejamento.qtd_homens || 0) + (planejamento.qtd_mulheres || 0) + (planejamento.qtd_criancas || 0))
    : null;

  // Mapeamento dos relatórios já implementados para o Evento — "Orçamento" ainda
  // não existe (fica "em breve"), os outros 4 reutilizam os geradores existentes.
  const handlers = dados ? {
    ficha_cardapio: () => gerarRelatorioProducao(planejamento, dados),
    pre_preparos: () => gerarRelatorioPrePreparos(planejamento, dados),
    ficha_custos: () => gerarRelatorioFichaCustos(planejamento, dados),
    receitas_cardapio: () => gerarRelatorioReceitas(planejamento, dados),
  } : {};

  return (
    <RelatoriosDialog
      open={open}
      onClose={onClose}
      titulo="Relatórios do Evento"
      cabecalho={planejamento ? {
        nome: planejamento.nome,
        data: planejamento.created_date ? new Date(planejamento.created_date).toLocaleDateString("pt-BR") : null,
        tipoLabel: [planejamento.tipo_planejamento, planejamento.tipo_servico].filter(Boolean).join(" · "),
        numPessoas: totalPessoas || null,
      } : null}
      handlers={handlers}
      loading={loading}
      emptyMessage={!temCardapio ? "Nenhum cardápio salvo neste evento. Gere o cardápio na Etapa 3 antes de emitir relatórios." : null}
    />
  );
}