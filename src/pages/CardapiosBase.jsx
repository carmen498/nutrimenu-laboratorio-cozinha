import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, FileText, Loader2, MoreHorizontal, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { criarCardapioPeriodo, listarCardapiosPeriodo } from "@/lib/cardapioPeriodo";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const IDENTIFICACOES = [
  { value: "refeicao", label: "Refeição" },
  { value: "almoco", label: "Almoço" },
  { value: "jantar", label: "Jantar" },
];

function dataInicialPadrao() {
  const hoje = new Date();
  const dia = hoje.getDay();
  const ajuste = dia === 1 ? 0 : (8 - dia) % 7;
  hoje.setDate(hoje.getDate() + ajuste);
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const data = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${data}`;
}

function formatarData(data) {
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function CardapiosBase() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    data_inicio: dataInicialPadrao(),
    identificacao_refeicao: "refeicao",
  });

  const { data: cardapios = [], isLoading, error } = useQuery({
    queryKey: ["cardapios-periodo"],
    queryFn: () => listarCardapiosPeriodo(),
  });

  const criar = useMutation({
    mutationFn: criarCardapioPeriodo,
    onSuccess: async (cardapio) => {
      await queryClient.invalidateQueries({ queryKey: ["cardapios-periodo"] });
      toast.success("Cardápio semanal criado.");
      navigate(`/cardapios/${cardapio.id}`);
    },
    onError: (erro) => toast.error(erro?.message || "Não foi possível criar o cardápio."),
  });

  function enviar(evento) {
    evento.preventDefault();
    criar.mutate(form);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-foreground">Cardápios</h1>
            <span className="inline-flex min-w-7 h-7 items-center justify-center rounded-full bg-primary/10 px-2 text-sm font-bold text-primary">
              {cardapios.length}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Planeje uma semana inteira, de segunda a domingo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCriando((valor) => !valor)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Novo Cardápio
        </button>
      </header>

      {criando && (
        <form onSubmit={enviar} className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold">Nova semana</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Informe a segunda-feira inicial. Os sete dias serão criados automaticamente.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Nome <span className="text-muted-foreground font-normal">(opcional)</span></span>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Semana da família"
                className="w-full h-10 rounded-md border border-input bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Início da semana</span>
              <input
                required
                type="date"
                value={form.data_inicio}
                onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Identificação</span>
              <select
                value={form.identificacao_refeicao}
                onChange={(e) => setForm({ ...form, identificacao_refeicao: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
              >
                {IDENTIFICACOES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCriando(false)} className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted">
              Cancelar
            </button>
            <button
              disabled={criar.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {criar.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Criar semana
            </button>
          </div>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Semanas planejadas</h2>
        {isLoading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Carregando cardápios...</div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">Não foi possível carregar seus cardápios.</div>
        ) : cardapios.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <CalendarDays className="w-9 h-9 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">Nenhum cardápio semanal ainda</p>
            <p className="text-sm text-muted-foreground mt-1">Crie a primeira semana para começar seu planejamento.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {cardapios.map((cardapio) => (
              <div
                key={cardapio.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/cardapios/${cardapio.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") navigate(`/cardapios/${cardapio.id}`);
                }}
                className="w-full rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 hover:shadow-sm transition flex items-center gap-4 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{cardapio.nome}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatarData(cardapio.data_inicio)} a {formatarData(cardapio.data_fim)}
                  </p>
                </div>
                <span className="hidden sm:inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                  {cardapio.identificacao_refeicao === "almoco" ? "Almoço" : cardapio.identificacao_refeicao === "jantar" ? "Jantar" : "Refeição"}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Ações do cardápio ${cardapio.nome}`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FileText className="w-4 h-4 mr-2" /> Relatórios
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => navigate(`/cardapios/${cardapio.id}/imprimir?tipo=diario&data=${cardapio.data_inicio}`)}>
                          Cardápio diário
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/cardapios/${cardapio.id}/imprimir?tipo=semanal`)}>
                          Cardápio semanal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/cardapios/${cardapio.id}/imprimir?tipo=mensal&mes=${cardapio.data_inicio.slice(0, 7)}`)}>
                          Cardápio mensal
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
