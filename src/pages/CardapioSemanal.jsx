import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  Apple, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, CalendarDays,
  Copy, GripVertical, Loader2, Pencil, Plus, Printer, Trash2, Utensils,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AdicionarItemCardapioDialog from "@/components/cardapio/AdicionarItemCardapioDialog";
import GestaoCardapioDialogs from "@/components/cardapio/GestaoCardapioDialogs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  atualizarCardapioPeriodo,
  criarCardapioPeriodoItem,
  duplicarCardapioPeriodo,
  excluirCardapioPeriodo,
  listarItensCardapioPeriodo,
  obterCardapioPeriodo,
  reorganizarItensCardapioPeriodo,
  removerItemCardapioPeriodo,
} from "@/lib/cardapioPeriodo";
import { executarMovimentoCardapio, ordenarItensCardapio } from "@/lib/reordenacaoCardapio";

const NOMES_DIAS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
const ORIGENS = {
  refeicao: { label: "Refeição", icon: Utensils },
  receita: { label: "Receita", icon: BookOpen },
  ingrediente: { label: "Ingrediente", icon: Apple },
};
const CLASSIFICACOES = {
  entrada: "Entradas",
  salada: "Saladas",
  refeicao_completa: "Refeição completa",
  prato_principal: "Pratos principais",
  segundo_prato: "Segundo prato",
  acompanhamento: "Acompanhamentos",
  guarnicao: "Guarnição",
  sobremesa: "Sobremesas",
  bebida: "Bebidas",
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
  const chaveItens = ["cardapio-periodo-itens", id];
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [modoGestao, setModoGestao] = useState(null);

  const { data: cardapio, isLoading, error } = useQuery({
    queryKey: ["cardapio-periodo", id],
    queryFn: () => obterCardapioPeriodo(id),
    enabled: Boolean(id),
  });
  const { data: itens = [], isLoading: carregandoItens } = useQuery({
    queryKey: chaveItens,
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
      await queryClient.invalidateQueries({ queryKey: chaveItens });
      toast.success("Item adicionado ao Cardápio.");
      setDiaSelecionado(null);
    },
    onError: (erro) => toast.error(erro?.message || "Não foi possível adicionar o item."),
  });

  const remover = useMutation({
    mutationFn: removerItemCardapioPeriodo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: chaveItens });
      toast.success("Item removido do Cardápio.");
    },
    onError: (erro) => toast.error(erro?.message || "Não foi possível remover o item."),
  });

  const editarCardapio = useMutation({
    mutationFn: (/** @type {Record<string, any>} */ dados) => atualizarCardapioPeriodo(id, dados),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cardapio-periodo", id] }),
        queryClient.invalidateQueries({ queryKey: ["cardapios-periodo"] }),
      ]);
      setModoGestao(null);
      toast.success("Cardápio atualizado.");
    },
    onError: (erro) => toast.error(erro?.message || "Não foi possível atualizar o Cardápio."),
  });

  const duplicarCardapio = useMutation({
    mutationFn: (/** @type {Record<string, any>} */ dados) => duplicarCardapioPeriodo(id, dados),
    onSuccess: async (novo) => {
      await queryClient.invalidateQueries({ queryKey: ["cardapios-periodo"] });
      setModoGestao(null);
      toast.success("Cardápio semanal duplicado.");
      navigate(`/cardapios/${novo.id}`);
    },
    onError: (erro) => toast.error(erro?.message || "Não foi possível duplicar o Cardápio."),
  });

  const excluirCardapio = useMutation({
    mutationFn: () => excluirCardapioPeriodo(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cardapios-periodo"] });
      toast.success("Cardápio excluído.");
      navigate("/cardapios");
    },
    onError: (erro) => toast.error(erro?.message || "Não foi possível excluir o Cardápio."),
  });

  const reorganizar = useMutation({
    mutationFn: (/** @type {{ movimentacoes: any[], novosItens: any[] }} */ payload) =>
      reorganizarItensCardapioPeriodo(id, payload.movimentacoes),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: chaveItens });
      const anteriores = queryClient.getQueryData(chaveItens);
      queryClient.setQueryData(chaveItens, payload.novosItens);
      return { anteriores };
    },
    onError: (erro, _payload, contexto) => {
      if (contexto?.anteriores) queryClient.setQueryData(chaveItens, contexto.anteriores);
      toast.error(erro?.message || "Não foi possível reorganizar o Cardápio.");
    },
    onSuccess: () => toast.success("Organização atualizada."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaveItens }),
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
      itens: ordenarItensCardapio(itens.filter((item) => item.data === data)),
    };
  });

  function executarMovimento(dataOrigem, indiceOrigem, dataDestino, indiceDestino) {
    if (reorganizar.isPending) return;
    executarMovimentoCardapio({
      itens,
      dataOrigem,
      indiceOrigem,
      dataDestino,
      indiceDestino,
      aplicarPlano: (plano) => reorganizar.mutate(plano),
    });
  }

  function aoTerminarArraste(resultado) {
    const { source, destination } = resultado;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    executarMovimento(source.droppableId, source.index, destination.droppableId, destination.index);
  }

  function moverNaOrdem(dia, indice, deslocamento) {
    const destino = indice + deslocamento;
    if (destino < 0 || destino >= dia.itens.length) return;
    executarMovimento(dia.data, indice, dia.data, destino);
  }

  function moverEntreDias(dia, indice, deslocamento) {
    const indiceDia = dias.findIndex((item) => item.data === dia.data);
    const diaDestino = dias[indiceDia + deslocamento];
    if (!diaDestino) return;
    executarMovimento(dia.data, indice, diaDestino.data, diaDestino.itens.length);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <button type="button" onClick={() => navigate("/cardapios")} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Voltar aos Cardápios
      </button>

      <header className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold">{cardapio.nome}</h1>
            {cardapio.nome_refeicao && (
              <p className="text-sm font-medium text-primary mt-1">{cardapio.nome_refeicao}</p>
            )}
            {cardapio.exibir_datas !== false && (
              <p className="text-sm text-muted-foreground mt-1">
                {formatarData(cardapio.data_inicio, true)} a {formatarData(cardapio.data_fim, true)}
              </p>
            )}
            {cardapio.observacoes && (
              <p className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">{cardapio.observacoes}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <GripVertical className="w-3.5 h-3.5" /> Arraste os itens para reorganizar ou mudar o dia.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto sm:justify-end shrink-0">
            {reorganizar.isPending && <Loader2 className="w-5 h-5 mr-1 animate-spin text-primary self-center" />}
            <button type="button" onClick={() => navigate(`/cardapios/${id}/imprimir`)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
              <Printer className="w-3.5 h-3.5" /> Visualizar e imprimir
            </button>
            <button type="button" onClick={() => setModoGestao("editar")} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
            <button type="button" onClick={() => setModoGestao("duplicar")} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
              <Copy className="w-3.5 h-3.5" /> Duplicar
            </button>
            <button type="button" onClick={() => setModoGestao("excluir")} className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
          </div>
        </div>
      </header>

      <DragDropContext onDragEnd={aoTerminarArraste}>
        <div className="grid lg:grid-cols-2 gap-4">
          {dias.map((dia, indiceDia) => (
            <section key={dia.data} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{dia.nome}</h2>
                  {cardapio.exibir_datas !== false && (
                    <p className="text-xs text-muted-foreground">{formatarData(dia.data)}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDiaSelecionado(dia)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>

              <Droppable droppableId={dia.data}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-4 min-h-36 transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}
                  >
                    {carregandoItens ? (
                      <div className="min-h-24 flex items-center justify-center text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : dia.itens.length ? (
                      <div className="space-y-2">
                        {dia.itens.map((item, indiceItem) => {
                          const origem = ORIGENS[item.tipo_origem] || ORIGENS.receita;
                          const Icon = origem.icon;
                          return (
                            <Draggable
                              key={item.id}
                              draggableId={item.id}
                              index={indiceItem}
                              isDragDisabled={reorganizar.isPending}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  style={dragProvided.draggableProps.style}
                                  className={`rounded-lg border bg-card px-2 py-2.5 flex items-center gap-2 transition-shadow ${
                                    dragSnapshot.isDragging ? "shadow-xl ring-2 ring-primary" : "border-border"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    {...dragProvided.dragHandleProps}
                                    className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary touch-none"
                                    title="Arraste para reorganizar ou mudar de dia"
                                    aria-label={`Mover ${item.nome_cache}`}
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </button>
                                  <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <TooltipProvider delayDuration={250}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <p className="text-sm font-medium truncate cursor-help">{item.nome_cache}</p>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-sm">
                                          <p>{item.nome_cache}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                                      <span>{origem.label}</span>
                                      {item.classificacao && <span>• {CLASSIFICACOES[item.classificacao] || item.classificacao}</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center shrink-0 max-sm:w-full max-sm:justify-end max-sm:border-t max-sm:border-border/60 max-sm:pt-1.5">
                                    <button
                                      type="button"
                                      disabled={indiceDia === 0 || reorganizar.isPending}
                                      onClick={() => moverEntreDias(dia, indiceItem, -1)}
                                      className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted disabled:opacity-25"
                                      title="Mover para o dia anterior"
                                      aria-label="Mover para o dia anterior"
                                    ><ArrowLeft className="w-3.5 h-3.5" /></button>
                                    <button
                                      type="button"
                                      disabled={indiceItem === 0 || reorganizar.isPending}
                                      onClick={() => moverNaOrdem(dia, indiceItem, -1)}
                                      className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted disabled:opacity-25"
                                      title="Mover para cima"
                                      aria-label="Mover para cima"
                                    ><ArrowUp className="w-3.5 h-3.5" /></button>
                                    <button
                                      type="button"
                                      disabled={indiceItem === dia.itens.length - 1 || reorganizar.isPending}
                                      onClick={() => moverNaOrdem(dia, indiceItem, 1)}
                                      className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted disabled:opacity-25"
                                      title="Mover para baixo"
                                      aria-label="Mover para baixo"
                                    ><ArrowDown className="w-3.5 h-3.5" /></button>
                                    <button
                                      type="button"
                                      disabled={indiceDia === dias.length - 1 || reorganizar.isPending}
                                      onClick={() => moverEntreDias(dia, indiceItem, 1)}
                                      className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted disabled:opacity-25"
                                      title="Mover para o próximo dia"
                                      aria-label="Mover para o próximo dia"
                                    ><ArrowRight className="w-3.5 h-3.5" /></button>
                                    <button
                                      type="button"
                                      disabled={remover.isPending || reorganizar.isPending}
                                      onClick={() => remover.mutate(item.id)}
                                      title="Remover do Cardápio"
                                      className="p-1.5 ml-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                    ><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`min-h-24 rounded-lg border border-dashed flex flex-col items-center justify-center text-center ${
                        snapshot.isDraggingOver ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                      }`}>
                        <p className="text-sm">{snapshot.isDraggingOver ? "Solte o item neste dia" : "Nenhum item neste dia."}</p>
                        {!snapshot.isDraggingOver && (
                          <button type="button" onClick={() => setDiaSelecionado(dia)} className="text-xs mt-1 text-primary hover:underline">
                            Adicionar Refeição, Receita ou Ingrediente
                          </button>
                        )}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </section>
          ))}
        </div>
      </DragDropContext>

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

      {modoGestao && (
        <GestaoCardapioDialogs
          key={modoGestao}
          modo={modoGestao}
          cardapio={cardapio}
          pending={editarCardapio.isPending || duplicarCardapio.isPending || excluirCardapio.isPending}
          onClose={() => setModoGestao(null)}
          onEditar={(dados) => editarCardapio.mutate(dados)}
          onDuplicar={(dados) => duplicarCardapio.mutate(dados)}
          onExcluir={() => excluirCardapio.mutate()}
        />
      )}
    </div>
  );
}
