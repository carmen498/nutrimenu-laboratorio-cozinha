import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Apple, ArrowLeft, BookOpen, CalendarDays, Loader2, Plus, Trash2, Utensils } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AdicionarItemCardapioDialog from "@/components/cardapio/AdicionarItemCardapioDialog";
import {
  criarCardapioPeriodoItem,
  listarItensCardapioPeriodo,
  obterCardapioPeriodo,
  removerItemCardapioPeriodo,
} from "@/lib/cardapioPeriodo";

const NOMES_DIAS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
const ORIGENS = {
  refeicao: { label: "Refeição", icon: Utensils },
  receita: { label: "Receita", icon: BookOpen },
  ingrediente: { label: "Ingrediente", icon: Apple },
};
const CLASSIFICACOES = {
  entrada: "Entrada",
  salada: "Salada",
  prato_principal: "Prato principal",
  segundo_prato: "Segundo prato",
  acompanhamento: "Acompanhamento",
  guarnicao: "Guarnição",
  sobremesa: "Sobremesa",
  bebida: "Bebida",
  outro: "Outro",
};

function adicionarDias(data, quantidade) {
  const valor = new Date(`${data}T00:00:00.000Z`);
  valor.setUTCDate(valor.getUTCDate() + quantidade);
  return valor.toISOString().slice(0, 10);
}

function formatarData(data, completa = false) {
  return new Date(`${data}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: completa ? "long" : "short",
    ...(completa ? { year: "numeric" } : {}),
  });
}

export default function CardapioSemanal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [diaSelecionado, setDiaSelecionado] = useState(null);

  const { data: cardapio, isLoading, error } = useQuery({
    queryKey: ["cardapio-periodo", id],
    queryFn: () => obterCardapioPeriodo(id),
    enabled: Boolean(id),
  });
  const { data: itens = [], isLoading: carregandoItens } = useQuery({
    queryKey: ["cardapio-periodo-itens", id],
    queryFn: () => listarItensCardapioPeriodo(id),
    enabled: Boolean(id),
  });

  const adicionar = useMutation({
    mutationFn: (/** @type {Record<string, any>} */ dados) => criarCardapioPeriodoItem({
      cardapio_periodo_id: id,
      data: diaSelecionado.data,
      ordem: diaSelecionado.itens.length,
      ...dados,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cardapio-periodo-itens", id] });
      toast.success("Item adicionado ao Cardápio.");
      setDiaSelecionado(null);
    },
    onError: (erro) => toast.error(erro?.message || "Não foi possível adicionar o item."),
  });

  const remover = useMutation({
    mutationFn: removerItemCardapioPeriodo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cardapio-periodo-itens", id] });
      toast.success("Item removido do Cardápio.");
    },
    onError: (erro) => toast.error(erro?.message || "Não foi possível remover o item."),
  });

  if (isLoading) return <div className="max-w-6xl mx-auto p-8 text-sm text-muted-foreground">Abrindo cardápio...</div>;
  if (error || !cardapio) return (
    <div className="max-w-3xl mx-auto rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
      Não foi possível abrir este cardápio.
    </div>
  );

  const dias = Array.from({ length: 7 }, (_, indice) => {
    const data = adicionarDias(cardapio.data_inicio, indice);
    return {
      data,
      nome: NOMES_DIAS[indice],
      itens: itens.filter((item) => item.data === data).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)),
    };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <button type="button" onClick={() => navigate("/cardapios")} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Voltar aos Cardápios
      </button>

      <header className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">{cardapio.nome}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {formatarData(cardapio.data_inicio, true)} a {formatarData(cardapio.data_fim, true)}
            </p>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        {dias.map((dia) => (
          <section key={dia.data} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">{dia.nome}</h2>
                <p className="text-xs text-muted-foreground">{formatarData(dia.data)}</p>
              </div>
              <button
                type="button"
                onClick={() => setDiaSelecionado(dia)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
            <div className="p-4 min-h-32">
              {carregandoItens ? (
                <div className="min-h-24 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : dia.itens.length ? (
                <div className="space-y-2">
                  {dia.itens.map((item) => {
                    const origem = ORIGENS[item.tipo_origem] || ORIGENS.receita;
                    const Icon = origem.icon;
                    return (
                      <div key={item.id} className="rounded-lg border border-border px-3 py-2.5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{item.nome_cache}</p>
                          <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                            <span>{origem.label}</span>
                            {item.classificacao && <span>• {CLASSIFICACOES[item.classificacao] || item.classificacao}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={remover.isPending}
                          onClick={() => remover.mutate(item.id)}
                          title="Remover do Cardápio"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="min-h-24 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <p className="text-sm">Nenhum item neste dia.</p>
                  <button type="button" onClick={() => setDiaSelecionado(dia)} className="text-xs mt-1 text-primary hover:underline">
                    Adicionar Refeição, Receita ou Ingrediente
                  </button>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {diaSelecionado && (
        <AdicionarItemCardapioDialog
          open
          diaNome={diaSelecionado.nome}
          dataFormatada={formatarData(diaSelecionado.data, true)}
          itensDoDia={diaSelecionado.itens}
          adicionando={adicionar.isPending}
          onClose={() => setDiaSelecionado(null)}
          onAdicionar={(dados) => adicionar.mutate(dados)}
        />
      )}
    </div>
  );
}
