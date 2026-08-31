import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { listarItensCardapioPeriodo, obterCardapioPeriodo } from "@/lib/cardapioPeriodo";

const NOMES_DIAS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

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
  const { data: cardapio, isLoading, error } = useQuery({
    queryKey: ["cardapio-periodo", id],
    queryFn: () => obterCardapioPeriodo(id),
    enabled: Boolean(id),
  });
  const { data: itens = [] } = useQuery({
    queryKey: ["cardapio-periodo-itens", id],
    queryFn: () => listarItensCardapioPeriodo(id),
    enabled: Boolean(id),
  });

  if (isLoading) return <div className="max-w-6xl mx-auto p-8 text-sm text-muted-foreground">Abrindo cardápio...</div>;
  if (error || !cardapio) return (
    <div className="max-w-3xl mx-auto rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
      Não foi possível abrir este cardápio.
    </div>
  );

  const dias = Array.from({ length: 7 }, (_, indice) => {
    const data = adicionarDias(cardapio.data_inicio, indice);
    return { data, nome: NOMES_DIAS[indice], itens: itens.filter((item) => item.data === data) };
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
            <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{dia.nome}</h2>
                <p className="text-xs text-muted-foreground">{formatarData(dia.data)}</p>
              </div>
              <span className="text-xs text-muted-foreground">{dia.itens.length} {dia.itens.length === 1 ? "item" : "itens"}</span>
            </div>
            <div className="p-4 min-h-28">
              {dia.itens.length ? (
                <div className="space-y-2">
                  {dia.itens.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map((item) => (
                    <div key={item.id} className="rounded-lg border border-border px-3 py-2">
                      <p className="text-sm font-medium">{item.nome_cache}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.tipo_origem}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full min-h-20 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <p className="text-sm">Nenhum item neste dia.</p>
                  <p className="text-xs mt-1">A composição será habilitada na próxima etapa.</p>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 flex items-center gap-3 text-primary">
        <Plus className="w-5 h-5 shrink-0" />
        <p className="text-sm"><strong>Próximo passo:</strong> adicionar Refeições, Receitas e Ingredientes em cada dia.</p>
      </div>
    </div>
  );
}
