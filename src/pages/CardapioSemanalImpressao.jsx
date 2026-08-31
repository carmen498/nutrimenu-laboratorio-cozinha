import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Printer } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { listarItensCardapioPeriodo, obterCardapioPeriodo } from "@/lib/cardapioPeriodo";
import { printarElementoIsolado } from "@/lib/printIsolado";

const NOMES_DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const TIPOS = {
  refeicao: "Refeição",
  receita: "Receita",
  ingrediente: "Ingrediente",
};
const CLASSIFICACOES = {
  entrada: "Entrada",
  salada: "Salada",
  refeicao_completa: "Refeição completa",
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

function formatarData(data, formatoLongo = false) {
  return new Date(`${data}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: formatoLongo ? "long" : "2-digit",
    ...(formatoLongo ? { year: "numeric" } : {}),
  });
}

function ordenarItens(lista) {
  return [...lista].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
}

function identificacaoFaixa(valor) {
  if (valor === "almoco") return "Almoço";
  if (valor === "jantar") return "Jantar";
  return "Refeição";
}

export default function CardapioSemanalImpressao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: cardapio, isLoading, error } = useQuery({
    queryKey: ["cardapio-periodo", id],
    queryFn: () => obterCardapioPeriodo(id),
    enabled: Boolean(id),
  });
  const { data: itens = [], isLoading: carregandoItens, error: erroItens } = useQuery({
    queryKey: ["cardapio-periodo-itens", id],
    queryFn: () => listarItensCardapioPeriodo(id),
    enabled: Boolean(id),
  });

  if (isLoading || carregandoItens) {
    return <div className="flex justify-center py-20 text-sm text-muted-foreground">Preparando visualização...</div>;
  }
  if (error || erroItens || !cardapio) {
    return <div className="max-w-3xl mx-auto rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">Não foi possível preparar o Cardápio para impressão.</div>;
  }

  const dias = Array.from({ length: 7 }, (_, indice) => {
    const data = adicionarDias(cardapio.data_inicio, indice);
    return {
      data,
      nome: NOMES_DIAS[indice],
      itens: ordenarItens(itens.filter((item) => item.data === data)),
    };
  });
  const totalItens = itens.length;
  const emissao = new Date().toLocaleDateString("pt-BR");
  const faixa = identificacaoFaixa(cardapio.identificacao_refeicao);

  function imprimir() {
    printarElementoIsolado(
      "cardapio-semanal-print-area",
      `@page { size: A4 landscape; margin: 9mm; }
       html, body { background: white !important; color: #17251d !important; }
       #cardapio-semanal-print-area { width: 100% !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
       .cardapio-print-grid { display: grid !important; grid-template-columns: repeat(7, minmax(0, 1fr)) !important; gap: 5px !important; }
       .cardapio-print-dia { break-inside: avoid; min-width: 0 !important; }
       .cardapio-print-item { break-inside: avoid; }
       .cardapio-print-cabecalho { padding: 12px 16px !important; }
       .cardapio-print-conteudo { padding: 14px !important; }
       .cardapio-print-dia-topo { padding: 7px !important; }
       .cardapio-print-dia-corpo { padding: 6px !important; min-height: 115mm !important; }
       .cardapio-print-item { padding: 6px !important; margin-bottom: 5px !important; }
       .cardapio-print-item-nome { font-size: 9px !important; line-height: 1.25 !important; }
       .cardapio-print-meta { font-size: 7px !important; line-height: 1.25 !important; }
       .cardapio-print-dia-nome { font-size: 10px !important; }
       .cardapio-print-dia-data { font-size: 8px !important; }
       .cardapio-print-vazio { font-size: 8px !important; }
       .cardapio-print-rodape { font-size: 7px !important; }`
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="no-print flex flex-col sm:flex-row sm:items-center gap-3">
        <button type="button" onClick={() => navigate(`/cardapios/${id}`)} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Cardápio
        </button>
        <div className="flex-1" />
        <button type="button" onClick={imprimir} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Printer className="w-4 h-4" /> Imprimir ou salvar em PDF
        </button>
      </div>

      <div className="no-print rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Pré-visualização em formato A4 horizontal. O comando de impressão também permite salvar o relatório como PDF.
      </div>

      <div className="overflow-x-auto pb-2">
        <article id="cardapio-semanal-print-area" className="min-w-[1050px] bg-white text-slate-900 border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="cardapio-print-cabecalho bg-primary text-primary-foreground px-6 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-80">Laboratório de Cozinha · Cardápio semanal</p>
              <h1 className="font-display text-2xl font-bold mt-0.5">{cardapio.nome}</h1>
              <p className="text-xs mt-0.5 opacity-85">
                {formatarData(cardapio.data_inicio, true)} a {formatarData(cardapio.data_fim, true)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold">{faixa}</p>
              <p className="text-[10px] opacity-80">{totalItens} {totalItens === 1 ? "item planejado" : "itens planejados"}</p>
            </div>
          </div>

          <div className="cardapio-print-conteudo p-5 space-y-4">
            {cardapio.observacoes && (
              <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Observações gerais</h2>
                <p className="text-xs mt-1 whitespace-pre-wrap">{cardapio.observacoes}</p>
              </section>
            )}

            <div className="cardapio-print-grid grid grid-cols-7 gap-2">
              {dias.map((dia) => (
                <section key={dia.data} className="cardapio-print-dia rounded-lg border border-slate-200 overflow-hidden min-w-0">
                  <div className="cardapio-print-dia-topo bg-[#e7efe9] border-b border-slate-200 px-2.5 py-2 text-center">
                    <h2 className="cardapio-print-dia-nome text-xs font-bold text-[#2c513e]">{dia.nome}</h2>
                    <p className="cardapio-print-dia-data text-[10px] text-slate-500">{formatarData(dia.data)}</p>
                  </div>
                  <div className="cardapio-print-dia-corpo p-2 min-h-[360px]">
                    <p className="cardapio-print-meta text-[9px] uppercase tracking-wide font-bold text-[#2c513e] mb-2">{faixa}</p>
                    {dia.itens.length ? (
                      <div>
                        {dia.itens.map((item) => (
                          <div key={item.id} className="cardapio-print-item rounded-md border border-slate-200 p-2 mb-2 last:mb-0">
                            <p className="cardapio-print-item-nome text-[11px] leading-snug font-semibold break-words">{item.nome_cache}</p>
                            <p className="cardapio-print-meta text-[9px] leading-snug text-slate-500 mt-1">
                              {item.classificacao ? (CLASSIFICACOES[item.classificacao] || item.classificacao) : TIPOS[item.tipo_origem]}
                            </p>
                            {item.classificacao && (
                              <p className="cardapio-print-meta text-[8px] leading-snug text-slate-400 mt-0.5">{TIPOS[item.tipo_origem]}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="cardapio-print-vazio text-[10px] text-slate-400 italic text-center mt-8">Sem itens planejados</p>
                    )}
                  </div>
                </section>
              ))}
            </div>

            <footer className="cardapio-print-rodape pt-3 border-t border-slate-200 flex justify-between gap-4 text-[9px] text-slate-500">
              <span>Laboratório de Cozinha · Gastronomia Planejada</span>
              <span>Emitido em {emissao}</span>
            </footer>
          </div>
        </article>
      </div>
    </div>
  );
}
